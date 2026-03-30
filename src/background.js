chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-monochrome') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const { globalToggle } = await chrome.storage.sync.get(['globalToggle']);
    if (globalToggle === false) return;

    try {
      const url = new URL(tab.url);
      const domain = url.hostname;

      const { monochromeSites = [] } = await chrome.storage.sync.get(['monochromeSites']);

      const isMonochrome = monochromeSites.includes(domain);
      let newSites;
      if (isMonochrome) {
        newSites = monochromeSites.filter(d => d !== domain);
      } else {
        newSites = [...monochromeSites, domain];
      }

      await chrome.storage.sync.set({ monochromeSites: newSites });
    } catch (e) {
      console.error("Invalid URL", e);
    }
  }
});
