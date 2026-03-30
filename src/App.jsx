import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [globalToggle, setGlobalToggle] = useState(true);
  const [monochromeSites, setMonochromeSites] = useState([]);
  const [currentDomain, setCurrentDomain] = useState('');
  
  const [shortcut, setShortcut] = useState({ key: 'b', code: 'KeyB', altKey: true, ctrlKey: false, shiftKey: false });
  const [isRecording, setIsRecording] = useState(false);
  const shortcutBtnRef = useRef(null);

  useEffect(() => {
    // Determine current domain
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            const restrictedStores = [
              'chromewebstore.google.com',
              'chrome.google.com',
              'microsoftedge.microsoft.com',
              'addons.mozilla.org'
            ];
            
            if (['http:', 'https:'].includes(url.protocol)) {
              if (restrictedStores.includes(url.hostname)) {
                setCurrentDomain('N/A (Restricted)');
              } else {
                setCurrentDomain(url.hostname);
              }
            } else {
              setCurrentDomain('N/A');
            }
          } catch (e) {
            setCurrentDomain('N/A');
          }
        }
      });

      // Load storage
      chrome.storage.sync.get(['globalToggle', 'monochromeSites', 'customShortcut'], (res) => {
        if (res.globalToggle !== undefined) setGlobalToggle(res.globalToggle);
        if (res.monochromeSites !== undefined) setMonochromeSites(res.monochromeSites);
        if (res.customShortcut !== undefined) setShortcut(res.customShortcut);
      });

      // Listen for changes
      const listener = (changes, namespace) => {
        if (namespace === 'sync') {
          if (changes.globalToggle) setGlobalToggle(changes.globalToggle.newValue);
          if (changes.monochromeSites) setMonochromeSites(changes.monochromeSites.newValue);
          if (changes.customShortcut) setShortcut(changes.customShortcut.newValue);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isRecording) return;
      e.preventDefault();
      
      // ignore if only modifiers are pressed
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const newShortcut = {
        key: e.key,
        code: e.code,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey
      };
      
      setShortcut(newShortcut);
      setIsRecording(false);
      
      if (typeof chrome !== 'undefined') {
        chrome.storage.sync.set({ customShortcut: newShortcut });
      }
      
      if (shortcutBtnRef.current) {
        shortcutBtnRef.current.blur();
      }
    };

    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

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
                // Extract hostname in case user included 'https://'
                if (!d.startsWith('http://') && !d.startsWith('https://')) {
                  d = 'https://' + d;
                }
                return new URL(d).hostname;
              } catch (e) {
                return item.domain.trim(); // Fallback string
              }
            })
            .filter(Boolean);
          
          const merged = [...new Set([...monochromeSites, ...newDomains])];
          
          if (typeof chrome !== 'undefined') {
            chrome.storage.sync.set({ monochromeSites: merged }, () => {
              if (chrome.runtime.lastError) {
                alert('Failed to save: ' + chrome.runtime.lastError.message + '\n\nStorage limit may be exceeded.');
              } else {
                setMonochromeSites(merged);
              }
            });
          } else {
            setMonochromeSites(merged);
          }
        } else {
          alert('Invalid format. Expected an array of {"domain": "..."} objects.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const formatShortcut = (s) => {
    const parts = [];
    if (s.ctrlKey) parts.push('Ctrl');
    if (s.altKey) parts.push('Alt');
    if (s.shiftKey) parts.push('Shift');
    let keyName = s.code ? s.code.replace('Key', '').replace('Digit', '') : s.key.toUpperCase();
    if (!parts.length && keyName) parts.push(keyName);
    else if (keyName) parts.push(keyName);
    return parts.join(' + ');
  };

  const resetToDefault = () => {
    const defaultShortcut = { key: 'b', code: 'KeyB', altKey: true, ctrlKey: false, shiftKey: false };
    setShortcut(defaultShortcut);
    setIsRecording(false);
    if (typeof chrome !== 'undefined') {
      chrome.storage.sync.set({ customShortcut: defaultShortcut });
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Monochromatize</h1>
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
          <div className="card">
            <h3 className="section-title">Sites</h3>
            
            {/* ADD CURRENT SITE BUTTON */}
            <div style={{ height: '46px', marginBottom: '16px' }}>
              {currentDomain && !currentDomain.startsWith('N/A') ? (
                <button 
                  className={`btn ${isCurrentMonochrome ? 'btn-danger' : 'btn-primary'}`}
                  onClick={toggleCurrentDomain}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    padding: '0 12px'
                  }}
                >
                  {isCurrentMonochrome ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  )}
                  <span style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    flex: 1,
                    textAlign: 'center'
                  }}>
                    {isCurrentMonochrome ? `Remove ${currentDomain}` : `Add ${currentDomain}`}
                  </span>
                </button>
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

            {monochromeSites.length === 0 ? (
              <div className="empty-state">No sites added yet.</div>
            ) : (
              <div className="domain-list">
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
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Import
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleExport}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Shortcut Key</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {formatShortcut(shortcut) !== 'Alt + B' && (
                  <button 
                    className="btn-icon" 
                    onClick={resetToDefault} 
                    title="Reset to Alt+B"
                    style={{ fontSize: '1.2rem', padding: '0 4px' }}
                  >
                    ↺
                  </button>
                )}
                <button 
                  ref={shortcutBtnRef}
                  className={`btn ${isRecording ? 'btn-recording' : 'btn-shortcut'}`}
                  onClick={() => setIsRecording(true)}
                >
                  {isRecording ? 'Press combination...' : formatShortcut(shortcut)}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          textAlign: 'center',
          opacity: 0.8
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: 'var(--text-main)' }}>Extension is OFF</h2>
          <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Monochromatize is currently disabled.<br/>
            Turn it back on to manage sites.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
