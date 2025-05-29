# GCT UI NIGHTLY V1.0

GCT UI with integrated KYNSEY AI Assistant - A comprehensive web application featuring chat, browser control, analytics, notes, and admin capabilities.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   cd kynsey-ai/backend && npm install
   ```

2. Start the browser control server (required for browser automation):
   ```bash
   npm run browser-server
   ```

3. (Optional) Start the Kynsey AI backend for advanced features:
   ```bash
   npm run kynsey-backend
   ```

4. Open `index.html` in your browser

## Features

- **KYNSEY AI Chat**: Integrated AI assistant with natural language processing
- **Browser Control**: Automated browser actions with Puppeteer integration
- **Analytics Suite**: Power BI-like data analysis and visualization
- **Notes Application**: Markdown editor with WYSIWYG mode
- **Admin Panel**: User management and system configuration
- **Command Palette**: Quick access to all features (Ctrl+K)

## Architecture

- **Main UI**: `index.html` - Primary interface with all integrated features
- **Browser Server**: `browser-server-ultimate.js` - Puppeteer server for browser automation (port 3456)
- **Kynsey Backend**: `kynsey-ai/backend/` - Additional AI services (port 3002)

## Key Commands

- `npm start` - Instructions to open the UI
- `npm run browser-server` - Start browser control server
- `npm run kynsey-backend` - Start Kynsey AI backend
- `npm run kynsey-dev` - Start Kynsey backend in development mode

## Docker Support

For containerized deployment:

```bash
# Using Docker Compose
docker compose up -d

# Access at http://localhost:9091
```

## Configuration

Default API endpoint: `http://192.168.1.7:4545`
Default LLM model: `30b-a3b`

Configure in `config.js` as needed.

## Documentation

- `KYNSEY UPDATES.md` - Latest feature updates and implementation status
- `BROWSER_INTEGRATION_PLAN.md` - Browser control feature roadmap  
- `GCT_UI_ENHANCEMENT_PLAN.md` - UI improvement plans
- `CLAUDE RULES.md` - Development guidelines

## License

This project is licensed under the MIT License - see the LICENSE file for details.