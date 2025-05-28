# Browser Control Tool

This tool provides programmatic control of a browser instance using Puppeteer, specifically designed for LLMs to interact with web interfaces. It supports common browser actions like clicking, typing, scrolling, and capturing screenshots.

## Prerequisites

```bash
npm install puppeteer
```

## Usage

The tool accepts XML-formatted commands through the CLI interface. Here are the available actions:

### Launch Browser
```xml
<browser_action>
<action>launch</action>
<url>http://example.com</url>
</browser_action>
```

### Click at Coordinates
```xml
<browser_action>
<action>click</action>
<coordinate>450,300</coordinate>
</browser_action>
```

### Hover at Coordinates
```xml
<browser_action>
<action>hover</action>
<coordinate>450,300</coordinate>
</browser_action>
```

### Type Text
```xml
<browser_action>
<action>type</action>
<text>Hello, world!</text>
</browser_action>
```

### Resize Viewport
```xml
<browser_action>
<action>resize</action>
<size>1280,720</size>
</browser_action>
```

### Scroll Actions
```xml
<browser_action>
<action>scroll_down</action>
</browser_action>

<browser_action>
<action>scroll_up</action>
</browser_action>
```

### Close Browser
```xml
<browser_action>
<action>close</action>
</browser_action>
```

## Features

- Browser window resolution: 900x600 pixels by default
- Screenshots are automatically captured after each action
- Console logs are captured and reported
- Error handling with detailed feedback
- Screenshots are saved in a 'screenshots' directory

## Response Format

Each action returns a JSON response with:
- success: boolean indicating if the action succeeded
- message: description of what happened
- screenshot: path to the screenshot taken after the action (if applicable)

Example response:
```json
{
  "success": true,
  "message": "Clicked at coordinates (450, 300)",
  "screenshot": "/path/to/screenshots/after_click.png"
}
```

## Important Notes

1. The browser window has a default resolution of 900x600 pixels
2. When performing click or hover actions, ensure coordinates are within this resolution range
3. Screenshots are automatically taken after each action for verification
4. Always close the browser when finished using the 'close' action
5. Each new browser session starts fresh (no persistent state)

## Error Handling

The tool provides detailed error messages when actions fail. Common errors include:
- Invalid coordinates
- Failed to launch browser
- Network errors when loading URLs
- Invalid viewport dimensions

## Example Workflow

1. Launch browser:
```xml
<browser_action>
<action>launch</action>
<url>file:///path/to/index.html</url>
</browser_action>
```

2. Click a button:
```xml
<browser_action>
<action>click</action>
<coordinate>450,300</coordinate>
</browser_action>
```

3. Type some text:
```xml
<browser_action>
<action>type</action>
<text>Hello, world!</text>
</browser_action>
```

4. Close browser:
```xml
<browser_action>
<action>close</action>
</browser_action>