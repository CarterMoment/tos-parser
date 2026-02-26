
(() => {
  if (window.__TERMSHIFT_INJECTED__) return;
  window.__TERMSHIFT_INJECTED__ = true;




// ---------- config ----------
const PANEL_ID = "termshift-bug-panel";
const STYLE_ID = "termshift-bug-style";
const HIGHLIGHT_CLASS = "termshift-highlight";
const PENDING_CLASS = "termshift-pending";

// capture selection at right-click time so we can highlight it later
let lastContextSelection = null;

// ---------- styles ----------
function injectStylesOnce() {
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  #${PANEL_ID} {
    position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;
    width: 320px; max-height: 60vh; background: #111; color: #fff;
    border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,.35);
    overflow: hidden; font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto;
    display: flex; flex-direction: column; transform: translateY(0); opacity: 0; pointer-events: none;
    transition: opacity .18s ease, transform .18s ease;
  }
  #${PANEL_ID}.open { opacity: 1; pointer-events: auto; }
  #${PANEL_ID} header {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 12px; background:#181818; border-bottom:1px solid #2a2a2a;
  }
  #${PANEL_ID} header .title { font-weight:600; font-size:13px; }
  #${PANEL_ID} header .actions { display:flex; gap:6px; }
  #${PANEL_ID} header button {
    background:#222; color:#ddd; border:1px solid #333; border-radius:8px; padding:4px 8px; cursor:pointer;
  }
  #${PANEL_ID} header button:hover { background:#2b2b2b; }
  #${PANEL_ID} .body { padding:10px 10px 12px; overflow:auto; }
  #${PANEL_ID} .summary { display:flex; gap:8px; margin-bottom:8px; font-size:12px; color:#bbb; }
  #${PANEL_ID} .pill {
    display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:999px; border:1px solid #333; background:#1b1b1b;
  }
  #${PANEL_ID} .list { display:flex; flex-direction:column; gap:8px; }
  #${PANEL_ID} .item {
    padding:8px; border:1px solid #2a2a2a; border-radius:8px; background:#161616;
  }
  #${PANEL_ID} .sev { font-size:11px; font-weight:600; margin-right:6px; }
  #${PANEL_ID} .sev.high { color:#ff6b6b; }
  #${PANEL_ID} .sev.med { color:#ffb84d; }
  #${PANEL_ID} .sev.low { color:#ffd666; }
  #${PANEL_ID} .reason { color:#ddd; }
  #${PANEL_ID} .text { color:#9aa1a6; margin-top:6px; white-space:pre-wrap; }
  #${PANEL_ID} .empty { color:#9aa1a6; text-align:center; padding:12px 8px; }

  /* loader row */
  #${PANEL_ID} .loader {
    display:flex; align-items:center; gap:10px; color:#bbb; padding:10px 8px;
  }
  #${PANEL_ID} .spinner {
    width:16px; height:16px; border:2px solid #333; border-top-color:#fff; border-radius:50%;
    animation: termshift-spin 0.9s linear infinite;
  }
  @keyframes termshift-spin { to { transform: rotate(360deg); } }

  /* in-page highlights */
  mark.${HIGHLIGHT_CLASS}[data-sev="high"] { background: rgba(255,0,0,.18); outline: 1px solid rgba(255,0,0,.35); }
  mark.${HIGHLIGHT_CLASS}[data-sev="med"]  { background: rgba(255,165,0,.18); outline: 1px solid rgba(255,165,0,.35); }
  mark.${HIGHLIGHT_CLASS}[data-sev="low"]  { background: rgba(255,215,0,.18); outline: 1px solid rgba(255,215,0,.35); }
  .${PENDING_CLASS} { outline: 2px dashed rgba(255,255,255,.3); outline-offset: 2px; }
  `;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.documentElement.appendChild(style);
}

// ---------- panel ----------
function ensurePanel() {
  injectStylesOnce();
  let root = document.getElementById(PANEL_ID);
  if (root) return root;
  root = document.createElement("div");
  root.id = PANEL_ID;
  root.innerHTML = `
    <header>
      <div class="title">Termshift Flags</div>
      <div class="actions">
        <button data-action="min">Min</button>
        <button data-action="close">Close</button>
      </div>
    </header>
    <div class="body">
      <div class="loader"><div class="spinner"></div><div>Analyzing selection…</div></div>
    </div>
  `;
  document.documentElement.appendChild(root);

  const body = root.querySelector(".body");
  const onClick = (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.action === "close") {
      root.classList.remove("open");
      setTimeout(() => root.remove(), 180);
    } else if (t.dataset.action === "min") {
      // minimize to a tiny pill
      if (root.style.width !== "120px") {
        root.style.width = "120px"; body.style.display = "none";
      } else {
        root.style.width = "320px"; body.style.display = "block";
      }
    }
  };
  root.addEventListener("click", onClick);
  requestAnimationFrame(() => root.classList.add("open"));
  return root;
}

function setLoading(isLoading, summary) {
  const root = ensurePanel();
  const body = root.querySelector(".body");
  if (isLoading) {
    body.innerHTML = `<div class="loader"><div class="spinner"></div><div>Analyzing selection…</div></div>`;
    return;
  }
  // Not loading: reset body to just the summary pills
  const pills = `
    <div class="summary">
      <span class="pill">Risks: <b>${summary?.risk_count ?? 0}</b></span>
      <span class="pill">Highest: <b>${(summary?.highest_severity ?? "—").toUpperCase()}</b></span>
    </div>
  `;
  body.innerHTML = pills;  // <-- replace instead of prepend/append
}


function renderSpansList(spans) {
  const root = ensurePanel();
  const body = root.querySelector(".body");
  if (!spans.length) {
    body.innerHTML += `<div class="empty">No risky spans detected in this selection.</div>`;
    return;
  }
  const list = document.createElement("div");
  list.className = "list";
  spans.forEach(s => {
    const sev = (s.severity || "LOW").toLowerCase();
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div><span class="sev ${sev}">${sev.toUpperCase()}</span>
      <span class="reason">${escapeHTML(s.label || "Flag")}</span></div>
      ${s.explanation ? `<div class="text">${escapeHTML(s.explanation)}</div>` : ``}
    `;
    list.appendChild(item);
  });
  body.appendChild(list);
}


// ---------- selection capture & highlighting ----------
document.addEventListener("contextmenu", () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { lastContextSelection = null; return; }
  const range = sel.getRangeAt(0).cloneRange();
  // remember selection & visually mark it while pending
  lastContextSelection = { rangeText: sel.toString(), range };
  try {
    const node = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    node && node.classList.add(PENDING_CLASS);
  } catch {}
}, true);

function clearPendingOutline() {
  document.querySelectorAll(`.${PENDING_CLASS}`).forEach(el => el.classList.remove(PENDING_CLASS));
}

function highlightSelection(spansOrSeverity) {
  // If API provides spans: [{start,end,severity?}], they're offsets into the selected text.
  // If not, spansOrSeverity can be a string severity to wrap the whole selection.
  if (!lastContextSelection) return;
  const { rangeText, range } = lastContextSelection;
  if (!range || !rangeText) return;

  // Build map of text nodes intersecting the selection
  const container = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!container) return;

  // Simple case: no spans → wrap entire selection
  if (!Array.isArray(spansOrSeverity)) {
    wrapRange(range, spansOrSeverity || "low");
    return;
  }

  // Span case: we need to split the selection by offsets
  const spans = spansOrSeverity.slice().sort((a,b) => a.start - b.start);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let pos = 0, node;
  // compute start/end within the selected text only
  const selectionStartEnd = getSelectionOffsetsWithin(container, range);

  function intersects(start, end) {
    return spans.filter(s => !(s.end <= start || s.start >= end));
  }

  while ((node = walker.nextNode())) {
    // skip text outside selection
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    const { start: ns, end: ne } = getRangeOffsetsWithin(container, nodeRange);

    const start = Math.max(ns, selectionStartEnd.start);
    const end = Math.min(ne, selectionStartEnd.end);
    if (start >= end) continue;

    const relStart = start - ns;
    const relEnd = end - ns;
    const sliceLen = relEnd - relStart;

    const hits = intersects(start, end).map(h => ({
      s: Math.max(0, h.start - ns),
      e: Math.min(node.nodeValue.length, h.end - ns),
      sev: (h.severity || "low")
    })).sort((a,b) => a.s - b.s);

    if (!hits.length) continue;

    const frag = document.createDocumentFragment();
    const t = node.nodeValue;
    let i = 0;
    for (const h of hits) {
      if (h.s > i) frag.appendChild(document.createTextNode(t.slice(i, h.s)));
      const mark = document.createElement("mark");
      mark.className = HIGHLIGHT_CLASS;
      mark.setAttribute("data-sev", h.sev);
      mark.textContent = t.slice(h.s, h.e);
      frag.appendChild(mark);
      i = h.e;
    }
    if (i < t.length) frag.appendChild(document.createTextNode(t.slice(i)));
    node.parentNode.replaceChild(frag, node);
  }
}

function wrapRange(r, severity) {
  try {
    const mark = document.createElement("mark");
    mark.className = HIGHLIGHT_CLASS;
    mark.setAttribute("data-sev", severity || "low");
    r.surroundContents(mark);
  } catch {
    // fallback: extract+wrap if the selection crosses non-text nodes
    const span = document.createElement("mark");
    span.className = HIGHLIGHT_CLASS;
    span.setAttribute("data-sev", severity || "low");
    span.appendChild(r.extractContents());
    r.insertNode(span);
  }
}

function getSelectionOffsetsWithin(container, selRange) {
  // Returns {start,end} offsets of selection text within container's full text
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(selRange.startContainer, selRange.startOffset);
  const start = preRange.toString().length;
  const selText = selRange.toString();
  return { start, end: start + selText.length };
}

function getRangeOffsetsWithin(container, range) {
  const pre = document.createRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const text = range.toString();
  return { start, end: start + text.length };
}

// ---------- small helpers ----------
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function truncate(s, n) { return s.length > n ? s.slice(0, n-1) + "…" : s; }

// ---------- message handling ----------
function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position: fixed; left: 50%; transform: translateX(-50%); bottom: 24px;
    z-index: 2147483647; padding: 10px 14px; border-radius: 8px;
    background: #111; color: #fff; font: 13px/1.2 system-ui; box-shadow: 0 8px 24px rgba(0,0,0,.2);`;
  document.documentElement.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TERMSHIFT_START") {
    // show loader; keep pending outline around the selection
    setLoading(true);
    return;
  }

  if (msg.type === "TERMSHIFT_RESULT") {
    clearPendingOutline();

    const { summary, spans } = msg.payload || {};
    setLoading(false, summary);        // adds the pills (risk count + highest)

    renderSpansList(spans || []);      // render list items in the panel

    // Highlight the selection:
    // If spans exist, they are offsets within the selected text → highlight precisely.
    if (spans && spans.length) {
      highlightSelection(
        spans.map(s => ({
          start: s.start,
          end: s.end,
          severity: (s.severity || "LOW").toLowerCase()
        }))
      );
    } else {
      // No spans: wrap the whole selection using highest severity from summary
      const sev = (summary?.highest_severity || "LOW").toLowerCase();
      highlightSelection(sev);
    }
    return;
  }

  if (msg.type === "TERMSHIFT_ERROR") {
    clearPendingOutline();
    setLoading(false);
    toast(`Termshift error: ${msg.error}`);
    return;
  }
});

// ==== Policy link detector & CTA (multi-link) ====
const SUGGEST_BTN_ID = "termshift-suggest-btn";
const MENU_ID = "termshift-policy-menu";
let currentCandidates = [];

// Patterns
const LINK_TEXT_PATTERNS = [
  /privacy policy/i,
  /privacy (notice|statement)/i,
  /\bprivacy\b/i,
  /your privacy choices?/i,
  /cookie (notice|policy)/i,
  /consumer health data/i,
  /terms(?: of (?:use|service)| and conditions| & conditions)?/i,
  /terms & conditions/i,
  /payments? terms of use/i,
  /end[-\s]?user (?:license|agreement)/i,
  /\bEULA\b/i,
  /user agreement/i,
  /\blegal\b/i
];
const HREF_HINTS = [/privacy/i, /terms/i, /eula/i, /legal/i, /policy/i, /agreement/i, /cookie/i];

const MIN_POLICY_SCORE = 8;
const MAX_ITEMS = 6;

function scoreLink(a) {
  const txt = (a.textContent || a.ariaLabel || a.title || "").trim();
  const href = a.getAttribute("href") || "";

  let score = 0;
  for (const re of LINK_TEXT_PATTERNS) if (re.test(txt)) score += 10;
  for (const re of HREF_HINTS) if (re.test(href)) score += 3;

  try {
    const url = new URL(href, location.href);
    if (url.host === location.host) score += 2;
    if (/\b(privacy|terms|eula|policy|agreement|cookie)\b/i.test(url.pathname)) score += 5;
  } catch {}
  return { score, txt, href };
}

function isVisibleLink(el) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
}

function collectPolicyLinks() {
  const links = [...document.querySelectorAll("a[href]")].filter(isVisibleLink);
  const items = [];
  for (const a of links) {
    const { score, txt, href } = scoreLink(a);
    if (score >= MIN_POLICY_SCORE) {
      try {
        const url = new URL(href, location.href).href;
        const label = (txt || a.title || a.ariaLabel || "policy").trim() || "policy";
        items.push({ url, label, score });
      } catch {}
    }
  }
  // de-dupe by URL
  const seen = new Set();
  const deduped = [];
  for (const it of items.sort((a,b) => b.score - a.score)) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    deduped.push(it);
  }
  return deduped.slice(0, MAX_ITEMS);
}

function ensureSuggestButton() {
  let btn = document.getElementById(SUGGEST_BTN_ID);
  if (btn) return btn;
  btn = document.createElement("button");
  btn.id = SUGGEST_BTN_ID;
  btn.textContent = "Use Termshift to analyze policies";
  btn.style.cssText = `
    position: fixed; right: 18px; bottom: 86px; z-index: 2147483647;
    padding: 8px 12px; border-radius: 999px; border:1px solid #2a2a2a;
    background:#181818; color:#fff; font: 12px/1 system-ui; cursor:pointer;
    box-shadow: 0 12px 30px rgba(0,0,0,.25); display:none;
  `;
  btn.onclick = (e) => {
    e.stopPropagation();
    if (!currentCandidates.length) return;
    togglePolicyMenu(true);
  };
  document.documentElement.appendChild(btn);

  // close menu when clicking elsewhere
  document.addEventListener("click", (ev) => {
    const menu = document.getElementById(MENU_ID);
    if (!menu) return;
    if (!menu.contains(ev.target) && ev.target !== btn) togglePolicyMenu(false);
  });

  return btn;
}

function ensurePolicyMenu() {
  let m = document.getElementById(MENU_ID);
  if (m) return m;
  m = document.createElement("div");
  m.id = MENU_ID;
  m.style.cssText = `
    position: fixed; right: 18px; bottom: 126px; z-index: 2147483647;
    min-width: 260px; max-width: 360px; max-height: 50vh; overflow:auto;
    background:#111; color:#fff; border:1px solid #2a2a2a; border-radius: 10px;
    box-shadow: 0 18px 40px rgba(0,0,0,.35); display:none; padding:6px;
    font: 12px/1.35 system-ui, -apple-system, Segoe UI, Roboto;
  `;
  document.documentElement.appendChild(m);
  return m;
}

function renderPolicyMenu(items) {
  const menu = ensurePolicyMenu();
  menu.innerHTML = ""; // reset

  items.forEach((it) => {
    const row = document.createElement("button");
    row.style.cssText = `
      width:100%; text-align:left; display:block; margin:4px 0; padding:8px 10px;
      background:#181818; color:#fff; border:1px solid #2a2a2a; border-radius:8px; cursor:pointer;
    `;
    row.textContent = `Analyze: ${it.label}`;
    row.onclick = (e) => {
      e.stopPropagation();
      togglePolicyMenu(false);
      setLoading(true);
      chrome.runtime.sendMessage({ type: "TERMSHIFT_ANALYZE_LINK", url: it.url, label: it.label });
    };
    menu.appendChild(row);
  });
  if (!items.length) {
    const empty = document.createElement("div");
    empty.textContent = "No policy links found on this page.";
    empty.style.cssText = "padding:8px 6px; color:#9aa1a6;";
    menu.appendChild(empty);
  }
}

function togglePolicyMenu(show) {
  const menu = ensurePolicyMenu();
  menu.style.display = show ? "block" : "none";
}

function updateSuggestion() {
  currentCandidates = collectPolicyLinks();
  const btn = ensureSuggestButton();
  if (currentCandidates.length === 0) {
    btn.style.display = "none";
    togglePolicyMenu(false);
    return;
  }
  btn.style.display = "inline-block";
  renderPolicyMenu(currentCandidates);
}

// Observe SPA changes / dynamic content
const mo = new MutationObserver(() => debounce(updateSuggestion, 200));
mo.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", updateSuggestion);
window.addEventListener("load", updateSuggestion);
updateSuggestion();
setTimeout(updateSuggestion, 400);

function debounce(fn, ms) {
  clearTimeout(fn.__t);
  fn.__t = setTimeout(fn, ms);
}



})();
