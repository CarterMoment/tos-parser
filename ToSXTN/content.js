
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

// loading stage timer management
let _loadingTimers = [];
function clearLoadingTimers() {
  _loadingTimers.forEach(t => clearTimeout(t));
  _loadingTimers = [];
}

// ---------- styles ----------
function injectStylesOnce() {
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  #${PANEL_ID} {
    --bg-primary:   #0f172a;
    --bg-surface:   #1e293b;
    --bg-card:      #263548;
    --accent:       #3b82f6;
    --accent-hover: #2563eb;
    --text-primary: #f1f5f9;
    --text-muted:   #94a3b8;
    --border:       #334155;
    --risk-high:    #f97316;
    --risk-med:     #f59e0b;
    --risk-low:     #22c55e;
    --radius-card:  10px;
    --radius-btn:   6px;
    position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;
    width: 320px; max-height: 60vh;
    background: var(--bg-primary); color: var(--text-primary);
    border-top: 3px solid var(--accent);
    border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,.45);
    overflow: hidden; font: 13px/1.4 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto;
    display: flex; flex-direction: column; transform: translateY(0); opacity: 0; pointer-events: none;
    transition: opacity .18s ease, transform .18s ease;
  }
  #${PANEL_ID}.open { opacity: 1; pointer-events: auto; }
  #${PANEL_ID} header {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 12px; background: var(--bg-surface); border-bottom:1px solid var(--border);
  }
  #${PANEL_ID} header .ts-wordmark { font-size:15px; font-weight:800; color:var(--accent); letter-spacing:-0.02em; line-height:1; }
  #${PANEL_ID} header .ts-header-label { font-size:11px; color:var(--text-muted); font-weight:400; margin-left:3px; }
  #${PANEL_ID} header .actions { display:flex; gap:4px; align-items:center; }
  #${PANEL_ID} header .icon-btn {
    width:24px; height:24px; background:transparent; color:var(--text-muted);
    border:none; border-radius:5px; cursor:pointer; padding:0;
    display:flex; align-items:center; justify-content:center; line-height:0;
  }
  #${PANEL_ID} header .icon-btn:hover { background:var(--bg-card); color:var(--text-primary); }
  #${PANEL_ID} .body { padding:10px 10px 12px; overflow:auto; }
  #${PANEL_ID} .summary { display:flex; gap:8px; margin-bottom:8px; font-size:12px; color: var(--text-muted); }
  #${PANEL_ID} .pill {
    display:inline-flex; align-items:center; gap:6px; padding:2px 8px;
    border-radius:999px; border:1px solid var(--border); background: var(--bg-surface);
  }
  #${PANEL_ID} .list { display:flex; flex-direction:column; gap:8px; }
  #${PANEL_ID} .item {
    padding:8px 10px; border:1px solid var(--border);
    border-radius: var(--radius-card); background: var(--bg-card);
    animation: termshift-fadein 0.25s ease both;
  }
  #${PANEL_ID} .item.sev-high { border-left: 3px solid var(--risk-high); }
  #${PANEL_ID} .item.sev-med  { border-left: 3px solid var(--risk-med); }
  #${PANEL_ID} .item.sev-low  { border-left: 3px solid var(--risk-low); }
  @keyframes termshift-fadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

  #${PANEL_ID} .sev-badge { display:inline-flex; align-items:center; padding:1px 7px; border-radius:999px; font-size:10px; font-weight:700; flex-shrink:0; }
  #${PANEL_ID} .sev-badge.high { background:#450a0a; color:#fca5a5; }
  #${PANEL_ID} .sev-badge.med  { background:#451a03; color:#fcd34d; }
  #${PANEL_ID} .sev-badge.low  { background:#052e16; color:#86efac; }
  #${PANEL_ID} .reason { color: var(--text-primary); font-size:12px; line-height:1.4; }
  #${PANEL_ID} .text { color: var(--text-muted); margin-top:5px; white-space:pre-wrap; line-height:1.5; font-size:12px; }
  #${PANEL_ID} .empty { color: var(--text-muted); text-align:center; padding:12px 8px; }

  /* progress */
  #${PANEL_ID} .ts-progress-wrap { padding:12px 12px 14px; }
  #${PANEL_ID} .ts-progress-label { font-size:12px; color:var(--text-muted); margin-bottom:8px; transition:opacity 0.2s ease; }
  #${PANEL_ID} .ts-progress-track { height:4px; background:var(--bg-card); border-radius:2px; overflow:hidden; }
  #${PANEL_ID} .ts-progress-bar { height:100%; background:var(--accent); border-radius:2px; transition:width 0.6s ease; width:0%; }

  /* bottom actions */
  #${PANEL_ID} .btn-report {
    display:block; width:100%; background:var(--accent); color:#fff;
    border:none; border-radius:var(--radius-btn); padding:8px 16px;
    font-size:12px; font-weight:600; cursor:pointer; text-align:center; margin-top:10px;
  }
  #${PANEL_ID} .btn-report:hover { background:var(--accent-hover); }
  #${PANEL_ID} .ts-scan-again { display:block; text-align:center; margin-top:8px; font-size:11px; color:var(--border); cursor:pointer; }
  #${PANEL_ID} .ts-scan-again:hover { color:var(--text-muted); }

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
      <div style="display:flex;align-items:baseline;gap:0">
        <span class="ts-wordmark">Termshift</span>
        <span class="ts-header-label">Flags</span>
      </div>
      <div class="actions">
        <button class="icon-btn" data-action="min" title="Minimize">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="icon-btn" data-action="close" title="Close">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </header>
    <div class="body"></div>
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
  clearLoadingTimers();
  const root = ensurePanel();
  const body = root.querySelector(".body");

  if (isLoading) {
    body.innerHTML = `
      <div class="ts-progress-wrap">
        <div class="ts-progress-label" id="ts-prog-label">Extracting text\u2026</div>
        <div class="ts-progress-track">
          <div class="ts-progress-bar" id="ts-prog-bar"></div>
        </div>
      </div>
    `;
    // Kick bar to 15% on next frame so CSS transition fires
    requestAnimationFrame(() => {
      const bar = body.querySelector("#ts-prog-bar");
      if (bar) bar.style.width = "15%";
    });

    function setStage(label, width, transMs) {
      const lbl = body.querySelector("#ts-prog-label");
      const bar = body.querySelector("#ts-prog-bar");
      if (!lbl || !bar) return;
      lbl.style.opacity = "0";
      setTimeout(() => {
        if (lbl.isConnected) { lbl.textContent = label; lbl.style.opacity = "1"; }
      }, 200);
      bar.style.transition = `width ${transMs}ms ease`;
      bar.style.width = width;
    }

    _loadingTimers.push(setTimeout(() => setStage("Reading clauses\u2026", "40%", 600), 1200));
    _loadingTimers.push(setTimeout(() => setStage("Analyzing risks\u2026", "85%", 14000), 2200));
    return;
  }

  // Results arrived — replace progress with summary pills
  const pills = `
    <div class="summary">
      <span class="pill">Risks: <b>${summary?.risk_count ?? 0}</b></span>
      <span class="pill">Highest: <b>${(summary?.highest_severity ?? "\u2014").toUpperCase()}</b></span>
    </div>
  `;
  body.innerHTML = pills;
}


function renderSpansList(spans, scanId) {
  const root = ensurePanel();
  const body = root.querySelector(".body");
  if (!spans.length) {
    body.innerHTML += `<div class="empty">No risky spans detected in this selection.</div>`;
    return;
  }
  const list = document.createElement("div");
  list.className = "list";
  spans.forEach((s, i) => {
    const sev = (s.severity || "LOW").toLowerCase();
    const item = document.createElement("div");
    item.className = `item sev-${sev}`;
    item.style.animationDelay = `${i * 50}ms`;
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${s.explanation ? '5px' : '0'}">
        <span class="sev-badge ${sev}">${sev.toUpperCase()}</span>
        <span class="reason">${escapeHTML(s.label || "Flag")}</span>
      </div>
      ${s.explanation ? `<div class="text">${escapeHTML(s.explanation)}</div>` : ``}
    `;
    list.appendChild(item);
  });
  body.appendChild(list);

  if (scanId) {
    const reportBtn = document.createElement("button");
    reportBtn.className = "btn-report";
    reportBtn.textContent = "View Full Report \u2192";
    reportBtn.onclick = () => window.open(`https://termshift.com/history?scan=${scanId}`, "_blank");
    body.appendChild(reportBtn);
  }

  const scanAgain = document.createElement("span");
  scanAgain.className = "ts-scan-again";
  scanAgain.textContent = "\u00d7 Close";
  scanAgain.onclick = () => {
    root.classList.remove("open");
    setTimeout(() => root.remove(), 180);
  };
  body.appendChild(scanAgain);
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

  if (msg.type === "TERMSHIFT_SUMMARY") {
    // Early summary arrived (~2s) — update progress label before full result lands
    const lbl = document.getElementById("ts-prog-label");
    if (lbl && lbl.isConnected) {
      const count = msg.summary?.risk_count ?? '?';
      const sev = String(msg.summary?.highest_severity || '').toUpperCase();
      lbl.style.opacity = '0';
      setTimeout(() => {
        if (lbl.isConnected) {
          lbl.textContent = `Found ${count} risk${count !== 1 ? 's' : ''} (${sev}) — loading breakdown\u2026`;
          lbl.style.opacity = '1';
        }
      }, 200);
    }
    return;
  }

  if (msg.type === "TERMSHIFT_RESULT") {
    clearPendingOutline();

    const { summary, spans, scan_id } = msg.payload || {};
    setLoading(false, summary);        // adds the pills (risk count + highest)

    renderSpansList(spans || [], scan_id);  // render list items in the panel

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
    padding: 9px 16px; border-radius: 8px; border: none;
    background: #3b82f6; color: #ffffff; font: 600 12px/1.3 'Inter', system-ui; cursor: pointer;
    box-shadow: 0 4px 16px rgba(59,130,246,.4); display: none; white-space: nowrap;
  `;
  btn.addEventListener('mouseenter', () => { btn.style.background = '#2563eb'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = '#3b82f6'; });
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
    min-width: 260px; max-width: 360px; max-height: 50vh; overflow: auto;
    background: #0f172a; color: #f1f5f9; border: 1px solid #334155; border-radius: 10px;
    box-shadow: 0 18px 40px rgba(0,0,0,.45); display: none; padding: 6px;
    font: 12px/1.35 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto;
  `;
  document.documentElement.appendChild(m);
  return m;
}

function renderPolicyMenu(items) {
  const menu = ensurePolicyMenu();
  menu.innerHTML = ""; // reset

  items.forEach((it) => {
    const isPrivacy = /privacy|cookie/i.test(it.label);
    const typeIcon = isPrivacy
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    const chevron = `<svg class="ts-row-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0;transition:opacity 0.12s"><polyline points="9 18 15 12 9 6"/></svg>`;

    const row = document.createElement("button");
    row.style.cssText = `
      width: 100%; text-align: left; display: flex; align-items: center; gap: 8px;
      margin: 4px 0; padding: 8px 10px;
      background: #263548; color: #f1f5f9; border: 1px solid #334155; border-radius: 10px;
      cursor: pointer; font: 12px/1.35 'Inter', system-ui;
    `;
    row.innerHTML = `${typeIcon}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Analyze: ${escapeHTML(it.label)}</span>${chevron}`;
    row.addEventListener('mouseenter', () => {
      row.style.background = '#334155';
      row.querySelector('.ts-row-chevron').style.opacity = '1';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = '#263548';
      row.querySelector('.ts-row-chevron').style.opacity = '0';
    });
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
