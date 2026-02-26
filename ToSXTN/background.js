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

  // tell page we're starting (to show loader)
  await sendToTab(tab.id, { type: "TERMSHIFT_START", selectionText: info.selectionText });

  const { apiUrl } = await chrome.storage.sync.get({
    apiUrl: "https://termshift.com"
  });
  const token = await getAuthToken();

  try {
    const res = await fetch(`${apiUrl}/v1/analyze-raw`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Authorization": `Bearer ${token}`
      },
      body: info.selectionText.slice(0, 200000)
    });
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
        await chrome.storage.local.set({
          lastAnalysis: { status: 'analyzing', timestamp: Date.now() }
        });

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error('No active tab');

        const [{ result: pageText }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          func: extractMainText
        });

        const token = await getAuthToken();
        if (!token) throw new Error('Not signed in. Please sign in to the extension first.');

        const { apiUrl } = await chrome.storage.sync.get({
          apiUrl: 'https://xwaznzasl4i26acgf4zjkqw2za0wlshv.lambda-url.us-east-1.on.aws'
        });

        const res = await fetch(`${apiUrl}/v1/analyze-raw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Authorization': `Bearer ${token}`
          },
          body: (pageText || '').slice(0, 200000)
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);

        const data = await res.json();
        const scanId = data.scan_id || null;

        await chrome.storage.local.set({
          lastAnalysis: {
            status: 'complete', data, scanId, pageUrl: tab.url, timestamp: Date.now()
          }
        });
        sendResponse({ success: true, data, scanId });
        chrome.runtime.sendMessage({ type: 'POPUP_ANALYSIS_DONE', data, scanId }).catch(() => {});
      } catch (e) {
        await chrome.storage.local.set({
          lastAnalysis: { status: 'error', error: e.message, timestamp: Date.now() }
        });
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

        // 4) Extract page text
        const [{ result: pageText }] = await chrome.scripting.executeScript({
          target: { tabId: target.id, allFrames: false },
          func: extractMainText
        });

        // 5) Call your API
        const { apiUrl } = await chrome.storage.sync.get({
          apiUrl: "https://termshift.com"
        });
        const token = await getAuthToken();

        const res = await fetch(`${apiUrl}/v1/analyze-raw`, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            "Authorization": `Bearer ${token}`
          },
          body: (pageText || "").slice(0, 200000)
        });
        const payload = await res.json();

        // 6) Cleanup + return
        try { await chrome.tabs.remove(target.id); } catch {}
        chrome.tabs.sendMessage(sourceTabId, { type: "TERMSHIFT_RESULT", payload });
      } catch (err) {
        // Always notify the page so the loader stops
        chrome.tabs.sendMessage(sourceTabId, { type: "TERMSHIFT_ERROR", error: String(err) });
      }
    })();

    return true; // keep listener alive
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
  function visible(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden";
  }
  function textLen(el) {
    const role = el.getAttribute && (el.getAttribute("role") || "");
    if (/navigation|banner|contentinfo|complementary/i.test(role)) return 0;
    const t = (el.innerText || "").trim();
    return t.split(/\s+/).length;
  }
  function mainContainer() {
    const main = document.querySelector("main, article, [role='main']");
    if (main && visible(main)) return main;
    let best = null, score = 0;
    for (const el of document.querySelectorAll("div, section, article")) {
      const s = textLen(el);
      if (s > score && visible(el)) { best = el; score = s; }
    }
    return best || document.body;
  }
  function paraNodes(container) {
    const nodes = [...container.querySelectorAll("p, li, .paragraph, .clause, .section")]
      .filter(visible)
      .filter(n => (n.innerText || "").trim().length > 40);
    if (nodes.length) return nodes;
    return [...container.querySelectorAll("div")]
      .filter(n => (n.innerText || "").split(/\s+/).length > 40);
  }

  const cont = mainContainer();
  const paras = paraNodes(cont);
  const text = paras.map(n => (n.innerText || "").trim()).join("\n\n");
  return text || (document.body.innerText || "");
}
