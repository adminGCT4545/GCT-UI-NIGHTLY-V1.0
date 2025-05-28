// Browser AI Module - Natural language processing for browser control
const BrowserAI = (function() {
    'use strict';
    
    // Module state
    let isInitialized = false;
    let aiModel = null;
    let commandHistory = [];
    
    // Natural language patterns for browser actions
    const nlPatterns = {
        navigation: [
            { pattern: /(?:go to|open|navigate to|visit)\s+(.+)/i, action: 'launch' },
            { pattern: /(?:search for|google|look up)\s+(.+)/i, action: 'search' },
            { pattern: /(?:refresh|reload)(?:\s+the\s+page)?/i, action: 'refresh' },
            { pattern: /(?:go\s+)?back/i, action: 'back' },
            { pattern: /(?:go\s+)?forward/i, action: 'forward' }
        ],
        interaction: [
            { pattern: /click(?:\s+on)?\s+(?:the\s+)?(.+)/i, action: 'click' },
            { pattern: /(?:type|enter|input|fill in)\s+["']?(.+?)["']?(?:\s+in(?:to)?\s+(.+))?/i, action: 'type' },
            { pattern: /scroll\s+(up|down)(?:\s+(\d+)\s+times)?/i, action: 'scroll' },
            { pattern: /(?:take a\s+)?screenshot/i, action: 'screenshot' },
            { pattern: /close(?:\s+the)?\s+(?:browser|tab|window)/i, action: 'close' }
        ],
        forms: [
            { pattern: /(?:fill|complete)\s+(?:the\s+)?form/i, action: 'fill_form' },
            { pattern: /(?:submit|send)\s+(?:the\s+)?form/i, action: 'submit_form' },
            { pattern: /select\s+["']?(.+?)["']?\s+(?:from|in)\s+(?:the\s+)?(.+)/i, action: 'select' }
        ],
        smart: [
            { pattern: /(?:find|locate|show me)\s+(?:the\s+)?(.+)\s+(?:button|link|field|input)/i, action: 'find_element' },
            { pattern: /(?:what|which)\s+(?:buttons?|links?|fields?)\s+(?:are|is)\s+(?:on\s+)?(?:the\s+)?(?:page|screen|visible)/i, action: 'detect_elements' },
            { pattern: /(?:help|what can i do|show commands)/i, action: 'help' }
        ]
    };
    
    // Common element descriptors
    const elementDescriptors = {
        button: ['button', 'btn', 'submit', 'save', 'cancel', 'ok', 'continue', 'next', 'previous', 'back', 'login', 'sign in', 'register', 'search'],
        input: ['input', 'field', 'textbox', 'search box', 'username', 'password', 'email', 'name', 'address', 'phone'],
        link: ['link', 'url', 'href', 'navigation', 'menu item'],
        dropdown: ['dropdown', 'select', 'combo box', 'list', 'menu', 'options']
    };
    
    // Initialize the module
    function init() {
        if (isInitialized) return;
        
        console.log('[BrowserAI] Initializing...');
        
        // Set up chat integration
        setupChatIntegration();
        
        // Load AI model if available
        loadAIModel();
        
        isInitialized = true;
        console.log('[BrowserAI] Initialization complete');
    }
    
    // Set up chat integration
    function setupChatIntegration() {
        // Listen for chat messages
        window.addEventListener('chatMessage', handleChatMessage);
        
        // Add browser control context to chat
        if (window.ChatContext) {
            window.ChatContext.addContext('browser', getBrowserContext);
        }
    }
    
    // Load AI model (if LM Studio is available)
    function loadAIModel() {
        // Check if LM Studio is configured
        try {
            const lmStudioUrl = window.config?.get?.('API_URL') || window.API_URL;
            if (lmStudioUrl) {
                aiModel = {
                    url: lmStudioUrl,
                    model: 'llama-3.2-3b-instruct'
                };
                console.log('[BrowserAI] AI model configured:', aiModel);
            }
        } catch (error) {
            console.warn('[BrowserAI] Could not load AI model config:', error);
        }
    }
    
    // Handle chat messages
    async function handleChatMessage(event) {
        const { message, fromUser } = event.detail;
        
        if (!fromUser) return;
        
        // Check if message is browser-related
        const command = parseNaturalLanguage(message);
        if (command) {
            console.log('[BrowserAI] Parsed command:', command);
            
            // Execute the command
            await executeBrowserCommand(command);
            
            // Add to history
            commandHistory.push({
                message,
                command,
                timestamp: Date.now()
            });
        }
    }
    
    // Parse natural language input
    function parseNaturalLanguage(input) {
        input = input.trim();
        
        // Check each pattern category
        for (const [category, patterns] of Object.entries(nlPatterns)) {
            for (const { pattern, action } of patterns) {
                const match = input.match(pattern);
                if (match) {
                    return parseCommandFromMatch(action, match, input);
                }
            }
        }
        
        // Try AI parsing if available
        if (aiModel) {
            return parseWithAI(input);
        }
        
        return null;
    }
    
    // Parse command from regex match
    function parseCommandFromMatch(action, match, originalInput) {
        const command = { action, params: {} };
        
        switch (action) {
            case 'launch':
                command.params.url = normalizeUrl(match[1]);
                break;
                
            case 'search':
                command.params.query = match[1];
                command.params.url = `https://www.google.com/search?q=${encodeURIComponent(match[1])}`;
                command.action = 'launch';
                break;
                
            case 'click':
                command.params.element = match[1];
                command.needsElementDetection = true;
                break;
                
            case 'type':
                command.params.text = match[1];
                if (match[2]) {
                    command.params.element = match[2];
                    command.needsElementDetection = true;
                }
                break;
                
            case 'scroll':
                command.params.direction = match[1];
                command.params.times = match[2] ? parseInt(match[2]) : 1;
                break;
                
            case 'select':
                command.params.option = match[1];
                command.params.element = match[2];
                command.needsElementDetection = true;
                break;
                
            case 'find_element':
                command.params.element = match[1];
                break;
        }
        
        return command;
    }
    
    // Parse with AI (placeholder for now)
    async function parseWithAI(input) {
        // In a real implementation, this would send the input to the AI model
        // For now, return null
        console.log('[BrowserAI] AI parsing not yet implemented for:', input);
        return null;
    }
    
    // Execute browser command
    async function executeBrowserCommand(command) {
        console.log('[BrowserAI] Executing command:', command);
        
        // Check if browser is active
        if (!window.BrowserControlUI?.isActive()) {
            // Auto-launch browser if needed
            if (command.action === 'launch' || command.action === 'search') {
                // Continue with launch
            } else {
                showMessage('Please open a browser first. Try saying "open google.com"');
                return;
            }
        }
        
        // Handle element detection if needed
        if (command.needsElementDetection) {
            const element = await detectElement(command.params.element);
            if (element) {
                command.params.coordinate = `${element.x},${element.y}`;
                delete command.params.element;
            } else {
                showMessage(`Could not find element: ${command.params.element}`);
                return;
            }
        }
        
        // Execute the action
        try {
            const result = await window.BrowserControlUI.executeAction(command.action, command.params);
            if (result.success) {
                showMessage(`✓ ${getSuccessMessage(command)}`);
            } else {
                showMessage(`✗ ${result.message || 'Action failed'}`);
            }
        } catch (error) {
            console.error('[BrowserAI] Execution error:', error);
            showMessage(`Error: ${error.message}`);
        }
    }
    
    // Detect element on page
    async function detectElement(description) {
        // Use BrowserActions element detection if available
        if (window.BrowserActions?.detectElements) {
            const elements = window.BrowserActions.detectElements();
            
            // Find best match for description
            const match = findBestElementMatch(description, elements);
            if (match) {
                // Highlight the element
                window.BrowserActions.highlightElement(match.coords.x, match.coords.y);
                return match.coords;
            }
        }
        
        // Fallback to coordinate guessing
        return guessElementCoordinates(description);
    }
    
    // Find best element match
    function findBestElementMatch(description, elements) {
        description = description.toLowerCase();
        
        // Check all element types
        for (const [type, items] of Object.entries(elements)) {
            for (const item of items) {
                if (item.text && item.text.toLowerCase().includes(description)) {
                    return item;
                }
                if (item.placeholder && item.placeholder.toLowerCase().includes(description)) {
                    return item;
                }
            }
        }
        
        // Check element descriptors
        for (const [type, descriptors] of Object.entries(elementDescriptors)) {
            if (descriptors.some(d => description.includes(d))) {
                // Return first element of that type
                if (elements[type + 's'] && elements[type + 's'].length > 0) {
                    return elements[type + 's'][0];
                }
            }
        }
        
        return null;
    }
    
    // Guess element coordinates based on common patterns
    function guessElementCoordinates(description) {
        description = description.toLowerCase();
        
        // Common element positions
        const positions = {
            'search': { x: 450, y: 300 },
            'login': { x: 850, y: 50 },
            'submit': { x: 450, y: 400 },
            'cancel': { x: 350, y: 400 },
            'menu': { x: 50, y: 50 },
            'settings': { x: 850, y: 50 }
        };
        
        for (const [key, coords] of Object.entries(positions)) {
            if (description.includes(key)) {
                return coords;
            }
        }
        
        // Default to center
        return { x: 450, y: 300 };
    }
    
    // Get browser context for chat
    function getBrowserContext() {
        const isActive = window.BrowserControlUI?.isActive();
        const currentUrl = window.BrowserControlUI?.getCurrentUrl?.() || 'none';
        
        return {
            browserActive: isActive,
            currentUrl: currentUrl,
            capabilities: [
                'open websites',
                'click elements',
                'type text',
                'take screenshots',
                'scroll pages'
            ]
        };
    }
    
    // Normalize URL
    function normalizeUrl(url) {
        url = url.trim();
        
        // Add protocol if missing
        if (!url.match(/^https?:\/\//)) {
            // Check for common domains
            if (url.includes('.com') || url.includes('.org') || url.includes('.net')) {
                url = 'https://' + url;
            } else {
                // Assume it's a search query
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        
        return url;
    }
    
    // Get success message for command
    function getSuccessMessage(command) {
        switch (command.action) {
            case 'launch':
                return `Opened ${command.params.url}`;
            case 'click':
                return 'Clicked successfully';
            case 'type':
                return `Typed "${command.params.text}"`;
            case 'scroll':
                return `Scrolled ${command.params.direction}`;
            case 'screenshot':
                return 'Screenshot captured';
            case 'close':
                return 'Browser closed';
            default:
                return 'Action completed';
        }
    }
    
    // Show message to user
    function showMessage(message) {
        // Add to chat if possible
        if (window.addMessage) {
            window.addMessage(message, false);
        } else {
            console.log('[BrowserAI]', message);
        }
    }
    
    // Get command suggestions
    function getCommandSuggestions(partial) {
        const suggestions = [];
        
        // Common commands
        const commonCommands = [
            'open google.com',
            'search for [query]',
            'click the [button name]',
            'type "[text]" in the search box',
            'take a screenshot',
            'scroll down',
            'go back',
            'close browser'
        ];
        
        // Filter based on partial input
        if (partial) {
            return commonCommands.filter(cmd => 
                cmd.toLowerCase().includes(partial.toLowerCase())
            );
        }
        
        return commonCommands;
    }
    
    // Analyze page for automation opportunities
    function analyzePageForAutomation() {
        // This would analyze the current page and suggest automations
        const suggestions = [];
        
        // Check for common patterns
        if (window.location.hostname.includes('google')) {
            suggestions.push({
                description: 'Search for information',
                command: 'search for [your query]'
            });
        }
        
        // Check for forms
        const hasForms = document.querySelectorAll('form').length > 0;
        if (hasForms) {
            suggestions.push({
                description: 'Fill out the form',
                command: 'fill the form with my information'
            });
        }
        
        return suggestions;
    }
    
    // Check if a message is a browser command
    function isBrowserCommand(message) {
        if (!message || typeof message !== 'string') return false;
        
        const lowerMessage = message.toLowerCase();
        
        // Browser-related keywords
        const browserKeywords = [
            'open', 'go to', 'navigate', 'visit', 'browse',
            'click', 'tap', 'press', 'select',
            'type', 'enter', 'fill', 'input',
            'scroll', 'page down', 'page up',
            'screenshot', 'capture', 'save image',
            'search for', 'find', 'look for',
            'close tab', 'close browser', 'back', 'forward',
            'refresh', 'reload'
        ];
        
        // Check if message contains browser keywords
        return browserKeywords.some(keyword => lowerMessage.includes(keyword));
    }
    
    // Convert parsed action to browser command
    function toBrowserCommand(parsedAction) {
        if (!parsedAction) return null;
        
        const actionType = parsedAction.action || parsedAction.type;
        
        switch (actionType) {
            case 'navigate':
                return {
                    command: 'browse',
                    args: [parsedAction.params?.url || parsedAction.url],
                    pending: false
                };
            case 'click':
                return {
                    command: 'click',
                    args: [parsedAction.params?.x || 100, parsedAction.params?.y || 100],
                    pending: false
                };
            case 'type':
                return {
                    command: 'type',
                    args: [parsedAction.params?.text || parsedAction.text],
                    pending: false
                };
            case 'screenshot':
                return {
                    command: 'screenshot',
                    args: [],
                    pending: false
                };
            case 'scroll':
                return {
                    command: 'scroll',
                    args: [parsedAction.params?.direction || 'down'],
                    pending: false
                };
            default:
                return {
                    command: actionType,
                    args: [],
                    pending: true  // Mark as pending for unsupported actions
                };
        }
    }

    // Public API
    return {
        init,
        parseNaturalLanguage,
        executeBrowserCommand,
        getCommandSuggestions,
        analyzePageForAutomation,
        detectElement,
        isBrowserCommand,
        toBrowserCommand
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', BrowserAI.init);
} else {
    BrowserAI.init();
}

// Export for global access
window.BrowserAI = BrowserAI;