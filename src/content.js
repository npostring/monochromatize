function applyMonochrome(isEnabled) {
  if (isEnabled) {
    document.documentElement.style.setProperty('filter', 'grayscale(100%)', 'important');
  } else {
    document.documentElement.style.removeProperty('filter');
  }
}

async function checkAndApply() {
  const domain = window.location.hostname;
  const { monochromeSites = [], globalToggle = true } = await chrome.storage.sync.get(['monochromeSites', 'globalToggle']);
  
  if (!globalToggle) {
    applyMonochrome(false);
    return;
  }
  
  const isEnabled = monochromeSites.includes(domain);
  applyMonochrome(isEnabled);
}

// Global toggle/monochrome sites sync
checkAndApply();

// Listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.monochromeSites || changes.globalToggle) {
      checkAndApply();
    }
  }
});
