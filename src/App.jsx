import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [globalToggle, setGlobalToggle] = useState(true);
  const [monochromeSites, setMonochromeSites] = useState([]);
  const [currentDomain, setCurrentDomain] = useState('');
  
  // Current shortcut string (fetched from browser)
  const [currentShortcut, setCurrentShortcut] = useState('Alt + B');

  useEffect(() => {
    // Determine current domain
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            setCurrentDomain(url.hostname);
          } catch (e) {
            setCurrentDomain('N/A');
          }
        }
      });

      // Load storage
      chrome.storage.sync.get(['globalToggle', 'monochromeSites'], (res) => {
        if (res.globalToggle !== undefined) setGlobalToggle(res.globalToggle);
        if (res.monochromeSites !== undefined) setMonochromeSites(res.monochromeSites);
      });

      // Synchronize current shortcut with Chrome's native command settings
      const fetchShortcut = () => {
        chrome.commands.getAll((commands) => {
          const command = commands.find(c => c.name === "toggle-monochrome");
          if (command && command.shortcut) {
            setCurrentShortcut(command.shortcut);
          } else {
            setCurrentShortcut('Not Set');
          }
        });
      };
      fetchShortcut();

      // Listen for changes
      const listener = (changes, namespace) => {
        if (namespace === 'sync') {
          if (changes.globalToggle) setGlobalToggle(changes.globalToggle.newValue);
          if (changes.monochromeSites) setMonochromeSites(changes.monochromeSites.newValue);
        }
      };
      chrome.storage.onChanged.addListener(listener);

      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, []);

  const handleToggleGlobal = (e) => {
    const newValue = e.target.checked;
    setGlobalToggle(newValue);
    if (typeof chrome !== 'undefined') {
      chrome.storage.sync.set({ globalToggle: newValue });
    }
  };

  const isCurrentMonochrome = monochromeSites.includes(currentDomain);

  const toggleCurrentDomain = () => {
    if (!currentDomain || currentDomain.startsWith('N/A')) return;
    
    let newSites;
    if (isCurrentMonochrome) {
      newSites = monochromeSites.filter(d => d !== currentDomain);
    } else {
      newSites = [...monochromeSites, currentDomain];
    }
    
    setMonochromeSites(newSites);
    if (typeof chrome !== 'undefined') {
      chrome.storage.sync.set({ monochromeSites: newSites });
    }
  };

  const removeDomain = (domain) => {
    const newSites = monochromeSites.filter(d => d !== domain);
    setMonochromeSites(newSites);
    if (typeof chrome !== 'undefined') {
      chrome.storage.sync.set({ monochromeSites: newSites });
    }
  };

  const handleExport = () => {
    const data = monochromeSites.map(domain => ({ domain }));
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monochromatize_sites.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (Array.isArray(json)) {
          const newDomains = json
            .filter(item => item && typeof item.domain === 'string')
            .map(item => {
              let d = item.domain.trim();
              try {
                if (!d.startsWith('http://') && !d.startsWith('https://')) {
                  d = 'https://' + d;
                }
                return new URL(d).hostname;
              } catch (e) {
                return item.domain.trim();
              }
            })
            .filter(Boolean);
          
          const merged = [...new Set([...monochromeSites, ...newDomains])];
          
          if (typeof chrome !== 'undefined') {
            chrome.storage.sync.set({ monochromeSites: merged }, () => {
              if (chrome.runtime.lastError) {
                alert('Failed to save: ' + chrome.runtime.lastError.message);
              } else {
                setMonochromeSites(merged);
              }
            });
          } else {
            setMonochromeSites(merged);
          }
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // Open the official Chrome extensions shortcuts page
  const openChromeSettings = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src="/icon.png" 
            alt="Monochromatize Logo" 
            style={{ width: '22px', height: '22px', display: 'block', objectFit: 'contain' }} 
            decoding="async"
          />
          <h1 className="title">Monochromatize</h1>
        </div>
        <label className="switch" title="Toggle Extension On/Off">
          <input 
            type="checkbox" 
            checked={globalToggle}
            onChange={handleToggleGlobal}
          />
          <span className="slider"></span>
        </label>
      </header>
      
      {globalToggle ? (
        <>
          {/* ADD CURRENT SITE SECTION (UNBOXED) */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ height: '40px' }}>
              {currentDomain && !currentDomain.startsWith('N/A') ? (
                <>
                  <button 
                    className={`btn ${isCurrentMonochrome ? 'btn-danger' : 'btn-primary-vibrant'}`}
                    onClick={toggleCurrentDomain}
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      padding: '8px 12px'
                    }}
                  >
                    {isCurrentMonochrome ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {isCurrentMonochrome ? 'Remove current site' : 'Add current site'}
                    </span>
                  </button>
                </>
              ) : (
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed var(--surface-border)',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  Extension not available on this page
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Sites</h3>
              <div style={{ display: 'flex', gap: '8px', opacity: 0.6 }}>
                <label className="btn-icon" title="Import JSON" style={{ cursor: 'pointer' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </label>
                <button className="btn-icon" title="Export JSON" onClick={handleExport}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="domain-list">
              {monochromeSites.length === 0 ? (
                <div className="empty-state">No other sites added.</div>
              ) : (
                <>
                  {monochromeSites.map((domain) => (
                    <div className="domain-item" key={domain}>
                      <span title={domain}>{domain}</span>
                      <button 
                        className="btn-icon" 
                        onClick={() => removeDomain(domain)}
                        title="Remove site"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Shortcut</span>
              <button 
                className="btn btn-shortcut"
                onClick={openChromeSettings}
                title="Open Chrome settings to change and record shortcut key"
                style={{ 
                  background: 'rgba(30, 41, 59, 0.6)', 
                  padding: '6px 12px', 
                  minWidth: '80px',
                  border: '1px solid var(--surface-border)',
                  borderBottom: '2px solid rgba(0, 0, 0, 0.3)'
                }}
              >
                {currentShortcut}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '260px'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0, opacity: 0.6 }}>Extension is OFF</h2>
        </div>
      )}

    </div>
  );
}

export default App;
