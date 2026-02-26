(async () => {
  // ── Constants ──────────────────────────────────────────────────────────────
  const FIREBASE_API_KEY = 'AIzaSyAh_kQNqC3W4A8Cn9Hc9mJCBPjE-ywsNCI';
  const SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
  const REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
  const WEB_APP_URL = 'https://termshift.com';
  const SEV_COLORS = { HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e' };

  // ── Firebase REST helpers ──────────────────────────────────────────────────
  async function doRefresh(rt) {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(rt)}`,
    });
    if (!res.ok) return null;
    const d = await res.json();
    const updated = {
      idToken: d.id_token,
      refreshToken: d.refresh_token,
      expiresAt: Date.now() + parseInt(d.expires_in) * 1000,
    };
    await chrome.storage.local.set(updated);
    return updated;
  }

  async function checkAuth() {
    const local = await chrome.storage.local.get(['idToken', 'refreshToken', 'email', 'expiresAt']);
    if (!local.idToken) return null;
    if (Date.now() > (local.expiresAt || 0) - 5 * 60 * 1000) {
      if (!local.refreshToken) return null;
      const refreshed = await doRefresh(local.refreshToken);
      if (!refreshed) return null;
      return { idToken: refreshed.idToken, email: local.email };
    }
    return { idToken: local.idToken, email: local.email };
  }

  async function signInWithGoogle() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        try {
          const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                postBody: `access_token=${token}&providerId=google.com`,
                requestUri: 'https://termshift.com',
                returnIdpCredential: true,
                returnSecureToken: true,
              }),
            }
          );
          const d = await res.json();
          if (!res.ok) throw new Error(d.error?.message || 'Google sign-in failed.');
          const stored = {
            idToken: d.idToken,
            refreshToken: d.refreshToken,
            email: d.email,
            expiresAt: Date.now() + parseInt(d.expiresIn) * 1000,
          };
          await chrome.storage.local.set(stored);
          resolve(stored);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async function signIn(email, pw) {
    const res = await fetch(SIGN_IN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw, returnSecureToken: true }),
    });
    const d = await res.json();
    if (!res.ok) {
      const code = (d.error?.message || '').toUpperCase();
      if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_EMAIL')) {
        throw new Error('No account found with that email.');
      }
      if (code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
        throw new Error('Incorrect password.');
      }
      if (code.includes('USER_DISABLED')) throw new Error('Account has been disabled.');
      throw new Error('Sign-in failed. Please try again.');
    }
    const stored = {
      idToken: d.idToken,
      refreshToken: d.refreshToken,
      email: d.email,
      expiresAt: Date.now() + parseInt(d.expiresIn) * 1000,
    };
    await chrome.storage.local.set(stored);
    return stored;
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showAuth() {
    document.getElementById('auth-view').style.display = 'block';
    document.getElementById('main-view').style.display = 'none';
  }

  function showMain(email) {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('user-email').textContent = email || '';
  }

  function setSpinner(visible) {
    document.getElementById('spinner-row').style.display = visible ? 'flex' : 'none';
  }

  function setAnalyzeBtn(enabled) {
    const btn = document.getElementById('analyze-btn');
    btn.disabled = !enabled;
    btn.textContent = 'Analyze This Page';
  }

  function renderResults(data, scanId) {
    setSpinner(false);
    setAnalyzeBtn(true);
    const summary = data?.summary || {};
    const spans = data?.spans || [];
    const sev = String(summary.highest_severity || 'LOW').toUpperCase();
    const count = summary.risk_count ?? spans.length;

    const top = spans.slice(0, 3);
    const extra = spans.length - top.length;

    const spansHtml = top.length
      ? `<div class="span-list">${top.map(s => {
          const svr = String(s.severity || 'LOW').toUpperCase();
          const color = SEV_COLORS[svr] || SEV_COLORS.LOW;
          return `<div class="span-item">
            <div class="dot" style="background:${color}"></div>
            <span>${escHtml(s.label)}</span>
          </div>`;
        }).join('')}</div>`
      : '';

    const extraHtml = extra > 0
      ? `<div class="more-label">+${extra} more risk${extra !== 1 ? 's' : ''}</div>`
      : '';

    const reportBtn = scanId
      ? `<button class="btn-report" id="report-btn">See Full Report →</button>`
      : '';

    document.getElementById('results-area').innerHTML = `
      <div class="results-card">
        <div class="verdict-row">
          <span class="risk-count">${count} risk${count !== 1 ? 's' : ''} found</span>
          <span class="sev-badge sev-${sev}">${sev}</span>
        </div>
        ${spansHtml}
        ${extraHtml}
        ${reportBtn}
        <span class="reset-link" id="reset-link">× New scan</span>
      </div>
    `;

    if (scanId) {
      document.getElementById('report-btn').addEventListener('click', () => {
        chrome.tabs.create({ url: `${WEB_APP_URL}/history?scan=${scanId}` });
      });
    }
    document.getElementById('reset-link').addEventListener('click', async () => {
      await chrome.storage.local.remove(['lastAnalysis']);
      document.getElementById('results-area').innerHTML = '';
    });
  }

  function renderError(msg) {
    setSpinner(false);
    setAnalyzeBtn(true);
    document.getElementById('results-area').innerHTML = `
      <div class="error-result">${escHtml(msg || 'Analysis failed. Please try again.')}</div>
      <span class="reset-link" id="reset-link">× Try again</span>
    `;
    document.getElementById('reset-link').addEventListener('click', async () => {
      await chrome.storage.local.remove(['lastAnalysis']);
      document.getElementById('results-area').innerHTML = '';
    });
  }

  // Register a one-time listener for POPUP_ANALYSIS_DONE (returns a cleanup fn)
  function listenForDone(callback) {
    function handler(msg) {
      if (msg.type === 'POPUP_ANALYSIS_DONE') {
        chrome.runtime.onMessage.removeListener(handler);
        callback(msg);
      }
    }
    chrome.runtime.onMessage.addListener(handler);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  async function attemptGoogleSignIn() {
    const googleBtn = document.getElementById('google-btn');
    const googleBtnLabel = document.getElementById('google-btn-label');
    const errEl = document.getElementById('auth-error');
    googleBtn.disabled = true;
    googleBtnLabel.textContent = 'Signing in…';
    errEl.style.display = 'none';
    try {
      const result = await signInWithGoogle();
      showMain(result.email);
    } catch (e) {
      // Don't show an error box for user-cancelled flows
      const msg = e.message || '';
      if (!msg.includes('cancelled') && !msg.includes('closed') && !msg.includes('denied')) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
      }
      googleBtn.disabled = false;
      googleBtnLabel.textContent = 'Sign in with Google';
    }
  }

  async function attemptSignIn() {
    const signinBtn = document.getElementById('signin-btn');
    const errEl = document.getElementById('auth-error');
    signinBtn.disabled = true;
    signinBtn.textContent = 'Signing in…';
    errEl.style.display = 'none';
    try {
      const result = await signIn(
        document.getElementById('email').value.trim(),
        document.getElementById('password').value
      );
      showMain(result.email);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
      signinBtn.disabled = false;
      signinBtn.textContent = 'Sign In';
    }
  }

  async function handleLogout() {
    await chrome.storage.local.remove(['idToken', 'refreshToken', 'email', 'expiresAt', 'lastAnalysis']);
    document.getElementById('results-area').innerHTML = '';
    showAuth();
  }

  function handleAnalyze() {
    setAnalyzeBtn(false);
    setSpinner(true);
    document.getElementById('results-area').innerHTML = '';

    let responseHandled = false;

    chrome.runtime.sendMessage({ type: 'POPUP_ANALYZE_PAGE' }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      responseHandled = true;
      if (response.success) {
        renderResults(response.data, response.scanId);
      } else {
        renderError(response.error);
      }
    });

    // Fallback: handles the case where the popup was closed and reopened
    listenForDone((msg) => {
      if (responseHandled) return;
      if (msg.error) {
        renderError(msg.error);
      } else {
        renderResults(msg.data, msg.scanId);
      }
    });
  }

  // ── Bind event listeners (once, at startup) ────────────────────────────────
  document.getElementById('google-btn').addEventListener('click', attemptGoogleSignIn);
  document.getElementById('signin-btn').addEventListener('click', attemptSignIn);
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptSignIn();
  });
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);

  // ── Startup: check auth and restore analysis state ─────────────────────────
  const auth = await checkAuth();
  if (!auth) {
    showAuth();
  } else {
    showMain(auth.email);
    const { lastAnalysis } = await chrome.storage.local.get(['lastAnalysis']);
    if (lastAnalysis?.status === 'analyzing') {
      setAnalyzeBtn(false);
      setSpinner(true);
      listenForDone((msg) => {
        if (msg.error) {
          renderError(msg.error);
        } else {
          renderResults(msg.data, msg.scanId);
        }
      });
    } else if (lastAnalysis?.status === 'complete') {
      renderResults(lastAnalysis.data, lastAnalysis.scanId);
    } else if (lastAnalysis?.status === 'error') {
      renderError(lastAnalysis.error);
    }
  }
})();
