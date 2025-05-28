// Ultimate Browser Server - Single page instance, no conflicts
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3456;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Global browser instance
let browser = null;
let page = null;
let sessionId = null;

// Ensure valid URL
function ensureValidUrl(url) {
    if (!url || url.trim() === '') return 'https://www.google.com';
    url = url.trim();
    if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
    }
    try {
        new URL(url);
        return url;
    } catch (e) {
        return 'https://www.google.com';
    }
}

// Initialize browser once
async function initBrowser() {
    if (!browser) {
        console.log('[Server] Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('[Server] Browser ready');
    }
    return browser;
}

// Get or create page
async function getPage() {
    await initBrowser();
    
    if (!page || page.isClosed()) {
        console.log('[Server] Creating new page');
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }
    
    return page;
}

// Take screenshot
async function takeScreenshot() {
    if (!page || page.isClosed()) return null;
    
    try {
        const screenshot = await page.screenshot({ 
            encoding: 'base64',
            fullPage: false
        });
        return `data:image/png;base64,${screenshot}`;
    } catch (error) {
        console.error('[Server] Screenshot error:', error.message);
        return null;
    }
}

// Routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        browserActive: !!page && !page.isClosed(),
        puppeteerConnected: !!browser
    });
});

app.post('/browser/action', async (req, res) => {
    console.log(`[Server] Action: ${req.body.action}`);
    
    try {
        const { action, params = {} } = req.body;
        let result = { success: false };
        
        switch (action) {
            case 'launch':
                const url = ensureValidUrl(params.url);
                console.log(`[Server] Navigating to: ${url}`);
                
                const currentPage = await getPage();
                
                try {
                    await currentPage.goto(url, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000 
                    });
                    
                    sessionId = 'session_' + Date.now();
                    const screenshot = await takeScreenshot();
                    
                    result = {
                        success: true,
                        message: `Navigated to ${url}`,
                        screenshot: screenshot,
                        sessionId: sessionId,
                        url: url,
                        title: await currentPage.title()
                    };
                    
                    console.log('[Server] Navigation successful');
                } catch (navError) {
                    console.error('[Server] Navigation error:', navError.message);
                    result = {
                        success: false,
                        message: navError.message
                    };
                }
                break;
                
            case 'click':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    try {
                        if (params.selector) {
                            await page.waitForSelector(params.selector, { timeout: 5000 });
                            await page.click(params.selector);
                        } else if (params.x !== undefined && params.y !== undefined) {
                            await page.mouse.click(params.x, params.y);
                        }
                        
                        await page.waitForTimeout(500);
                        const screenshot = await takeScreenshot();
                        
                        result = {
                            success: true,
                            message: 'Clicked',
                            screenshot: screenshot
                        };
                    } catch (error) {
                        result = {
                            success: false,
                            message: error.message
                        };
                    }
                }
                break;
                
            case 'type':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    try {
                        await page.keyboard.type(params.text || '', { delay: 50 });
                        
                        await page.waitForTimeout(300);
                        const screenshot = await takeScreenshot();
                        
                        result = {
                            success: true,
                            message: 'Typed text',
                            screenshot: screenshot
                        };
                    } catch (error) {
                        result = {
                            success: false,
                            message: error.message
                        };
                    }
                }
                break;
                
            case 'screenshot':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    const screenshot = await takeScreenshot();
                    result = {
                        success: true,
                        message: 'Screenshot taken',
                        screenshot: screenshot
                    };
                }
                break;
                
            case 'scroll':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    try {
                        const amount = params.amount || 300;
                        const direction = params.direction || 'down';
                        
                        await page.evaluate((dir, amt) => {
                            if (dir === 'down') {
                                window.scrollBy(0, amt);
                            } else {
                                window.scrollBy(0, -amt);
                            }
                        }, direction, amount);
                        
                        await page.waitForTimeout(300);
                        const screenshot = await takeScreenshot();
                        
                        result = {
                            success: true,
                            message: `Scrolled ${direction}`,
                            screenshot: screenshot
                        };
                    } catch (error) {
                        result = {
                            success: false,
                            message: error.message
                        };
                    }
                }
                break;
                
            case 'setViewport':
            case 'zoom':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    try {
                        const width = params.width || 1280;
                        const height = params.height || 720;
                        const deviceScaleFactor = params.deviceScaleFactor || 1;
                        
                        await page.setViewport({ 
                            width: Math.round(width), 
                            height: Math.round(height),
                            deviceScaleFactor: deviceScaleFactor
                        });
                        
                        await page.waitForTimeout(300);
                        const screenshot = await takeScreenshot();
                        
                        result = {
                            success: true,
                            message: `Viewport set to ${width}x${height} (scale: ${deviceScaleFactor})`,
                            screenshot: screenshot
                        };
                    } catch (error) {
                        result = {
                            success: false,
                            message: error.message
                        };
                    }
                }
                break;
                
            case 'detectForms':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    try {
                        const forms = await page.evaluate(() => {
                            const forms = [];
                            const inputs = document.querySelectorAll('input, textarea, select');
                            
                            inputs.forEach(input => {
                                const label = input.labels?.[0]?.textContent || 
                                             input.placeholder || 
                                             input.name || 
                                             input.id || 
                                             'Unknown field';
                                
                                forms.push({
                                    id: input.id || input.name || Math.random().toString(36),
                                    type: input.type || 'text',
                                    tagName: input.tagName.toLowerCase(),
                                    label: label.trim(),
                                    name: input.name,
                                    value: input.value,
                                    required: input.required,
                                    placeholder: input.placeholder,
                                    visible: input.offsetParent !== null
                                });
                            });
                            
                            return forms.filter(f => f.visible);
                        });
                        
                        result = {
                            success: true,
                            message: `Found ${forms.length} form fields`,
                            forms: forms
                        };
                    } catch (error) {
                        result = {
                            success: false,
                            message: error.message
                        };
                    }
                }
                break;
                
            case 'fillForm':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    try {
                        const { fieldId, value } = params;
                        
                        await page.evaluate((id, val) => {
                            const field = document.getElementById(id) || 
                                         document.querySelector(`[name="${id}"]`);
                            if (field) {
                                field.value = val;
                                field.dispatchEvent(new Event('input', { bubbles: true }));
                                field.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, fieldId, value);
                        
                        await page.waitForTimeout(200);
                        const screenshot = await takeScreenshot();
                        
                        result = {
                            success: true,
                            message: `Filled field: ${fieldId}`,
                            screenshot: screenshot
                        };
                    } catch (error) {
                        result = {
                            success: false,
                            message: error.message
                        };
                    }
                }
                break;
                
            case 'detectElements':
                if (!page || page.isClosed()) {
                    result = { success: false, message: 'No active session' };
                } else {
                    try {
                        const elements = await page.evaluate(() => {
                            const clickableElements = [];
                            const selectors = 'a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]';
                            const elements = document.querySelectorAll(selectors);
                            
                            elements.forEach(el => {
                                const rect = el.getBoundingClientRect();
                                if (rect.width > 0 && rect.height > 0 && el.offsetParent !== null) {
                                    clickableElements.push({
                                        text: el.textContent?.trim() || el.value || el.alt || el.title || 'Unnamed',
                                        type: el.tagName.toLowerCase(),
                                        x: Math.round(rect.left + rect.width / 2),
                                        y: Math.round(rect.top + rect.height / 2),
                                        width: rect.width,
                                        height: rect.height,
                                        href: el.href || null,
                                        className: el.className || null
                                    });
                                }
                            });
                            
                            return clickableElements;
                        });
                        
                        result = {
                            success: true,
                            message: `Found ${elements.length} clickable elements`,
                            elements: elements
                        };
                    } catch (error) {
                        result = {
                            success: false,
                            message: error.message
                        };
                    }
                }
                break;
                
            case 'close':
                if (page && !page.isClosed()) {
                    await page.close();
                    page = null;
                }
                sessionId = null;
                
                result = {
                    success: true,
                    message: 'Session closed'
                };
                break;
                
            default:
                result = {
                    success: false,
                    message: 'Unknown action'
                };
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('[Server] Error:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...');
    if (page && !page.isClosed()) await page.close();
    if (browser) await browser.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log('[Server] Ready for browser control');
});