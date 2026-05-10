# ConvoLens Chrome Extension

Production-ready Chrome extension for WhatsApp Web integration, enabling AI-powered chat summarization.

## Features

- **Message Extraction** - Extract chat messages from WhatsApp Web with robust DOM selection
- **AI Summarization** - Send conversations to ConvoLens for intelligent summaries
- **Secure Authentication** - OAuth integration with ConvoLens accounts
- **Offline Support** - Queue extractions when offline, sync when connected
- **Settings Management** - Configurable options via dedicated settings page
- **Rate Limiting** - Built-in protection against excessive API calls
- **Dark Mode** - Automatic theme matching with WhatsApp Web
- **Progress Tracking** - Real-time extraction progress indicator

## Installation

### Development

1. Install dependencies:
   ```bash
   cd apps/chrome-extension
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `apps/chrome-extension` directory

### Production Build

```bash
npm run build:prod
npm run package  # Creates convolens-extension.zip
```

## Usage

1. Open [WhatsApp Web](https://web.whatsapp.com)
2. Log in to your WhatsApp account
3. Click the ConvoLens extension icon in the toolbar
4. Sign in with your ConvoLens account
5. Navigate to any chat
6. Click the floating "Summarize" button or use the popup

## Project Structure

```
apps/chrome-extension/
├── manifest.json           # Extension manifest (Manifest V3)
├── package.json           # NPM configuration
├── tsconfig.json          # TypeScript configuration
├── popup/
│   ├── popup.html         # Extension popup UI
│   └── popup.js           # Popup functionality
├── options/
│   ├── options.html       # Settings page UI
│   └── options.js         # Settings functionality
├── src/
│   ├── config.ts          # Configuration management
│   ├── background.ts      # Service worker (auth, API, queuing)
│   ├── content.ts         # WhatsApp Web content script
│   └── content.css        # Content script styles
├── dist/                  # Compiled TypeScript output
└── icons/                 # Extension icons (16, 32, 48, 128px)
```

## Configuration

The extension supports custom API endpoints via the settings page. Environment-aware configuration:

| Environment | API URL | Dashboard URL |
|------------|---------|---------------|
| Development | `http://localhost:3001` | `http://localhost:3000` |
| Production | `https://api.convolens.com` | `https://app.convolens.com` |

## Development

### Scripts

```bash
npm run build        # Compile TypeScript
npm run watch        # Watch mode for development
npm run typecheck    # Type checking without emit
npm run package      # Create distribution ZIP
npm run clean        # Remove dist folder
```

### Key Files

- **`src/config.ts`** - Configuration, selectors, types
- **`src/content.ts`** - Message extraction logic with fallback selectors
- **`src/background.ts`** - API communication, auth, offline queue
- **`options/options.js`** - Settings management

### WhatsApp DOM Selectors

The extension uses data-testid selectors (most stable) with fallback class selectors:

```typescript
// Primary (stable)
'[data-testid="msg-container"]'
'[data-testid="msg-text"]'

// Fallback (less stable)
'.message-in, .message-out'
'.selectable-text span[dir="ltr"]'
```

## Security

- **HTTPS Only** - All API communication over TLS
- **Secure Storage** - Tokens in `chrome.storage.local`
- **Content Security Policy** - Strict CSP for extension pages
- **Minimal Permissions** - Only required permissions requested
- **No Data Persistence** - Chat content not stored locally

## Privacy

- Chat data transmitted only after user action
- No background data collection
- Extraction history stored locally only
- Clear data option in settings
- No third-party tracking

## Production Checklist

- [x] TypeScript implementation
- [x] Robust error handling with retry logic
- [x] Offline queue with automatic sync
- [x] Rate limiting protection
- [x] Settings/options page
- [x] Dark mode support
- [x] Accessibility features
- [x] Progress indicators
- [ ] Icon assets (16, 32, 48, 128px)
- [ ] Chrome Web Store listing
- [ ] Firefox/Edge versions

## Troubleshooting

### Extension not detecting WhatsApp

- Ensure you're on `https://web.whatsapp.com`
- Wait for WhatsApp to fully load
- Try refreshing the page

### Extraction fails

- Check that a chat is open (not just the chat list)
- Verify you're logged into ConvoLens
- Check the browser console for errors

### Rate limit errors

- Wait 60 seconds before retrying
- Check pending uploads in settings

## License

MIT - See [LICENSE](../../LICENSE)
