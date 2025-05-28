// Browser Control Ultimate - Complete fix for all button functionality
(function() {
    'use strict';
    
    console.log('[BrowserUltimate] Initializing ultimate browser control...');
    
    // Configuration
    const BROWSER_SERVER_URL = 'http://localhost:3456';
    const LLM_API_URL = 'http://192.168.1.7:4545';
    const LLM_MODEL = 'llama-3.2-3b-instruct';
    let sessionActive = false;
    let sessionId = null;
    let panelInitialized = false;
    let llmEnabled = false;
    let commandPreviewEnabled = true;
    
    // Helper to ensure valid URL
    function ensureValidUrl(url) {
        if (!url || url.trim() === '') return 'https://google.com';
        
        url = url.trim();
        
        // Add protocol if missing
        if (!url.match(/^https?:\/\//)) {
            url = 'https://' + url;
        }
        
        return url;
    }
    
    // Enhanced logging with UI updates and error handling
    function log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[BrowserUltimate] ${message}`);
        
        try {
            // Check if panel is initialized before updating UI
            const consoleOutput = document.getElementById('browser-console-output');
            if (consoleOutput) {
                updateConsoleOutput(message, type, timestamp);
            }
        } catch (error) {
            console.error('[BrowserUltimate] Error updating console:', error);
        }
    }
    
    // Console messages storage for filtering
    const consoleMessages = [];
    
    // Update console output UI
    function updateConsoleOutput(message, type = 'info', timestamp = null) {
        const consoleOutput = document.getElementById('browser-console-output');
        if (!consoleOutput) return;
        
        if (!timestamp) timestamp = new Date().toLocaleTimeString();
        
        // Store message for filtering
        consoleMessages.push({ message, type, timestamp });
        
        const entry = document.createElement('div');
        const colors = {
            error: '#ff6b6b',
            success: '#51cf66',
            info: '#74c0fc',
            warning: '#fbbf24'
        };
        
        entry.className = `console-entry console-${type}`;
        entry.style.cssText = `
            margin: 3px 0;
            padding: 5px 8px;
            font-size: 12px;
            font-family: 'Consolas', 'Monaco', monospace;
            color: ${colors[type] || colors.info};
            border-left: 3px solid ${colors[type] || colors.info};
            background: rgba(255,255,255,0.02);
        `;
        
        entry.innerHTML = `<span style="opacity: 0.6">[${timestamp}]</span> ${message}`;
        entry.dataset.type = type;
        entry.dataset.message = message.toLowerCase();
        consoleOutput.appendChild(entry);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        // Limit entries
        while (consoleOutput.children.length > 100) {
            consoleOutput.removeChild(consoleOutput.firstChild);
            consoleMessages.shift();
        }
    }
    
    // Setup LLM controls
    function setupLLMControls() {
        const llmToggle = document.getElementById('browser-llm-toggle');
        const testBtn = document.getElementById('browser-test-llm');
        
        if (llmToggle) {
            llmToggle.checked = llmEnabled;
            llmToggle.addEventListener('change', (e) => {
                llmEnabled = e.target.checked;
                log(`LLM integration ${llmEnabled ? 'enabled' : 'disabled'}`, 'info');
            });
        }
        
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                testBtn.disabled = true;
                testBtn.textContent = 'Testing...';
                
                try {
                    const response = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: LLM_MODEL,
                            messages: [{ role: 'user', content: 'Say hello' }],
                            max_tokens: 10,
                            temperature: 0.7
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const reply = data.choices[0].message.content;
                        log(`LLM test successful! Response: "${reply}"`, 'success');
                        addToHistory('LLM Test', `Connected to ${LLM_API_URL}`, true);
                    } else {
                        const errorText = await response.text();
                        log(`LLM test failed: ${response.status} ${response.statusText}`, 'error');
                        log(`Error details: ${errorText}`, 'error');
                        addToHistory('LLM Test', `Failed: ${response.status}`, false);
                    }
                } catch (error) {
                    log(`LLM connection error: ${error.message}`, 'error');
                    log(`Make sure LM Studio is running on ${LLM_API_URL}`, 'warning');
                    addToHistory('LLM Test', `Connection error: ${error.message}`, false);
                }
                
                testBtn.disabled = false;
                testBtn.textContent = 'Test LLM Connection';
            });
        }
    }
    
    // Setup console controls
    function setupConsoleControls() {
        // Filter input
        const filterInput = document.getElementById('browser-console-filter');
        const typeFilter = document.getElementById('browser-console-type-filter');
        
        if (filterInput) {
            filterInput.addEventListener('input', filterConsole);
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', filterConsole);
        }
        
        // Clear button
        const clearBtn = document.getElementById('browser-console-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const consoleOutput = document.getElementById('browser-console-output');
                if (consoleOutput) {
                    consoleOutput.innerHTML = '';
                    consoleMessages.length = 0;
                    log('Console cleared', 'info');
                }
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('browser-console-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportConsoleLogs);
        }
    }
    
    // Filter console messages
    function filterConsole() {
        const filterText = document.getElementById('browser-console-filter')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('browser-console-type-filter')?.value || 'all';
        const entries = document.querySelectorAll('#browser-console-output .console-entry');
        
        entries.forEach(entry => {
            const messageMatch = !filterText || entry.dataset.message.includes(filterText);
            const typeMatch = typeFilter === 'all' || entry.dataset.type === typeFilter;
            
            entry.style.display = messageMatch && typeMatch ? 'block' : 'none';
        });
    }
    
    // Export console logs
    function exportConsoleLogs() {
        const logs = consoleMessages.map(msg => 
            `[${msg.timestamp}] [${msg.type.toUpperCase()}] ${msg.message}`
        ).join('\n');
        
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `browser-console-${new Date().toISOString().slice(0, 10)}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        log('Console logs exported', 'success');
    }
    
    // Enhanced history tracking
    function addToHistory(action, details = '', success = true) {
        const historyOutput = document.getElementById('browser-action-history');
        if (!historyOutput) return;
        
        const entry = document.createElement('div');
        entry.style.cssText = `
            margin: 3px 0;
            padding: 8px;
            font-size: 12px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: ${success ? 'rgba(52, 211, 153, 0.1)' : 'rgba(252, 165, 165, 0.1)'};
        `;
        
        const text = document.createElement('div');
        text.innerHTML = `
            <strong>${action}</strong>
            ${details ? `<span style="color: #999; margin-left: 8px;">${details}</span>` : ''}
        `;
        
        const status = document.createElement('div');
        status.style.cssText = 'font-size: 14px; font-weight: bold;';
        status.textContent = success ? '✓' : '✗';
        status.style.color = success ? '#51cf66' : '#ff6b6b';
        
        entry.appendChild(text);
        entry.appendChild(status);
        
        historyOutput.insertBefore(entry, historyOutput.firstChild);
        
        // Limit entries
        while (historyOutput.children.length > 50) {
            historyOutput.removeChild(historyOutput.lastChild);
        }
    }
    
    // Panel management
    function openBrowserPanel() {
        console.log('[BrowserUltimate] Opening browser control panel...');
        
        // Close other panels
        const panels = ['settings-panel', 'notes-panel', 'analytics-panel'];
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel && panel.classList.contains('active')) {
                panel.classList.remove('active');
            }
        });
        
        // Remove active state from other nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Open browser panel
        const browserPanel = document.getElementById('browser-control-panel');
        const browserNav = document.getElementById('browser-nav');
        
        if (browserPanel && browserNav) {
            browserPanel.classList.add('active');
            browserNav.classList.add('active');
            
            log('Panel opened', 'success');
            
            // Initialize panel if first time
            if (!panelInitialized) {
                setTimeout(() => {
                    initializePanel();
                    panelInitialized = true;
                }, 100);
            }
        }
    }
    
    function closeBrowserPanel() {
        const browserPanel = document.getElementById('browser-control-panel');
        const browserNav = document.getElementById('browser-nav');
        
        if (browserPanel) {
            browserPanel.classList.remove('active');
        }
        if (browserNav) {
            browserNav.classList.remove('active');
        }
        
        log('Panel closed', 'info');
    }
    
    // Show command preview
    async function showCommandPreview(action, params = {}) {
        return new Promise((resolve) => {
            // Create preview modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #1e1e1e;
                border: 1px solid #3e3e3e;
                border-radius: 8px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                min-width: 300px;
            `;
            
            // Format parameters for display
            let paramStr = '';
            if (params && Object.keys(params).length > 0) {
                paramStr = Object.entries(params)
                    .map(([key, value]) => `<div style="margin-left: 20px;">• ${key}: ${value}</div>`)
                    .join('');
            }
            
            modal.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #e8e8e8;">Command Preview</h3>
                <div style="margin-bottom: 15px;">
                    <div style="color: #74c0fc; font-weight: bold;">Action: ${action}</div>
                    ${paramStr}
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="preview-cancel" style="padding: 6px 12px; background: #3e3e3e; border: none; border-radius: 4px; color: #e8e8e8; cursor: pointer;">
                        Cancel
                    </button>
                    <button id="preview-confirm" style="padding: 6px 12px; background: #0578ff; border: none; border-radius: 4px; color: white; cursor: pointer;">
                        Execute
                    </button>
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #999;">
                    <label>
                        <input type="checkbox" id="preview-disable" style="margin-right: 5px;">
                        Don't show preview again
                    </label>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event handlers
            document.getElementById('preview-cancel').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
            
            document.getElementById('preview-confirm').onclick = () => {
                if (document.getElementById('preview-disable').checked) {
                    commandPreviewEnabled = false;
                    log('Command preview disabled', 'info');
                }
                document.body.removeChild(modal);
                resolve(true);
            };
            
            // Close on Escape
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', escHandler);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }
    
    // Execute browser action with enhanced error handling
    async function executeBrowserAction(action, params = {}) {
        // Show preview if enabled (except for certain actions)
        const skipPreviewActions = ['screenshot', 'launch', 'close'];
        if (commandPreviewEnabled && !skipPreviewActions.includes(action)) {
            const shouldExecute = await showCommandPreview(action, params);
            if (!shouldExecute) {
                log('Action cancelled by user', 'info');
                return;
            }
        }
        
        log(`Executing: ${action}`, 'info');
        
        // Verify UI elements exist
        const consoleOutput = document.getElementById('browser-console-output');
        const historyOutput = document.getElementById('browser-action-history');
        
        if (!consoleOutput || !historyOutput) {
            console.error('[BrowserUltimate] Required UI elements not found');
            return;
        }
        
        try {
            const response = await fetch(`${BROWSER_SERVER_URL}/browser/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, params, sessionId })
            });
            
            if (!response.ok) throw new Error('Server error');
            
            const result = await response.json();
            
            if (result.success) {
                log(`${action} successful`, 'success');
                
                if (result.screenshot) {
                    displayScreenshot(result.screenshot);
                    // Send screenshot to LLM for analysis if enabled
                    if (llmEnabled) {
                        analyzeScreenshotWithLLM(result.screenshot);
                    }
                }
                
                if (action === 'launch') {
                    sessionActive = true;
                    sessionId = result.sessionId || Date.now().toString();
                    enableActionButtons(true);
                    updateSessionInfo(params.url || 'https://google.com');
                } else if (action === 'close') {
                    sessionActive = false;
                    sessionId = null;
                    enableActionButtons(false);
                    updateSessionInfo('');
                }
                
                addToHistory(action, JSON.stringify(params), true);
            } else {
                throw new Error(result.error || 'Action failed');
            }
            
            return result;
        } catch (error) {
            log(`${action} failed: ${error.message}`, 'error');
            
            // Fallback to simulation
            return simulateAction(action, params);
        }
    }
    
    // Simulation mode
    function simulateAction(action, params) {
        log(`Simulating: ${action}`, 'warning');
        
        const actions = {
            launch: () => {
                sessionActive = true;
                enableActionButtons(true);
                updateSessionInfo(params.url || 'https://google.com');
                displayScreenshot('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
                addToHistory('Launch', params.url || 'https://google.com', true);
                return { success: true, message: 'Browser launched (simulation)' };
            },
            click: () => {
                addToHistory('Click', `at (${params.x}, ${params.y})`, true);
                return { success: true };
            },
            type: () => {
                addToHistory('Type', params.text || '', true);
                return { success: true };
            },
            screenshot: () => {
                displayScreenshot('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
                addToHistory('Screenshot', 'Captured', true);
                return { success: true };
            },
            scroll: () => {
                addToHistory('Scroll', params.direction || 'down', true);
                return { success: true };
            },
            close: () => {
                sessionActive = false;
                enableActionButtons(false);
                updateSessionInfo('');
                displayScreenshot('');
                addToHistory('Close', 'Browser closed', true);
                return { success: true };
            }
        };
        
        const handler = actions[action];
        if (handler) {
            return handler();
        } else {
            addToHistory(action, 'Unknown action', false);
            return { success: false, error: 'Unknown action' };
        }
    }
    
    // LLM Integration for screenshot analysis
    async function analyzeScreenshotWithLLM(screenshot) {
        try {
            log('Analyzing screenshot with LLM...', 'info');
            const response = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: LLM_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are analyzing a browser screenshot. Describe what you see and identify interactive elements like buttons, links, and forms. Keep your response concise.'
                        },
                        {
                            role: 'user',
                            content: 'Analyze this screenshot and tell me what interactive elements are visible.'
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const analysis = data.choices[0].message.content;
                log(`LLM Analysis: ${analysis}`, 'success');
                addToHistory('LLM Analysis', analysis, true);
            } else {
                log('LLM analysis failed: ' + response.statusText, 'warning');
            }
        } catch (error) {
            log('LLM analysis error: ' + error.message, 'warning');
        }
    }
    
    // Store button references after cloning
    const buttonRefs = {};
    
    // UI helpers
    function displayScreenshot(base64Data) {
        const preview = document.getElementById('browser-preview-image');
        if (preview) {
            if (base64Data) {
                preview.src = base64Data;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }
    }
    
    function enableActionButtons(enabled) {
        log(`Setting action buttons enabled: ${enabled}`, 'info');
        
        const buttons = [
            'browser-click-btn',
            'browser-type-btn',
            'browser-screenshot-btn',
            'browser-scroll-up-btn',
            'browser-scroll-down-btn',
            'browser-close-btn',
            'browser-zoom-in',
            'browser-zoom-out',
            'browser-zoom-reset',
            'browser-detect-forms-btn',
            'browser-detect-elements-btn'
        ];
        
        buttons.forEach(id => {
            // Use stored reference first, fallback to getElementById
            const btn = buttonRefs[id] || document.getElementById(id);
            if (btn) {
                btn.disabled = !enabled;
                log(`Button ${id} ${enabled ? 'enabled' : 'disabled'}`, 'info');
            }
        });
    }
    
    function updateSessionInfo(url) {
        const sessionInfo = document.getElementById('browser-session-info');
        if (sessionInfo) {
            sessionInfo.innerHTML = sessionActive ? 
                `<span style="color: #51cf66;">● Active</span> - ${url}` :
                '<span style="color: #ff6b6b;">● Inactive</span>';
        }
    }
    
    // Button click handlers
    function handleLaunch(e) {
        if (e) e.preventDefault();
        log('Launch button clicked');
        
        const urlInput = document.getElementById('browser-url-input');
        const url = ensureValidUrl(urlInput ? urlInput.value : '');
        
        log(`Launching browser with URL: ${url}`);
        executeBrowserAction('launch', { url });
    }
    
    function handleClick(e) {
        if (e) e.preventDefault();
        log('Click button clicked');
        
        const x = prompt('Enter X coordinate:', '100');
        const y = prompt('Enter Y coordinate:', '100');
        
        if (x && y) {
            executeBrowserAction('click', { x: parseInt(x), y: parseInt(y) });
        }
    }
    
    function handleType(e) {
        if (e) e.preventDefault();
        log('Type button clicked');
        
        const text = prompt('Enter text to type:');
        if (text !== null) {
            executeBrowserAction('type', { text });
        }
    }
    
    function handleScreenshot(e) {
        if (e) e.preventDefault();
        log('Screenshot button clicked');
        executeBrowserAction('screenshot');
    }
    
    function handleScrollUp(e) {
        if (e) e.preventDefault();
        log('Scroll up button clicked');
        executeBrowserAction('scroll', { direction: 'up', amount: 300 });
    }
    
    function handleScrollDown(e) {
        if (e) e.preventDefault();
        log('Scroll down button clicked');
        executeBrowserAction('scroll', { direction: 'down', amount: 300 });
    }
    
    function handleClose(e) {
        if (e) e.preventDefault();
        log('Close browser button clicked');
        executeBrowserAction('close');
    }
    
    // Form detection and auto-fill
    async function handleDetectForms(e) {
        if (e) e.preventDefault();
        log('Detecting forms...');
        
        try {
            const response = await fetch(`${BROWSER_SERVER_URL}/browser/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'detectForms', params: {}, sessionId })
            });
            
            if (!response.ok) throw new Error('Server error');
            
            const result = await response.json();
            
            if (result.success && result.forms) {
                displayDetectedForms(result.forms);
                log(`Detected ${result.forms.length} form fields`, 'success');
            } else {
                log('No forms detected', 'warning');
            }
        } catch (error) {
            log('Form detection failed: ' + error.message, 'error');
        }
    }
    
    function displayDetectedForms(forms) {
        const formsSection = document.getElementById('browser-forms-section');
        const formsList = document.getElementById('browser-forms-list');
        
        if (!formsSection || !formsList) return;
        
        formsSection.style.display = 'block';
        formsList.innerHTML = '';
        
        if (forms.length === 0) {
            formsList.innerHTML = '<p style="color: #999;">No form fields found on this page</p>';
            return;
        }
        
        forms.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.style.cssText = 'margin-bottom: 10px; padding: 8px; background: #1e1e1e; border-radius: 4px;';
            
            const label = document.createElement('label');
            label.style.cssText = 'display: block; color: #74c0fc; font-size: 12px; margin-bottom: 4px;';
            label.textContent = `${field.label} (${field.type})`;
            
            const inputGroup = document.createElement('div');
            inputGroup.style.cssText = 'display: flex; gap: 5px;';
            
            const input = document.createElement('input');
            input.type = field.type === 'password' ? 'password' : 'text';
            input.value = field.value || '';
            input.placeholder = field.placeholder || `Enter ${field.label}`;
            input.style.cssText = 'flex: 1; padding: 5px; background: #2a2a2a; border: 1px solid #444; color: #e8e8e8; border-radius: 4px;';
            
            // Add smart suggestions based on field type/name
            const suggestion = getSmartSuggestion(field);
            if (suggestion && !field.value) {
                input.value = suggestion;
            }
            
            const fillBtn = document.createElement('button');
            fillBtn.textContent = 'Fill';
            fillBtn.style.cssText = 'padding: 5px 10px; background: #0578ff; border: none; border-radius: 4px; color: white; cursor: pointer;';
            fillBtn.onclick = () => fillFormField(field.id, input.value);
            
            inputGroup.appendChild(input);
            inputGroup.appendChild(fillBtn);
            
            fieldDiv.appendChild(label);
            fieldDiv.appendChild(inputGroup);
            formsList.appendChild(fieldDiv);
        });
    }
    
    function getSmartSuggestion(field) {
        const lowerLabel = field.label.toLowerCase();
        const lowerName = (field.name || '').toLowerCase();
        const lowerType = field.type.toLowerCase();
        
        // Email fields
        if (lowerType === 'email' || lowerLabel.includes('email') || lowerName.includes('email')) {
            return 'user@example.com';
        }
        
        // Name fields
        if (lowerLabel.includes('name') || lowerName.includes('name')) {
            if (lowerLabel.includes('first')) return 'John';
            if (lowerLabel.includes('last')) return 'Doe';
            if (lowerLabel.includes('full')) return 'John Doe';
            return 'John Doe';
        }
        
        // Phone fields
        if (lowerType === 'tel' || lowerLabel.includes('phone') || lowerName.includes('phone')) {
            return '555-1234';
        }
        
        // Date fields
        if (lowerType === 'date') {
            return new Date().toISOString().split('T')[0];
        }
        
        // Password fields
        if (lowerType === 'password') {
            return 'SecurePass123!';
        }
        
        // Address fields
        if (lowerLabel.includes('address') || lowerName.includes('address')) {
            return '123 Main Street';
        }
        
        // City fields
        if (lowerLabel.includes('city') || lowerName.includes('city')) {
            return 'New York';
        }
        
        // Zip/Postal fields
        if (lowerLabel.includes('zip') || lowerLabel.includes('postal') || lowerName.includes('zip')) {
            return '10001';
        }
        
        return null;
    }
    
    async function fillFormField(fieldId, value) {
        if (!value) {
            log('Please enter a value to fill', 'warning');
            return;
        }
        
        try {
            await executeBrowserAction('fillForm', { fieldId, value });
            log(`Filled field: ${fieldId}`, 'success');
        } catch (error) {
            log('Failed to fill field: ' + error.message, 'error');
        }
    }
    
    // Element detection with AI
    async function handleDetectElements(e) {
        if (e) e.preventDefault();
        log('Detecting clickable elements...');
        
        try {
            const response = await fetch(`${BROWSER_SERVER_URL}/browser/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'detectElements', params: {}, sessionId })
            });
            
            if (!response.ok) throw new Error('Server error');
            
            const result = await response.json();
            
            if (result.success && result.elements) {
                displayDetectedElements(result.elements);
                log(`Detected ${result.elements.length} clickable elements`, 'success');
                
                // Use AI to suggest the most likely element to click
                if (llmEnabled && result.elements.length > 0) {
                    suggestElementWithAI(result.elements);
                }
            } else {
                log('No elements detected', 'warning');
            }
        } catch (error) {
            log('Element detection failed: ' + error.message, 'error');
        }
    }
    
    function displayDetectedElements(elements) {
        // Create an overlay on the preview image
        const previewContainer = document.getElementById('browser-preview-container');
        const previewImage = document.getElementById('browser-preview-image');
        
        if (!previewContainer || !previewImage) return;
        
        // Remove existing overlay
        const existingOverlay = document.getElementById('element-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create new overlay
        const overlay = document.createElement('div');
        overlay.id = 'element-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        
        // Add markers for each element
        elements.slice(0, 20).forEach((element, index) => {
            const marker = document.createElement('div');
            marker.style.cssText = `
                position: absolute;
                left: ${(element.x / previewImage.naturalWidth) * 100}%;
                top: ${(element.y / previewImage.naturalHeight) * 100}%;
                width: 24px;
                height: 24px;
                background: #0578ff;
                border: 2px solid white;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
                cursor: pointer;
                pointer-events: auto;
                z-index: 100;
            `;
            marker.textContent = index + 1;
            marker.title = element.text;
            marker.onclick = () => {
                executeBrowserAction('click', { x: element.x, y: element.y });
                log(`Clicked element: ${element.text}`, 'info');
            };
            
            overlay.appendChild(marker);
        });
        
        previewContainer.style.position = 'relative';
        previewContainer.appendChild(overlay);
        
        // Show element list
        showElementList(elements);
    }
    
    function showElementList(elements) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1e1e1e;
            border: 1px solid #3e3e3e;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            max-width: 500px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        modal.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #e8e8e8;">Detected Clickable Elements</h3>
            <div id="elements-list"></div>
            <button onclick="this.parentElement.remove()" style="margin-top: 15px; padding: 6px 12px; background: #3e3e3e; border: none; border-radius: 4px; color: #e8e8e8; cursor: pointer;">
                Close
            </button>
        `;
        
        const list = modal.querySelector('#elements-list');
        elements.slice(0, 20).forEach((element, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'margin-bottom: 8px; padding: 8px; background: #2a2a2a; border-radius: 4px; cursor: pointer;';
            item.innerHTML = `
                <strong style="color: #0578ff;">${index + 1}.</strong> 
                ${element.text} <span style="color: #999;">(${element.type})</span>
            `;
            item.onclick = () => {
                executeBrowserAction('click', { x: element.x, y: element.y });
                modal.remove();
            };
            list.appendChild(item);
        });
        
        document.body.appendChild(modal);
    }
    
    async function suggestElementWithAI(elements) {
        try {
            const elementList = elements.slice(0, 10).map((el, i) => 
                `${i + 1}. ${el.text} (${el.type})`
            ).join('\n');
            
            const response = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: LLM_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are helping to identify the most likely element a user would want to click on a webpage. Suggest the number of the most relevant element.'
                        },
                        {
                            role: 'user',
                            content: `Here are the clickable elements on the page:\n${elementList}\n\nWhich element is most likely to be clicked next? Reply with just the number.`
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 10
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const suggestion = data.choices[0].message.content.trim();
                log(`AI suggests clicking element: ${suggestion}`, 'info');
            }
        } catch (error) {
            log('AI suggestion failed: ' + error.message, 'warning');
        }
    }
    
    // Zoom handlers
    let currentZoom = 100;
    
    function handleZoomIn(e) {
        if (e) e.preventDefault();
        currentZoom = Math.min(currentZoom + 25, 200);
        log(`Zooming in to ${currentZoom}%`);
        setZoom(currentZoom);
        updateZoomDisplay();
    }
    
    function handleZoomOut(e) {
        if (e) e.preventDefault();
        currentZoom = Math.max(currentZoom - 25, 25);
        log(`Zooming out to ${currentZoom}%`);
        setZoom(currentZoom);
        updateZoomDisplay();
    }
    
    function handleZoomReset(e) {
        if (e) e.preventDefault();
        currentZoom = 100;
        log('Resetting zoom to 100%');
        setZoom(100);
        updateZoomDisplay();
    }
    
    function updateZoomDisplay() {
        const previewImage = document.getElementById('browser-preview-image');
        if (previewImage) {
            previewImage.style.transform = `scale(${currentZoom / 100})`;
        }
    }
    
    // Initialize panel controls
    function initializePanel() {
        log('Initializing panel controls...', 'info');
        
        // Ensure console and history elements exist
        const consoleOutput = document.getElementById('browser-console-output');
        const historyOutput = document.getElementById('browser-action-history');
        
        if (!consoleOutput || !historyOutput) {
            console.error('[BrowserUltimate] Required UI elements not found');
            return;
        }
        
        // Clear existing content
        consoleOutput.innerHTML = '';
        historyOutput.innerHTML = '';
        
        // Close button
        const closeBtn = document.querySelector('#browser-control-panel .close-browser-control');
        if (closeBtn) {
            // Remove existing listeners
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            // Add new listener with stopPropagation
            newCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeBrowserPanel();
            });
        }
        
        // Button configuration
        const buttonConfigs = [
            { id: 'browser-launch-btn', handler: handleLaunch, disabled: false },
            { id: 'browser-click-btn', handler: handleClick, disabled: true },
            { id: 'browser-type-btn', handler: handleType, disabled: true },
            { id: 'browser-screenshot-btn', handler: handleScreenshot, disabled: true },
            { id: 'browser-scroll-up-btn', handler: handleScrollUp, disabled: true },
            { id: 'browser-scroll-down-btn', handler: handleScrollDown, disabled: true },
            { id: 'browser-close-btn', handler: handleClose, disabled: true },
            { id: 'browser-zoom-in', handler: handleZoomIn, disabled: true },
            { id: 'browser-zoom-out', handler: handleZoomOut, disabled: true },
            { id: 'browser-zoom-reset', handler: handleZoomReset, disabled: true },
            { id: 'browser-detect-forms-btn', handler: handleDetectForms, disabled: true },
            { id: 'browser-detect-elements-btn', handler: handleDetectElements, disabled: true }
        ];
        
        // Clear existing button references
        Object.keys(buttonRefs).forEach(key => delete buttonRefs[key]);
        
        // Attach handlers with proper event handling
        buttonConfigs.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                // Create new button to clear all existing listeners
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Add single click handler with stopPropagation
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    config.handler(e);
                });
                
                // Set initial state
                newBtn.disabled = config.disabled;
                
                // Store reference to new button
                buttonRefs[config.id] = newBtn;
                
                log(`${config.id} handler attached`, 'success');
            } else {
                log(`Button ${config.id} not found!`, 'error');
            }
        });
        
        log('All buttons configured', 'success');
        
        // Check server connection
        checkServer();
        
        // Add initial history entry
        addToHistory('System', 'Browser control initialized', true);
        
        // Setup suite button
        setupSuiteButton();
        
        // Setup console controls
        setupConsoleControls();
        
        // Setup LLM controls
        setupLLMControls();
    }
    
    // Check server status
    async function checkServer() {
        try {
            const response = await fetch(`${BROWSER_SERVER_URL}/health`);
            const data = await response.json();
            
            if (data.status === 'ok') {
                log('Server connected ✓', 'success');
                return true;
            }
        } catch (error) {
            log('Server not available - running in simulation mode', 'warning');
        }
        return false;
    }
    
    // Setup Open Suite button
    function setupSuiteButton() {
        const openSuiteBtn = document.querySelector('.browser-suite-cta .open-suite-btn');
        if (openSuiteBtn) {
            openSuiteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.BrowserSuite) {
                    window.BrowserSuite.openSuite();
                    log('Opening browser suite...', 'info');
                } else {
                    log('Browser suite not initialized!', 'error');
                }
            });
            log('Suite button handler attached', 'success');
        } else {
            log('Suite button not found!', 'error');
        }
    }
    
    // Get session info for suite
    function getSessionInfo() {
        return {
            active: sessionActive,
            sessionId: sessionId,
            url: document.getElementById('browser-url-input')?.value || '',
            screenshot: document.getElementById('browser-preview-image')?.src || null
        };
    }
    
    // Get screenshot
    function getScreenshot() {
        return document.getElementById('browser-preview-image')?.src || null;
    }
    
    // Get console output
    function getConsoleOutput() {
        const consoleEl = document.getElementById('browser-console-output');
        return consoleEl ? consoleEl.innerHTML : '';
    }
    
    // Action hook for recording
    let actionCallback = null;
    function setActionCallback(callback) {
        actionCallback = callback;
    }
    
    // Execute action wrapper for recording
    const originalExecuteAction = executeBrowserAction;
    executeBrowserAction = async function(action, params = {}) {
        // Call hook if set
        if (actionCallback) {
            actionCallback({ type: action, params });
        }
        
        // Execute original action
        return await originalExecuteAction(action, params);
    };
    
    // Initialize navigation
    function setupNavigation() {
        console.log('[BrowserUltimate] Setting up navigation...');
        
        const browserNav = document.getElementById('browser-nav');
        if (!browserNav) {
            console.error('[BrowserUltimate] Browser nav item not found!');
            setTimeout(setupNavigation, 100);
            return;
        }
        
        // Remove any existing handlers without cloning
        browserNav.onclick = null;
        
        // Add click handler directly
        browserNav.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[BrowserUltimate] Browser nav clicked!');
            openBrowserPanel();
        });
        
        // Also add onclick as backup
        browserNav.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[BrowserUltimate] Browser nav onclick fired!');
            openBrowserPanel();
        };
        
        console.log('[BrowserUltimate] Navigation handler attached successfully');
    }
    
    // Initialize
    function initialize() {
        console.log('[BrowserUltimate] Starting initialization...');
        
        // Setup navigation immediately
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupNavigation);
        } else {
            setupNavigation();
        }
        
        // Add click outside handler
        document.addEventListener('click', function(e) {
            const panel = document.getElementById('browser-control-panel');
            const nav = document.getElementById('browser-nav');
            
            if (panel && panel.classList.contains('active')) {
                if (!panel.contains(e.target) && !nav.contains(e.target)) {
                    closeBrowserPanel();
                }
            }
        });
        
        // Add escape key handler
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const panel = document.getElementById('browser-control-panel');
                if (panel && panel.classList.contains('active')) {
                    closeBrowserPanel();
                }
            }
        });
        
        console.log('[BrowserUltimate] Initialization complete');
    }
    
    // Keyboard shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Skip if typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl+B - Open browser control panel
            if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
                e.preventDefault();
                openBrowserPanel();
            }
            
            // Only process other shortcuts if panel is active and session is running
            const panel = document.getElementById('browser-control-panel');
            if (!panel || !panel.classList.contains('active') || !sessionActive) {
                return;
            }
            
            // Ctrl+Shift shortcuts
            if (e.ctrlKey && e.shiftKey) {
                switch(e.key.toLowerCase()) {
                    case 'c': // Screenshot
                        e.preventDefault();
                        handleScreenshot();
                        break;
                    case 's': // Scroll down
                        e.preventDefault();
                        handleScrollDown();
                        break;
                    case 'w': // Scroll up
                        e.preventDefault();
                        handleScrollUp();
                        break;
                    case 'x': // Close browser
                        e.preventDefault();
                        handleClose();
                        break;
                    case '+':
                    case '=': // Zoom in (= key without shift is +)
                        e.preventDefault();
                        handleZoomIn();
                        break;
                    case '-':
                    case '_': // Zoom out
                        e.preventDefault();
                        handleZoomOut();
                        break;
                    case '0': // Reset zoom
                        e.preventDefault();
                        handleZoomReset();
                        break;
                }
            }
        });
        
        log('Keyboard shortcuts initialized', 'info');
    }
    
    // Start initialization
    initialize();
    setupKeyboardShortcuts();
    
    // Zoom control functions
    async function setZoom(zoomLevel) {
        if (!sessionActive) {
            log('No active browser session for zoom', 'error');
            return;
        }
        
        const scale = zoomLevel / 100;
        const baseWidth = 1280;
        const baseHeight = 720;
        
        await executeBrowserAction('setViewport', {
            width: Math.round(baseWidth / scale),
            height: Math.round(baseHeight / scale),
            deviceScaleFactor: scale
        });
    }
    
    // Expose for debugging and suite integration
    window.browserUltimate = {
        open: openBrowserPanel,
        close: closeBrowserPanel,
        log: log,
        executeAction: executeBrowserAction,
        checkServer: checkServer,
        enableButtons: enableActionButtons,
        buttonRefs: buttonRefs,
        getSessionInfo: getSessionInfo,
        getScreenshot: getScreenshot,
        getConsoleOutput: getConsoleOutput,
        onAction: setActionCallback,
        setZoom: setZoom,
        setCommandPreview: (enabled) => {
            commandPreviewEnabled = enabled;
            log(`Command preview ${enabled ? 'enabled' : 'disabled'}`, 'info');
        },
        setLLMEnabled: (enabled) => { 
            llmEnabled = enabled; 
            log(`LLM integration ${enabled ? 'enabled' : 'disabled'}`, 'info');
        },
        testLLM: async () => {
            try {
                const response = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: LLM_MODEL,
                        messages: [{ role: 'user', content: 'Say hello' }],
                        max_tokens: 10
                    })
                });
                const data = await response.json();
                log('LLM test successful: ' + data.choices[0].message.content, 'success');
                return true;
            } catch (error) {
                log('LLM test failed: ' + error.message, 'error');
                return false;
            }
        },
        testButton: (id) => {
            const btn = buttonRefs[id] || document.getElementById(id);
            if (btn) {
                console.log(`Testing ${id}...`);
                console.log(`Button disabled: ${btn.disabled}`);
                console.log(`Button onclick: ${btn.onclick}`);
                btn.click();
            } else {
                console.log(`Button ${id} not found`);
            }
        },
        testUI: () => {
            console.log('Testing UI elements...');
            const consoleOutput = document.getElementById('browser-console-output');
            const historyOutput = document.getElementById('browser-action-history');
            console.log(`Console output element exists: ${!!consoleOutput}`);
            console.log(`History output element exists: ${!!historyOutput}`);
            if (consoleOutput) console.log(`Console children: ${consoleOutput.children.length}`);
            if (historyOutput) console.log(`History children: ${historyOutput.children.length}`);
        }
    };
})();