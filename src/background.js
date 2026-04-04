// Simple Background script (Standard chrome.commands API)
// Listen for the toggle-monochrome command and update domain status.

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-monochrome") {
    // 1. Get the currently active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    // 2. Security Check: Restricted domains
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

    try {
      const url = new URL(tab.url);
      const domain = url.hostname;

      // 3. Load user settings and site list
      const { monochromeSites = [], globalToggle = true } = await chrome.storage.sync.get(['monochromeSites', 'globalToggle']);
      if (!globalToggle) return;

      // 4. Toggle logic
      const isMonochrome = monochromeSites.includes(domain);
      let newSites;
      if (isMonochrome) {
        newSites = monochromeSites.filter(d => d !== domain);
      } else {
        newSites = [...monochromeSites, domain];
      }

      // 5. Update storage
      await chrome.storage.sync.set({ monochromeSites: newSites });
    } catch (e) {
      console.error("Monochromatize background error:", e);
    }
  }
});
