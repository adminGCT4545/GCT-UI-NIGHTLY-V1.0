# Browser Control System - GCT UI

## Overview

The Browser Control system allows KYNSEY to interact with web interfaces programmatically. It provides both a simulation mode for development and a real Puppeteer-based backend for actual browser automation.

## Current Status ✅

**Working Features:**
- ✅ Browser Control Panel in GCT UI
- ✅ All action buttons functional
- ✅ Console output and action history
- ✅ Launch button with URL input
- ✅ Simulation mode with immediate feedback
- ✅ Real Puppeteer server that can open Google.com
- ✅ Natural language commands
- ✅ Chat integration with slash commands

## Quick Start

### 1. Test in Simulation Mode (No Setup Required)

1. Open the GCT UI
2. Click the globe icon (🌐) in the sidebar
3. Enter a URL (e.g., google.com) and click Launch
4. Test any action button - you'll see immediate console output

### 2. Test with Real Browser Control

#### Option A: Simple Server (Mock Responses)
```bash
npm run browser-server-simple
```

#### Option B: Real Puppeteer Server (Actual Browser)
```bash
npm install
npm run browser-server-puppeteer
```

Then use the Browser Control panel normally.

## Features

### Basic Actions
- **Launch**: Open a URL in the browser
- **Click**: Click at specific coordinates
- **Type**: Enter text in the focused element
- **Screenshot**: Capture current page
- **Scroll**: Scroll up or down
- **Close**: Close the browser session

### Advanced Features
- **Console Output**: Real-time action logging
- **Action History**: Track of all performed actions
- **Session Management**: Active/inactive state tracking
- **Visual Feedback**: Loading states and success/error messages

### Natural Language Commands
Use these commands in the main chat:
- "open google.com"
- "search for artificial intelligence"
- "take a screenshot"
- "type hello world"
- "scroll down"

### Slash Commands
Use these in the chat:
- `/browse https://google.com`
- `/click 500 300`
- `/type Hello World`
- `/screenshot`

## Architecture

### Frontend Components
- `browser-control-ui.js` - Main UI module
- `browser-minimal-fix.js` - Button functionality fix
- `browser-ai.js` - Natural language processing
- `browser-actions.js` - Smart element detection
- `browser-coordinate-picker.js` - Coordinate selection
- `browser-recorder.js` - Recording and playback

### Backend Options
1. **Simulation Mode** - No server needed, immediate mock responses
2. **Simple Server** - Mock server with proper HTTP responses
3. **Puppeteer Server** - Real browser automation with screenshots

### File Structure
```
browser-control-ui.js          - Main UI integration
browser-minimal-fix.js         - Core button functionality
browser-server-simple.js       - Mock HTTP server
browser-server-puppeteer.js    - Real Puppeteer server
browser-ai.js                  - Natural language parser
browser-actions.js             - Smart interactions
browser-coordinate-picker.js   - Visual coordinate picker
browser-recorder.js            - Action recording system
```

## API Reference

### Browser Actions

#### Launch Browser
```javascript
POST /browser/action
{
  "action": "launch",
  "params": {
    "url": "https://google.com"
  }
}
```

#### Click at Coordinates
```javascript
POST /browser/action
{
  "action": "click",
  "params": {
    "coordinate": "500,300"
  }
}
```

#### Type Text
```javascript
POST /browser/action
{
  "action": "type",
  "params": {
    "text": "Hello World"
  }
}
```

#### Take Screenshot
```javascript
POST /browser/action
{
  "action": "screenshot",
  "params": {}
}
```

#### Scroll Page
```javascript
POST /browser/action
{
  "action": "scroll_up", // or "scroll_down"
  "params": {}
}
```

#### Close Browser
```javascript
POST /browser/action
{
  "action": "close",
  "params": {}
}
```

### Response Format
```javascript
{
  "success": true,
  "message": "Action completed successfully",
  "screenshot": "data:image/png;base64,iVBORw0...", // Base64 image
  "sessionId": "session_123456",
  "url": "https://google.com"
}
```

## Configuration

### Server URL
The browser control UI connects to `http://localhost:3456` by default. This can be configured in `config.js`:

```javascript
const config = {
  BROWSER_CONTROL_URL: 'http://localhost:3456'
};
```

### Browser Settings (Puppeteer)
```javascript
{
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ]
}
```

## Testing

### Debug Pages
- `browser-debug-simple.html` - Basic button testing
- `browser-debug-inline.html` - Comprehensive feature testing
- `browser-control-demo.html` - Feature showcase

### Test Commands
```bash
# Test CLI directly
npm run browser-test

# Start simple server
npm run browser-server-simple

# Start real Puppeteer server
npm run browser-server-puppeteer
```

## Troubleshooting

### Buttons Not Working
1. Check browser console for errors
2. Verify panel is open and session is active
3. Try the debug page: `browser-debug-simple.html`

### Server Connection Issues
1. Check if server is running: `curl http://localhost:3456/health`
2. Verify port 3456 is not blocked
3. Check server logs for errors

### Puppeteer Issues
1. Ensure dependencies installed: `npm install`
2. Check system requirements for Puppeteer
3. Try with simple server first

### No Console Output
1. Verify browser-minimal-fix.js is loaded
2. Check if Console Output section exists in DOM
3. Look for JavaScript errors in browser console

## Development

### Adding New Actions
1. Add action to server endpoint
2. Add UI button if needed
3. Update browser-minimal-fix.js handlers
4. Test with debug pages

### Extending Natural Language
1. Add patterns to browser-ai.js
2. Update action parsing logic
3. Test with chat commands

## Security

### URL Validation
- Only HTTPS URLs are recommended
- URL sanitization on server side
- No credential storage

### Action Limits
- Rate limiting on server
- Timeout protection
- Memory usage monitoring

## Performance

### Optimization
- Screenshot compression
- Efficient DOM updates
- Lazy loading of modules
- Background processing

### Resource Management
- Browser instance reuse
- Automatic cleanup
- Memory leak prevention

## Future Enhancements

### Phase 3 Features
- Multi-tab support
- Element detection by description
- Form auto-fill capabilities
- Action recording and playback

### Phase 4 Features
- Analytics integration
- Notes integration with screenshots
- Voice control commands
- Advanced automation workflows

## Support

For issues and feature requests, refer to:
- DEBUG.md - Current testing status
- KYNSEY UPDATES.md - Development progress
- BROWSER_INTEGRATION_PLAN.md - Roadmap

## License

Part of the GCT UI project.