<div align="center">
  <img src="./public/icon.png" width="128" alt="Monochromatize Icon" />
  <h1>Monochromatize</h1>
</div>

A Chrome extension to turn specified websites into black and white (monochrome / grayscale).

## Features
- **Modern UI**: A beautifully styled red/pink-themed popup UI featuring glassmorphism design parameters.
- **Customizable Shortcuts**: Modify your master toggle shortcut key straight from the popup interface (Default: `Alt + B`).
- **Per-Domain Targeting**: Add domains specific sites to enable or disable the grayscale effect contextually.
- **Global Disable**: Conveniently bypass all active filters via a global master switch.

## Build from Source

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

After building, load the `dist/` directory as an unpacked extension on Chrome via `chrome://extensions/`.
