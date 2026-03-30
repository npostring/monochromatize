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
            if (['http:', 'https:'].includes(url.protocol)) {
              setCurrentDomain(url.hostname);
            } else {
              setCurrentDomain('N/A (Browser Page)');
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

  const validDomain = currentDomain && !currentDomain.startsWith('N/A');

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

      <div className="card current-domain">
        <h3>Current Site</h3>
        <div className="domain-name">{currentDomain || 'Loading...'}</div>
        {validDomain && (
          <button 
            className={`btn ${isCurrentMonochrome ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleCurrentDomain}
          >
            {isCurrentMonochrome ? 'Disable for this site' : 'Enable for this site'}
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">Monochromatized Sites</h3>
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
      </div>
    </div>
  );
}

export default App;
