(async () => {
  const urlEl = document.getElementById("url");
  const tokenEl = document.getElementById("token");
  const saveBtn = document.getElementById("save");

  const { apiUrl, apiToken } = await chrome.storage.sync.get({ apiUrl: "", apiToken: "" });
  urlEl.value = apiUrl;
  tokenEl.value = apiToken;

  saveBtn.onclick = async () => {
    await chrome.storage.sync.set({
      apiUrl: urlEl.value.trim(),
      apiToken: tokenEl.value.trim()
    });
    saveBtn.textContent = "Saved ✓";
    setTimeout(() => (saveBtn.textContent = "Save"), 1500);
  };
})();
