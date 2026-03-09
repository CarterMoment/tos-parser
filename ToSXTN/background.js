// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyzeSelection",
    title: "Analyze selection with Termshift",
    contexts: ["selection"]
  });
});

async function sendToTab(tabId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, async () => {
      if (chrome.runtime.lastError) {
        // try injecting content.js, then resend once
        try {
          await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            files: ["content.js"]
          });
          chrome.tabs.sendMessage(tabId, msg, () => resolve());
        } catch (e) {
          console.warn("Termshift inject failed:", e);
          resolve();
        }
      } else {
        resolve();
      }
    });
  });
}

async function getAuthToken() {
  const FIREBASE_API_KEY = 'AIzaSyAh_kQNqC3W4A8Cn9Hc9mJCBPjE-ywsNCI';
  const local = await chrome.storage.local.get(['idToken', 'refreshToken', 'expiresAt']);
  if (local.idToken) {
    if (Date.now() > (local.expiresAt || 0) - 5 * 60 * 1000) {
      // refresh
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(local.refreshToken)}`
        }
      );
      if (res.ok) {
        const d = await res.json();
        const updated = {
          idToken: d.id_token,
          refreshToken: d.refresh_token,
          expiresAt: Date.now() + parseInt(d.expires_in) * 1000
        };
        await chrome.storage.local.set(updated);
        return updated.idToken;
      }
    } else {
      return local.idToken;
    }
  }
  // fallback: static token from sync storage
  const { apiToken } = await chrome.storage.sync.get({ apiToken: '' });
  return apiToken;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "analyzeSelection" || !info.selectionText || !tab?.id) return;

  // Show loader immediately — don't block on auth/URL lookups
  sendToTab(tab.id, { type: "TERMSHIFT_START", selectionText: info.selectionText });

  // Fetch auth token + API URL in parallel
  const [{ apiUrl }, token] = await Promise.all([
    chrome.storage.sync.get({ apiUrl: 'https://xwaznzasl4i26acgf4zjkqw2za0wlshv.lambda-url.us-east-1.on.aws' }),
    getAuthToken()
  ]);

  const text = info.selectionText.slice(0, 200000);

  try {
    // Fire fast summary concurrently — gives early feedback in the overlay (~2s)
    let fullDone = false;
    fetch(`${apiUrl}/v1/analyze-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text })
    })
      .then(r => r.ok ? r.json() : null)
      .then(summary => { if (summary && !fullDone) sendToTab(tab.id, { type: 'TERMSHIFT_SUMMARY', summary }); })
      .catch(() => {});

    const res = await fetch(`${apiUrl}/v1/analyze-raw`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "Authorization": `Bearer ${token}` },
      body: text
    });
    fullDone = true;
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    await sendToTab(tab.id, { type: "TERMSHIFT_RESULT", payload: data });
  } catch (e) {
    await sendToTab(tab.id, { type: "TERMSHIFT_ERROR", error: String(e) });
  }
});


// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "POPUP_ANALYZE_PAGE") {
    (async () => {
      try {
        // Non-blocking status write + parallel lookups
        chrome.storage.local.set({ lastAnalysis: { status: 'analyzing', timestamp: Date.now() } });

        const [[tab], { apiUrl }] = await Promise.all([
          chrome.tabs.query({ active: true, currentWindow: true }),
          chrome.storage.sync.get({ apiUrl: 'https://xwaznzasl4i26acgf4zjkqw2za0wlshv.lambda-url.us-east-1.on.aws' })
        ]);
        if (!tab?.id) throw new Error('No active tab');

        // Extract page text + get auth token in parallel
        const [[{ result: pageText }], token] = await Promise.all([
          chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: false }, func: extractMainText }),
          getAuthToken()
        ]);
        if (!token) throw new Error('Not signed in. Please sign in to the extension first.');

        const text = (pageText || '').slice(0, 200000);

        // Fire fast summary concurrently — popup shows early feedback in ~2s
        let fullDone = false;
        fetch(`${apiUrl}/v1/analyze-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ text })
        })
          .then(r => r.ok ? r.json() : null)
          .then(summary => {
            if (summary && !fullDone)
              chrome.runtime.sendMessage({ type: 'POPUP_SUMMARY_READY', summary }).catch(() => {});
          })
          .catch(() => {});

        const res = await fetch(`${apiUrl}/v1/analyze-raw`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain', 'Authorization': `Bearer ${token}` },
          body: text
        });
        fullDone = true;
        if (!res.ok) throw new Error(`API error ${res.status}`);

        const data = await res.json();
        const scanId = data.scan_id || null;

        chrome.storage.local.set({
          lastAnalysis: { status: 'complete', data, scanId, pageUrl: tab.url, timestamp: Date.now() }
        });
        sendResponse({ success: true, data, scanId });
        chrome.runtime.sendMessage({ type: 'POPUP_ANALYSIS_DONE', data, scanId }).catch(() => {});
      } catch (e) {
        chrome.storage.local.set({ lastAnalysis: { status: 'error', error: e.message, timestamp: Date.now() } });
        sendResponse({ success: false, error: e.message });
        chrome.runtime.sendMessage({ type: 'POPUP_ANALYSIS_DONE', error: e.message }).catch(() => {});
      }
    })();
    return true; // keep channel open for async sendResponse
  }

  if (msg.type === "TERMSHIFT_ANALYZE_LINK") {
    const sourceTabId = sender.tab?.id;
    if (!sourceTabId) return;

    (async () => {
      try {
        // 1) Ensure we have permission for this origin
        const origin = new URL(msg.url).origin + "/*";
        const has = await chrome.permissions.contains({ origins: [origin] });
        if (!has) {
          const granted = await chrome.permissions.request({ origins: [origin] });
          if (!granted) throw new Error(`Permission denied for ${origin}`);
        }

        // 2) Open target quietly
        const target = await chrome.tabs.create({ url: msg.url, active: false });

        // 3) Wait until ready enough
        await waitForTabReady(target.id);

        // 4) Extract page text + fetch auth/URL in parallel
        const [[{ result: pageText }], { apiUrl }, token] = await Promise.all([
          chrome.scripting.executeScript({ target: { tabId: target.id, allFrames: false }, func: extractMainText }),
          chrome.storage.sync.get({ apiUrl: 'https://xwaznzasl4i26acgf4zjkqw2za0wlshv.lambda-url.us-east-1.on.aws' }),
          getAuthToken()
        ]);

        const text = (pageText || '').slice(0, 200000);

        // 5) Fire fast summary concurrently for early overlay feedback
        let fullDone = false;
        fetch(`${apiUrl}/v1/analyze-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ text })
        })
          .then(r => r.ok ? r.json() : null)
          .then(summary => { if (summary && !fullDone) chrome.tabs.sendMessage(sourceTabId, { type: 'TERMSHIFT_SUMMARY', summary }); })
          .catch(() => {});

        const res = await fetch(`${apiUrl}/v1/analyze-raw`, {
          method: "POST",
          headers: { "Content-Type": "text/plain", "Authorization": `Bearer ${token}` },
          body: text
        });
        fullDone = true;
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const payload = await res.json();

        // 6) Cleanup + return
        try { await chrome.tabs.remove(target.id); } catch {}
        chrome.tabs.sendMessage(sourceTabId, { type: "TERMSHIFT_RESULT", payload });
      } catch (err) {
        // Always notify the page so the loader stops
        chrome.tabs.sendMessage(sourceTabId, { type: "TERMSHIFT_ERROR", error: String(err) });
      }
    })();
    // No return true — results are sent via chrome.tabs.sendMessage, not sendResponse.
    // Returning undefined closes the channel cleanly so content.js sees no error.
  }
});


// helper: wait for tab to be ready enough to run scripts
function waitForTabReady(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = async () => {
      if (Date.now() - start > timeoutMs) return resolve();
      try {
        const [tab] = await chrome.tabs.query({ id: tabId });
        if (!tab) return resolve();
        if (tab.status === "complete") return resolve();
      } catch {}
      setTimeout(check, 150);
    };
    check();
  });
}

// This function is serialized and executed in the target page context.
// Keep it self-contained — no external variables.
function extractMainText() {
  const SKIP_ROLES = /navigation|banner|contentinfo|complementary|search/i;
  const SKIP_TAGS = /^(script|style|noscript|nav|header|footer|aside|iframe|svg)$/i;
  const SKIP_ID_CLS = /\b(nav|navbar|header|footer|sidebar|cookie|advertisement|popup|modal|menu|banner|breadcrumb)\b/i;

  function isBoilerplate(el) {
    const role = el.getAttribute && (el.getAttribute('role') || '');
    if (SKIP_ROLES.test(role)) return true;
    if (SKIP_TAGS.test(el.tagName)) return true;
    const cls = typeof el.className === 'string' ? el.className : '';
    const id = el.id || '';
    return SKIP_ID_CLS.test(cls) || SKIP_ID_CLS.test(id);
  }

  function isVisible(el) {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  // Find the most likely main content container
  for (const sel of ['main', 'article', '[role="main"]', '#main-content', '.main-content', '#content', '.content']) {
    const el = document.querySelector(sel);
    if (el && isVisible(el)) {
      const text = (el.innerText || '').trim();
      if (text.length > 500) return text.slice(0, 200000);
    }
  }

  // Fallback: find largest non-boilerplate block
  let best = null, bestLen = 0;
  for (const el of document.querySelectorAll('div, section, article')) {
    if (!isVisible(el) || isBoilerplate(el)) continue;
    const len = (el.innerText || '').length;
    if (len > bestLen) { best = el; bestLen = len; }
  }

  const source = best || document.body;
  const text = (source.innerText || '').trim();
  return (text.length > 200 ? text : (document.body.innerText || '').trim()).slice(0, 200000);
}
