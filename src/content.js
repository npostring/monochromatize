let customShortcut = { key: 'b', code: 'KeyB', altKey: true, ctrlKey: false, shiftKey: false };

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

// Initial check
checkAndApply();

chrome.storage.sync.get(['customShortcut'], (res) => {
  if (res.customShortcut) {
    customShortcut = res.customShortcut;
  }
});

// Listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.monochromeSites || changes.globalToggle) {
      checkAndApply();
    }
    if (changes.customShortcut) {
      customShortcut = changes.customShortcut.newValue;
    }
  }
});

// Custom shortcut listener (restored & isolated)
document.addEventListener('keydown', async (e) => {
  if (!customShortcut) return;
  
  // Guard: Check if global functionality is ON
  const { globalToggle = true } = await chrome.storage.sync.get(['globalToggle']);
  if (!globalToggle) return;
  
  // Guard: Do not fire when user is typing in forms/inputs
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
    return;
  }

  const keyMatches = e.code === customShortcut.code;

  if (keyMatches &&
      e.altKey === customShortcut.altKey &&
      e.ctrlKey === customShortcut.ctrlKey &&
      e.shiftKey === customShortcut.shiftKey) {
    e.preventDefault();
    
    // Toggle current domain
    const domain = window.location.hostname;
    const { monochromeSites = [] } = await chrome.storage.sync.get(['monochromeSites']);
    
    const isEnabled = monochromeSites.includes(domain);
    let newSites;
    if (isEnabled) {
      newSites = monochromeSites.filter(d => d !== domain);
    } else {
      newSites = [...monochromeSites, domain];
    }
    
    await chrome.storage.sync.set({ monochromeSites: newSites });
  }
});
