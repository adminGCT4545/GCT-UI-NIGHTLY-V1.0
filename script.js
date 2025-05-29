// LM Studio API configuration
const Config = (() => {
    let BASE_URL, API_URL, MODELS_URL, MAX_RETRIES, API_TIMEOUT;
    function validateNumber(val, fallback) {
        return typeof val === 'number' && !isNaN(val) && val > 0 ? val : fallback;
    }
    function init() {
        if (window.config && typeof window.config.get === 'function') {
            try {
                BASE_URL = window.config.get('API_URL');
                API_URL = `${BASE_URL}/v1/chat/completions`;
                MODELS_URL = `${BASE_URL}/v1/models`;
                MAX_RETRIES = validateNumber(window.config.get('MAX_RETRIES'), 3);
                API_TIMEOUT = validateNumber(window.config.get('API_TIMEOUT'), 30000);
                if (!BASE_URL) throw new Error('BASE_URL missing');
                return true;
            } catch (error) {
                console.error('Failed to initialize API config:', error);
                return false;
            }
        }
        return false;
    }
    function get() {
        return { BASE_URL, API_URL, MODELS_URL, MAX_RETRIES, API_TIMEOUT };
    }
    return { init, get };
})();

// Initialize API configuration
function initApiConfig() {
    return Config.init();
}

// API connection state
let apiConnected = false;
let connectionCheckInProgress = false;

// System state
let modelStatus = {
    isLoaded: false,
    currentModel: null,
    error: null,
    lastCheck: null
};

// Status check intervals (in milliseconds)
const STATUS_CHECK_INTERVAL = 10000; // 10 seconds
const MODEL_LOAD_TIMEOUT = 60000;    // 1 minute

// KYNSEY Name Response System
function isNameQuestion(message) {
    const namePhrases = [
        'what is your name',
        'what\'s your name',
        'tell me your name',
        'who are you',
        'what are you called',
        'introduce yourself',
        'what should i call you'
    ];
    
    const lowerMessage = message.toLowerCase();
    return namePhrases.some(phrase => lowerMessage.includes(phrase));
}

function getKynseyIntroduction() {
    return `Hello! My name is **KYNSEY**

I'm an advanced AI assistant created by **Green Chip Technology** to provide you with the best possible assistance. Whether you need help with writing, analysis, creative tasks, or technical support, I'm here to help you achieve your goals efficiently and effectively.

Think of me as your intelligent companion, ready to assist with everything from enhancing your notes to solving complex problems. How can I help you today?`;
}

// Thinking animation control for main chat
function showKynseyThinking() {
    const thinkingElement = document.getElementById('kynsey-thinking');
    if (thinkingElement) {
        thinkingElement.classList.remove('hidden');
        thinkingElement.style.display = 'flex';
        console.log('KYNSEY thinking animation shown');
    }
}

function hideKynseyThinking() {
    const thinkingElement = document.getElementById('kynsey-thinking');
    if (thinkingElement) {
        thinkingElement.classList.add('hidden');
        thinkingElement.style.display = 'none';
        console.log('KYNSEY thinking animation hidden');
    }
}

// DOM Elements
let messagesContainer;
let messageInput;
let sendButton;
let settingsPanel;
let settingsButton;
let closeSettingsButton;
let imageUploadModal;
let imageUploadBtn;
let closeImageUploadBtn;
let uploadArea;
let fileInput;
let cancelUploadBtn;
let confirmUploadBtn;

// Chat context configuration
const CONTEXT_CONFIG = {
    maxMessages: 10,
    relevanceThreshold: 0.5,
    sessionTimeout: 30 * 60 * 1000
};

// Chat history with enhanced context tracking
let chatHistory = {
    messages: [],
    currentSession: null,
    sessions: new Map()
};

// Message types for better context understanding
const MessageType = {
    QUESTION: 'question',
    COMMAND: 'command',
    STATEMENT: 'statement',
    CLARIFICATION: 'clarification',
    RESPONSE: 'response',
    SYSTEM: 'system'
};

// Intent detection categories
const INTENT_CATEGORIES = [
    { intent: "ask_question", keywords: ["what", "how", "why", "when", "where", "?"] },
    { intent: "create_note", keywords: ["create note", "new note", "add note"] },
    { intent: "summarize", keywords: ["summarize", "summary", "tl;dr"] },
    { intent: "translate", keywords: ["translate", "translation"] },
    { intent: "code_generation", keywords: ["generate code", "write code", "code for"] },
    { intent: "edit", keywords: ["edit", "update", "change"] },
    { intent: "delete", keywords: ["delete", "remove"] },
    { intent: "browser_control", keywords: ["browse", "open", "navigate", "click", "google", "search", "website", "go to"] }
];

// GCT UI Features Summary
const GCT_UI_FEATURES_SUMMARY = `# GCT UI - Main Features

## 🤖 KYNSEY-Powered Chat
- **Smart Conversations**: Engage with KYNSEY using natural language
- **Context Awareness**: The system maintains conversation context for coherent responses
- **Multiple Response Styles**: Choose between Professional, Concise, Normal, and Creative modes
- **Real-time Streaming**: See responses as they're generated (when enabled)

## 📝 Notes System
- **Markdown Support**: Create rich-text notes with full markdown formatting
- **KYNSEY-Enhanced Writing**: Use KYNSEY to summarize, improve, translate, or continue your notes
- **Smart Tags**: Organize notes with tags for easy filtering and search
- **Split View Editing**: Edit markdown and preview rendered content side-by-side
- **Note Search**: Quickly find notes by title, content, or tags

## 🔊 Voice Features
- **Voice Input**: Dictate messages using your microphone
- **Voice Output**: Have KYNSEY responses read aloud
- **Adjustable Voice Settings**: Choose voice and speaking speed

## ⌨️ Command Hotkeys
- **Command Hotkeys** (Ctrl+K): Quick access to all features
- **Key Shortcuts**: 
  - Ctrl+Enter: Send message
  - Ctrl+/: Focus message input
  - Ctrl+Shift+N: Create new note
  - Ctrl+?: View all shortcuts
  - Esc: Close panels/dialogs

Start exploring by pressing **Ctrl+K** to open command hotkeys or click the **notes icon** in the sidebar.`;

// Global retry function to avoid duplication
async function callApiWithRetry(url, options, retries, backoff = 300) {
    const { MAX_RETRIES } = Config.get();
    if (typeof retries !== 'number' || retries < 0) retries = MAX_RETRIES || 3;
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            if (retries > 0 && (response.status >= 500 || response.status === 429)) {
                console.warn(`API request failed with status ${response.status}. Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return callApiWithRetry(url, options, retries - 1, backoff * 2);
            }
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('API response was not valid JSON');
        }
        if (!data || !Array.isArray(data.choices)) {
            throw new Error('API response missing expected data');
        }
        return data;

    } catch (error) {
        if (retries > 0 && error.message && error.message.includes('Failed to fetch')) {
            console.warn(`Network error: ${error.message}. Retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return callApiWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

function detectIntent(userMessage) {
    const lower = userMessage.toLowerCase();
    for (let i = 0; i < INTENT_CATEGORIES.length; i++) {
        const category = INTENT_CATEGORIES[i];
        for (let j = 0; j < category.keywords.length; j++) {
            const kw = category.keywords[j];
            if (lower.includes(kw)) {
                return category.intent;
            }
        }
    }
    return "general";
}

// Check model status and update UI
async function checkModelStatus() {
    if (connectionCheckInProgress) {
        return modelStatus.isLoaded;
    }

    if (!initApiConfig()) {
        console.error('API configuration not initialized');
        return false;
    }

    connectionCheckInProgress = true;
    try {
        const controller = new AbortController();
        const { MODELS_URL, API_TIMEOUT } = Config.get();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT || 30000);

        let response;
        try {
            response = await fetch(MODELS_URL, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
        } catch (e) {
            clearTimeout(timeoutId);
            throw new Error('Failed to fetch models: ' + e.message);
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Models API returned ${response.status}: ${await response.text()}`);
        }
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Models API response was not valid JSON');
        }
        if (!data || !Array.isArray(data.data)) {
            throw new Error('Models API response missing expected data');
        }
        const modelDisplay = document.querySelector('.model-display');
        const activeModel = modelDisplay ? modelDisplay.textContent : '30b-a3b';
        
        const isModelLoaded = data.data.some(model => model.id === activeModel);
        
        modelStatus = {
            isLoaded: isModelLoaded,
            currentModel: activeModel,
            error: null,
            lastCheck: Date.now()
        };

        updateModelStatusUI();
        return isModelLoaded;
    } catch (error) {
        console.warn('Models endpoint failed, trying chat endpoint as fallback:', error.message);
        
        // Fallback: Try a simple chat request to test if the API is working
        try {
            const { API_URL } = Config.get();
            const testResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: '30b-a3b',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1,
                    temperature: 0.1
                })
            });
            
            if (testResponse.ok) {
                modelStatus = {
                    isLoaded: true,
                    currentModel: '30b-a3b',
                    error: null,
                    lastCheck: Date.now()
                };
                console.log('Chat endpoint accessible, assuming model is loaded');
                updateModelStatusUI();
                return true;
            }
        } catch (fallbackError) {
            console.error('Both models and chat endpoints failed:', fallbackError);
        }
        
        modelStatus = {
            isLoaded: false,
            currentModel: null,
            error: error.message,
            lastCheck: Date.now()
        };
        
        updateModelStatusUI();
        return false;
    } finally {
        connectionCheckInProgress = false;
    }
}

function updateModelStatusUI() {
    const statusIndicator = document.getElementById('model-status-indicator');
    if (!statusIndicator) {
        console.error('Status indicator element not found');
        return;
    }

    statusIndicator.className = 'status-indicator';
    
    if (modelStatus.error) {
        statusIndicator.classList.add('error');
        statusIndicator.title = `Error: ${modelStatus.error}`;
    } else if (modelStatus.isLoaded) {
        statusIndicator.classList.add('ready');
        statusIndicator.title = `Model Ready: ${modelStatus.currentModel}`;
    } else {
        statusIndicator.classList.add('loading');
        statusIndicator.title = 'Model Loading...';
    }
}

async function waitForModel(timeout = MODEL_LOAD_TIMEOUT) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        if (await checkModelStatus()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Model load timeout exceeded');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        initThemeSystem();
        console.log('DOM loaded, initializing chat interface');

        // Wait for config to be ready
        if (!initApiConfig()) {
            console.warn('API config not ready, will retry later');
        }

        await checkModelStatus();
        window._statusCheckInterval = setInterval(checkModelStatus, STATUS_CHECK_INTERVAL);

        // Get DOM elements with error checking
        messagesContainer = document.getElementById('messages');
        messageInput = document.getElementById('message-input');
        sendButton = document.getElementById('send-btn');
        settingsPanel = document.getElementById('settings-panel');
        closeSettingsButton = document.getElementById('close-settings');

        if (!messagesContainer) throw new Error('messagesContainer not found');
        if (!messageInput) throw new Error('messageInput not found');
        if (!sendButton) throw new Error('sendButton not found');

        initSidebarNavigation();

        // Add event listeners with error handling
        sendButton.addEventListener('click', sendMessage);

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Settings panel event listeners (non-navigation ones)
        if (settingsPanel) {
            document.getElementById('clear-history')?.addEventListener('click', clearConversationHistory);
            document.getElementById('smart-suggestions')?.addEventListener('change', toggleSmartSuggestions);

            const responseStyleRadios = document.querySelectorAll('input[name="response-style"]');
            responseStyleRadios.forEach(radio => {
                radio.addEventListener('change', updateResponseStyle);
            });
            
            // Add click-outside-to-close for settings panel
            document.addEventListener('mousedown', (e) => {
                const settingsNav = document.getElementById('settings-nav');
                if (settingsPanel.classList.contains('active') && 
                    !settingsPanel.contains(e.target) && 
                    (!settingsNav || !settingsNav.contains(e.target))) {
                    toggleSettingsPanel();
                    // Update nav state
                    if (settingsNav) {
                        settingsNav.classList.remove('active');
                    }
                    const chatNav = document.getElementById('chat-nav');
                    if (chatNav) {
                        chatNav.classList.add('active');
                    }
                }
            });
            
            // Add Escape key handler to close settings panel
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && settingsPanel.classList.contains('active')) {
                    toggleSettingsPanel();
                    // Update nav state
                    const settingsNav = document.getElementById('settings-nav');
                    if (settingsNav) {
                        settingsNav.classList.remove('active');
                    }
                    const chatNav = document.getElementById('chat-nav');
                    if (chatNav) {
                        chatNav.classList.add('active');
                    }
                }
            });
        }

        // Advanced Settings: Font Size & AI Personality
        // --- Font Size ---
        const fontSizeRange = document.getElementById('font-size-range');
        const fontSizeValue = document.getElementById('font-size-value');
        const root = document.documentElement;
        function applyFontSize(size) {
            root.style.setProperty('--user-font-size', size + 'px');
            document.body.style.fontSize = size + 'px';
            if (fontSizeValue) fontSizeValue.textContent = size + 'px';
        }
        function saveFontSize(size) {
            localStorage.setItem('fontSize', size);
        }
        function loadFontSize() {
            const saved = parseInt(localStorage.getItem('fontSize'), 10);
            const size = (!isNaN(saved) && saved >= 14 && saved <= 22) ? saved : 16;
            if (fontSizeRange) fontSizeRange.value = size;
            applyFontSize(size);
        }
        if (fontSizeRange) {
            fontSizeRange.addEventListener('input', e => {
                const size = parseInt(e.target.value, 10);
                applyFontSize(size);
                saveFontSize(size);
            });
            loadFontSize();
        }

        // --- AI Personality ---
        const personalityRadios = document.querySelectorAll('input[name="ai-personality"]');
        function savePersonality(value) {
            localStorage.setItem('aiPersonality', value);
        }
        function loadPersonality() {
            const saved = localStorage.getItem('aiPersonality') || 'professional';
            personalityRadios.forEach(radio => {
                radio.checked = (radio.value === saved);
            });
        }
        personalityRadios.forEach(radio => {
            radio.addEventListener('change', e => {
                savePersonality(e.target.value);
            });
        });
        loadPersonality();

        // Initialize image upload functionality
        initImageUpload();

        // Add welcome message
        let welcomeMessage = "Hello! Welcome to GCT UI. I'm KYNSEY & I'm ready to assist you.";
        welcomeMessage = welcomeMessage.replace(/\*\*/g, '');

        addAIMessage(
            welcomeMessage,
            [
                "What can you help me with?",
                "How do I use the notes features with this interface?",
                "Tell me about GCT UI features"
            ]
        );

        console.log('Chat interface initialized');
    } catch (error) {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            alert('Initialization error: ' + (error && error.message ? error.message : error));
        } else {
            showToast('Initialization failed. Please reload or contact support.', 'error');
        }
        console.error('Initialization error:', error);
    }
    // Clean up intervals on unload
    window.addEventListener('beforeunload', () => {
        if (window._statusCheckInterval) clearInterval(window._statusCheckInterval);
    });
// === Modular Keyboard Shortcuts System ===
(function () {
    // Shortcut registry
    const shortcuts = [];
    let contextProvider = () => "global"; // Can be replaced for context-aware logic

    // Utility: Normalize key combo string
    function normalizeCombo(combo) {
        return combo
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace('ctrl', 'control')
            .replace('cmd', 'meta')
            .replace('win', 'meta')
            .replace('option', 'alt');
    }

    // Register a shortcut
    function registerShortcut({ combo, description, action, context = "global", allowInInputs = false }) {
        shortcuts.push({ combo: normalizeCombo(combo), description, action, context, allowInInputs });
    }

    // Find matching shortcut
    function findShortcut(e, currentContext) {
        const keys = [];
        if (e.ctrlKey) keys.push('control');
        if (e.metaKey) keys.push('meta');
        if (e.altKey) keys.push('alt');
        if (e.shiftKey) keys.push('shift');
        let key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
        // Special case for '?' (shift+/)
        if (key === '/' && e.shiftKey) key = '?';
        keys.push(key);
        const pressed = keys.join('+');
        return shortcuts.find(s =>
            s.combo === pressed &&
            (s.context === currentContext || s.context === "global")
        );
    }

    // Show/Hide Help Overlay
    const overlay = document.getElementById('shortcuts-help-overlay');
    const overlayList = document.getElementById('shortcuts-help-list');
    const closeBtn = document.getElementById('close-shortcuts-help');
    let overlayActive = false;

    function renderHelpOverlay() {
        if (!overlayList) return;
        // Group by context
        const grouped = {};
        shortcuts.forEach(s => {
            if (!grouped[s.context]) grouped[s.context] = [];
            grouped[s.context].push(s);
        });
        let html = `<table><thead><tr><th>Shortcut</th><th>Description</th></tr></thead><tbody>`;
        Object.keys(grouped).forEach(ctx => {
            if (ctx !== "global") {
                html += `<tr><td colspan="2" style="color:#aaa;font-size:0.95em;padding-top:12px;"><em>Context: ${ctx}</em></td></tr>`;
            }
            grouped[ctx].forEach(s => {
                html += `<tr><td><kbd>${s.combo.replace(/\+/g, '</kbd>+<kbd>')}</kbd></td><td>${s.description}</td></tr>`;
            });
        });
        html += `</tbody></table>`;
        overlayList.innerHTML = html;
    }

    function openHelpOverlay() {
        if (!overlay) return;
        renderHelpOverlay();
        overlay.style.display = 'flex';
        overlay.classList.add('active');
        overlayActive = true;
        overlay.focus();
        document.body.style.overflow = 'hidden';
    }
    function closeHelpOverlay() {
        if (!overlay) return;
        overlay.classList.remove('active');
        setTimeout(() => { overlay.style.display = 'none'; }, 150);
        overlayActive = false;
        document.body.style.overflow = '';
    }

    // Keyboard event handler
    document.addEventListener('keydown', function (e) {
        // Don't trigger in modals/overlays except help itself
        if (overlayActive && (e.key === "Escape" || (e.ctrlKey && (e.key === '?' || (e.key === '/' && e.shiftKey))))) {
            closeHelpOverlay();
            e.preventDefault();
            return;
        }
        if (overlayActive) return;

        // Ignore in input/textarea unless allowed
        const tag = (e.target.tagName || '').toLowerCase();
        const isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
        const ctx = contextProvider();

        // Ctrl+? (help overlay)
        if ((e.ctrlKey || e.metaKey) && (e.key === '?' || (e.key === '/' && e.shiftKey))) {
            openHelpOverlay();
            e.preventDefault();
            return;
        }

        // Find and run shortcut
        const shortcut = findShortcut(e, ctx);
        if (shortcut && (shortcut.allowInInputs || !isInput)) {
            shortcut.action(e);
            e.preventDefault();
        }
    }, true);

    // Close button
    if (closeBtn) closeBtn.addEventListener('click', closeHelpOverlay);

    // Trap focus in overlay
    if (overlay) {
        overlay.addEventListener('keydown', function (e) {
            if (e.key === "Tab") {
                e.preventDefault();
                // Keep focus in overlay
                overlay.focus();
            }
        });
    }

    // Expose API globally for extensibility
    window.KeyboardShortcuts = {
        register: registerShortcut,
        setContextProvider: fn => { contextProvider = fn; },
        getShortcuts: () => shortcuts.slice()
    };

    // --- Register default shortcuts ---
    registerShortcut({
        combo: 'Control+?',
        description: 'Show keyboard shortcuts help',
        action: openHelpOverlay,
        context: 'global'
    });
    registerShortcut({
        combo: 'Control+K',
        description: 'Open command palette',
        action: () => {
            const palette = document.getElementById('command-palette');
            if (palette && typeof palette.openPalette === 'function') palette.openPalette();
            // Fallback: trigger Ctrl+K handler if palette is not openable
        },
        context: 'global'
    });
    registerShortcut({
        combo: 'Control+1',
        description: 'Focus chat input',
        action: () => document.getElementById('message-input')?.focus(),
        context: 'global'
    });
    registerShortcut({
        combo: 'Control+2',
        description: 'Open notes panel',
        action: () => document.getElementById('notes-nav')?.click(),
        context: 'global'
    });
    registerShortcut({
        combo: 'Control+3',
        description: 'Open settings panel',
        action: () => document.getElementById('settings-nav')?.click(),
        context: 'global'
    });
    // Example context-aware shortcut (can be extended)
    // registerShortcut({
    //     combo: 'Control+S',
    //     description: 'Save note (when editing note)',
    //     action: () => document.getElementById('save-note-btn')?.click(),
    //     context: 'note-editor'
    // });
})();
});

// Send message function - FIXED
async function sendMessage() {
    console.log('Sending message');

    if (!modelStatus.isLoaded) {
        try {
            let loadingMessage = "Model is loading, please wait...";
            loadingMessage = loadingMessage.replace(/\*\*/g, '');
            
            addAIMessage(loadingMessage, ["Check Status"]);
            await waitForModel();
        } catch (error) {
            let errorMessage = "Model failed to load. Please try again later or check status.";
            errorMessage = errorMessage.replace(/\*\*/g, '');
            
            addAIMessage(
                errorMessage,
                ["Retry", "Check API Settings"]
            );
            return;
        }
    }
    
    if (!messageInput) {
        console.error('Message input element not found');
        return;
    }
    
    const userMessage = messageInput.value.trim();
    console.log('User message:', userMessage);

    if (userMessage === '') {
        console.log('Empty message, not sending');
        return;
    }
    
    // Handle slash commands
    if (userMessage.startsWith('/')) {
        const parts = userMessage.substring(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Clear input immediately for commands
        messageInput.value = '';
        
        switch (command) {
            case 'browse':
                if (args.length > 0) {
                    addUserMessage(userMessage);
                    addAIMessage('Opening browser control...', []);
                    if (window.BrowserControlUI) {
                        window.BrowserControlUI.openPanel();
                        setTimeout(() => {
                            const urlInput = document.getElementById('browser-url-input');
                            if (urlInput) {
                                urlInput.value = args.join(' ');
                                document.getElementById('browser-launch-btn')?.click();
                            }
                        }, 300);
                    }
                } else {
                    addAIMessage('Usage: /browse <url>', []);
                }
                return;
                
            case 'click':
                if (args.length >= 2) {
                    const x = parseInt(args[0]);
                    const y = parseInt(args[1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        addUserMessage(userMessage);
                        if (window.BrowserControlUI && window.BrowserControlUI.isActive()) {
                            window.dispatchEvent(new CustomEvent('chatCommand', {
                                detail: { command: 'click', args: [x, y] }
                            }));
                            addAIMessage(`Clicking at coordinates (${x}, ${y})...`, []);
                        } else {
                            addAIMessage('No browser session active. Use /browse first.', []);
                        }
                    } else {
                        addAIMessage('Usage: /click <x> <y> (coordinates must be numbers)', []);
                    }
                } else {
                    addAIMessage('Usage: /click <x> <y>', []);
                }
                return;
                
            case 'type':
                if (args.length > 0) {
                    addUserMessage(userMessage);
                    if (window.BrowserControlUI && window.BrowserControlUI.isActive()) {
                        window.dispatchEvent(new CustomEvent('chatCommand', {
                            detail: { command: 'type', args: args }
                        }));
                        addAIMessage(`Typing: "${args.join(' ')}"...`, []);
                    } else {
                        addAIMessage('No browser session active. Use /browse first.', []);
                    }
                } else {
                    addAIMessage('Usage: /type <text>', []);
                }
                return;
                
            case 'screenshot':
                addUserMessage(userMessage);
                if (window.BrowserControlUI && window.BrowserControlUI.isActive()) {
                    window.dispatchEvent(new CustomEvent('chatCommand', {
                        detail: { command: 'screenshot', args: [] }
                    }));
                    addAIMessage('Taking screenshot...', []);
                } else {
                    addAIMessage('No browser session active. Use /browse first.', []);
                }
                return;
                
            case 'help':
                addUserMessage(userMessage);
                addAIMessage(`Available commands:
• /browse <url> - Open a URL in browser
• /click <x> <y> - Click at coordinates
• /type <text> - Type text in browser
• /screenshot - Take a screenshot
• /help - Show this help message`, []);
                return;
                
            default:
                // Not a recognized command, process as normal message
                break;
        }
    }

    // Check if this is a browser control command (natural language)
    if (window.BrowserAI && window.BrowserAI.isBrowserCommand(userMessage)) {
        console.log('Browser command detected:', userMessage);
        
        // Add user message
        addUserMessage(userMessage);
        messageInput.value = '';
        
        // Parse the natural language command
        const parsedAction = window.BrowserAI.parseNaturalLanguage(userMessage);
        console.log('Parsed browser action:', parsedAction);
        
        if (parsedAction) {
            // Show thinking briefly
            showKynseyThinking();
            
            setTimeout(async () => {
                hideKynseyThinking();
                
                // Open browser panel if not already open
                if (window.BrowserControlUI && !document.getElementById('browser-control-panel').classList.contains('active')) {
                    window.BrowserControlUI.openPanel();
                    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for panel animation
                }
                
                // Execute the browser action
                if (parsedAction.action === 'navigate') {
                    addAIMessage(`Opening ${parsedAction.params.url}...`, []);
                    
                    // Set URL and launch
                    const urlInput = document.getElementById('browser-url-input');
                    if (urlInput) {
                        urlInput.value = parsedAction.params.url;
                        document.getElementById('browser-launch-btn')?.click();
                    }
                } else {
                    // Convert to browser command
                    const browserCommand = window.BrowserAI.toBrowserCommand(parsedAction);
                    
                    if (browserCommand && !browserCommand.pending) {
                        addAIMessage(`${parsedAction.description}...`, []);
                        
                        if (window.BrowserControlUI && window.BrowserControlUI.isActive()) {
                            window.dispatchEvent(new CustomEvent('chatCommand', {
                                detail: { 
                                    command: browserCommand.command, 
                                    args: browserCommand.args 
                                }
                            }));
                        } else {
                            addAIMessage('Please open a browser first. Say "open google.com" to start.', [
                                "Open google.com",
                                "Go to youtube.com",
                                "Search for AI news"
                            ]);
                        }
                    } else if (browserCommand && browserCommand.pending) {
                        addAIMessage(`I'll help you ${parsedAction.description}. This feature requires element detection which is coming soon.`, [
                            "Take a screenshot instead",
                            "Try clicking by coordinates",
                            "Navigate to a different page"
                        ]);
                    }
                }
            }, 800);
            
            return;
        }
    }
    
    // Check if user is asking about KYNSEY's name
    if (isNameQuestion(userMessage)) {
        console.log('Name question detected, providing pre-determined response');
        
        // Add user message to chat
        addUserMessage(userMessage);
        messageInput.value = '';
        
        // Show thinking animation briefly for realism
        showKynseyThinking();
        
        // Brief delay to show thinking animation
        setTimeout(() => {
            hideKynseyThinking();
            // Add KYNSEY's introduction response
            const response = getKynseyIntroduction();
            addAIMessage(response, [
                "How do I use notes?",
                "What features do you have?",
                "Help me get started"
            ]);
        }, 1200);
        
        return;
    }

    const detectedIntent = detectIntent(userMessage);
    console.log('Detected intent:', detectedIntent);

    ensureActiveSession();

    const messageType = analyzeMessageType(userMessage);

    const metadata = {
        timestamp: Date.now(),
        type: messageType,
        intent: detectedIntent,
        relevanceScore: 1.0
    };

    addUserMessage(userMessage);
    messageInput.value = '';

    if (detectedIntent && detectedIntent !== "general") {
        chatHistory.messages.push({
            role: "system",
            content: `User intent detected: ${detectedIntent}`,
            metadata: {
                timestamp: Date.now(),
                type: MessageType.SYSTEM,
                intent: detectedIntent,
                relevanceScore: 0.9
            },
            sessionId: chatHistory.currentSession
        });
    }

    const messageObject = {
        role: "user",
        content: userMessage,
        metadata: metadata,
        sessionId: chatHistory.currentSession
    };

    chatHistory.messages.push(messageObject);
    updateMessageRelevanceScores();
    
    let loadingId = null;
    
    try {
        loadingId = showLoadingIndicator();
        showKynseyThinking(); // Show the enhanced thinking animation
        console.log('Showing loading indicator and KYNSEY thinking animation');
        
        let aiResponse;
        
        try {
            console.log('Attempting to connect to LM Studio API with retry');
            
            if (!initApiConfig()) {
                throw new Error('API configuration not initialized');
            }
            const { API_URL, API_TIMEOUT } = Config.get();
            const modelDisplay = document.querySelector('.model-display');
            const activeModel = modelDisplay ? modelDisplay.textContent : '30b-a3b';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT || 30000);

            const apiOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: activeModel,
                    messages: getRelevantContext(),
                    temperature: 0.7,
                    stream: false,
                    max_tokens: 1000
                })
            };

            try {
                const data = await callApiWithRetry(API_URL, apiOptions);
                clearTimeout(timeoutId);
                if (!data.choices || !data.choices[0] || !data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
                    throw new Error('API response missing choices or message content');
                }
                aiResponse = data.choices[0].message.content;
                console.log('Received API response after retry logic');
                
                const apiStatusIndicator = document.getElementById('api-status-indicator');
                if (apiStatusIndicator) {
                    apiStatusIndicator.className = 'status-indicator ready';
                    apiStatusIndicator.title = 'API Connected';
                }
                apiConnected = true;

            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }

        } catch (apiError) {
            console.error('API Error after retries:', apiError);
            
            if (loadingId) {
                removeLoadingIndicator(loadingId);
            }
            hideKynseyThinking(); // Hide thinking animation on error
    
            let errorMessage = "Sorry, I couldn't connect to the KYNSEY API.";
            if (apiError.message.includes('Failed to fetch')) {
                errorMessage += " Please ensure KYNSEY API is running and accessible.";
            } else if (apiError.message.includes('status')) {
                errorMessage += ` API returned an error: ${apiError.message}`;
            } else {
                errorMessage += ` An unexpected error occurred: ${apiError.message}`;
            }
            
            errorMessage = errorMessage.replace(/\*\*/g, '');
    
            addAIMessage(errorMessage, ["Retry", "Check API Settings"]);
            
            console.error('API Error Details:', {
                error: apiError,
                endpoint: API_URL,
                timestamp: new Date().toISOString(),
                modelStatus: modelStatus
            });
            console.log('API error message added to chat');
            return;
        }
    
        // Remove loading indicator and process response
        setTimeout(() => {
            if (loadingId) {
                removeLoadingIndicator(loadingId);
            }
            hideKynseyThinking(); // Hide the thinking animation
    
            if (aiResponse) {
                aiResponse = aiResponse.replace(/\*\*/g, '');
            }
            
            const responseObject = {
                role: "assistant",
                content: aiResponse,
                metadata: {
                    timestamp: Date.now(),
                    type: MessageType.RESPONSE,
                    relevanceScore: 1.0,
                },
                sessionId: chatHistory.currentSession
            };
            
            chatHistory.messages.push(responseObject);
            updateMessageRelevanceScores();
    
            const suggestions = generateSuggestions(aiResponse);
            addAIMessage(aiResponse, suggestions);
    
            console.log('AI response added to chat');
        }, 500);
    
    } catch (error) {
        console.error('An unexpected error occurred in sendMessage:', error);
        
        if (loadingId) {
            removeLoadingIndicator(loadingId);
        }
        
        let errorMessage = "An unexpected error occurred. Please try again.";
        errorMessage = errorMessage.replace(/\*\*/g, '');
        
        addAIMessage(
            errorMessage,
            ["Retry", "Report issue"]
        );
    }
}

// Initialize image upload functionality
function initImageUpload() {
    imageUploadModal = document.getElementById('image-upload-modal');
    closeImageUploadBtn = document.getElementById('close-image-upload');
    uploadArea = document.getElementById('upload-area');
    fileInput = document.getElementById('file-input');
    cancelUploadBtn = document.getElementById('cancel-upload');
    confirmUploadBtn = document.getElementById('confirm-upload');
    
    if (imageUploadModal && closeImageUploadBtn && uploadArea && fileInput) {
        const attachmentBtn = document.querySelector('.attachment-btn');
        if (attachmentBtn) {
            attachmentBtn.addEventListener('click', toggleImageUploadModal);
        }
        
        closeImageUploadBtn.addEventListener('click', toggleImageUploadModal);
        
        if (cancelUploadBtn) {
            cancelUploadBtn.addEventListener('click', toggleImageUploadModal);
        }
        
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleFileSelect);
        
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        
        if (confirmUploadBtn) {
            confirmUploadBtn.addEventListener('click', handleImageUpload);
        }
    } else {
        console.error('Image upload elements not found');
    }
}

// Rest of the helper functions remain the same...
function getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return "Hello! How can I assist you today?";
    } else if (lowerMessage.includes('help')) {
        return "I'm here to help! You can ask me questions, and I'll do my best to assist you.";
    } else if (lowerMessage.includes('feature') || lowerMessage.includes('gct')) {
        return "GCT UI offers a seamless interface to interact with. You can chat, ask questions, and get AI-powered responses.";
    } else if (lowerMessage.includes('how') && lowerMessage.includes('use')) {
        return "To use this interface, simply type your message in the input box and press Send. You can also click on suggestion buttons for quick responses.";
    } else {
        return "I understand your message. In a real environment, I would connect to the database to provide a more specific response.";
    }
}

function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

function parseMarkdown(text) {
    if (!text) return '';
    
    try {
        // Check if marked library is available
        if (typeof marked !== 'undefined' && marked.parse) {
            // Configure marked options
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: false,
                mangle: false,
                sanitize: false // We'll use DOMPurify separately
            });
            
            // Parse markdown to HTML
            let html = marked.parse(text);
            
            // Sanitize HTML if DOMPurify is available
            if (typeof DOMPurify !== 'undefined') {
                html = DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'b', 'i', 
                                   'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'a', 'img', 'table', 
                                   'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'],
                    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class', 'id'],
                    ALLOW_DATA_ATTR: false
                });
            }
            
            return html;
        } else {
            // Fallback to basic parsing if marked is not available
            console.warn('Marked library not available, using basic markdown parsing');
            
            // Remove ** for bold (fallback)
            text = text.replace(/\*\*/g, '');
            
            let html = text.replace(/\n/g, '<br>');
            
            html = html.replace(/\*(.*?)\*|_(.*?)_/g, function(match, p1, p2) {
                return `<em>${p1 || p2}</em>`;
            });
            
            html = html.replace(/`(.*?)`/g, '<code>$1</code>');
            html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
            html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
            html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
            html = html.replace(/^[\*\-] (.*?)$/gm, '<li>$1</li>');
            
            if (html.includes('<li>')) {
                html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
            }
            
            html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
            
            return html;
        }
    } catch (error) {
        console.error('Error parsing markdown:', error);
        // Return escaped text as fallback
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }
}

// Add user message to UI
function addUserMessage(message) {
    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user');
    
    messageElement.innerHTML = sanitizeHTML(message);
    
    const now = new Date();
    messageElement.setAttribute('data-time',
        now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })
    );
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// Add AI message to UI with suggestions
function addAIMessage(message, suggestions = []) {
    const now = new Date();
    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }
    
    if (message) {
        message = message.replace(/\*\*/g, '');
    }
    
    console.log('Raw message (after ** removal):', message);
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'ai');
    messageElement.setAttribute('data-time',
        now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })
    );

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('message-actions');
    
    const copyBtn = document.createElement('button');
    copyBtn.classList.add('message-action-btn');
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.title = 'Copy message';
    copyBtn.addEventListener('click', () => copyMessageToClipboard(message));
    
    const saveBtn = document.createElement('button');
    saveBtn.classList.add('message-action-btn');
    saveBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
    saveBtn.title = 'Save as note';
    saveBtn.addEventListener('click', () => saveMessageAsNote(message));
    
    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(saveBtn);
    messageElement.appendChild(actionsDiv);
    
    const parsedContent = parseMarkdown(message);
    console.log('After markdown parsing:', parsedContent);
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerHTML = parsedContent;
    
    messageElement.appendChild(contentDiv);
    
    if (suggestions.length > 0) {
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.classList.add('suggestions');
        
        suggestions.forEach(suggestion => {
            const suggestionButton = document.createElement('button');
            suggestionButton.classList.add('suggestion-btn');
            suggestionButton.textContent = suggestion;
            suggestionButton.addEventListener('click', () => {
                // Handle special case for GCT UI features
                if (suggestion === "Tell me about GCT UI features") {
                    // Add user message to show the question was asked
                    addUserMessage(suggestion);
                    
                    // Add the pre-written features summary as AI response
                    setTimeout(() => {
                        addAIMessage(GCT_UI_FEATURES_SUMMARY, [
                            "How do I use command hotkeys?",
                            "Show me keyboard shortcuts",
                            "How do I create a note?"
                        ]);
                    }, 100);
                } else if (messageInput) {
                    messageInput.value = suggestion;
                    setTimeout(() => {
                        sendMessage();
                    }, 10);
                }
            });
            suggestionsContainer.appendChild(suggestionButton);
        });
        
        messageElement.appendChild(suggestionsContainer);
    }
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// Show loading indicator with enhanced animation
function showLoadingIndicator() {
    if (!messagesContainer) {
        console.error('Messages container not found');
        return Date.now();
    }
    
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('message', 'ai', 'loading');
    loadingElement.setAttribute('data-loading-id', Date.now().toString());
    
    const textElement = document.createElement('span');
    textElement.textContent = 'Thinking';
    textElement.classList.add('thinking-text');
    loadingElement.appendChild(textElement);
    
    const dotsElement = document.createElement('div');
    dotsElement.classList.add('typing-dots');
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.style.animationDelay = `${i * 0.2}s`;
        dotsElement.appendChild(dot);
    }
    loadingElement.appendChild(dotsElement);
    
    loadingElement.style.opacity = '0';
    loadingElement.style.transform = 'translateY(10px)';
    messagesContainer.appendChild(loadingElement);
    
    setTimeout(() => {
        loadingElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        loadingElement.style.opacity = '1';
        loadingElement.style.transform = 'translateY(0)';
    }, 10);
    
    scrollToBottom();
    return loadingElement.getAttribute('data-loading-id');
}

// Remove loading indicator with fade-out animation - FIXED
function removeLoadingIndicator(id) {
    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }
    
    let element;
    if (id) {
        element = messagesContainer.querySelector(`[data-loading-id="${id}"]`);
    } else {
        const loadingElements = document.querySelectorAll('.loading');
        element = loadingElements[loadingElements.length - 1];
    }
    
    if (element) {
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }
        }, 300);
    }
}

function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function generateSuggestions(response) {
    // Check if browser control is active
    if (window.BrowserControlUI && window.BrowserControlUI.isActive()) {
        return [
            "Take a screenshot",
            "Go back to previous page",
            "Search for something on Google"
        ];
    }
    
    let lastIntent = "general";
    for (let i = chatHistory.messages.length - 1; i >= 0; i--) {
        const msg = chatHistory.messages[i];
        if (msg.role === "user" && msg.metadata && msg.metadata.intent) {
            lastIntent = msg.metadata.intent;
            break;
        }
    }

    const resp = response.toLowerCase();
    
    // Check if response mentions browsing or websites
    if (resp.includes('browser') || resp.includes('website') || resp.includes('google') || resp.includes('open')) {
        return [
            "Open google.com",
            "Search for AI news",
            "Go to youtube.com"
        ];
    }

    if (lastIntent === "ask_question") {
        if (resp.includes("help")) {
            return ["Show me how", "Tell me more", "Examples please"];
        }
        return ["Can you clarify?", "Give me an example", "Summarize this"];
    }
    if (lastIntent === "create_note") {
        return ["Add tags to note", "Show all notes", "Edit this note"];
    }
    if (lastIntent === "summarize") {
        return ["Expand summary", "Show details", "Summarize again"];
    }
    if (lastIntent === "translate") {
        return ["Translate to another language", "Show original text", "Explain translation"];
    }
    if (lastIntent === "code_generation") {
        return ["Explain this code", "Generate test cases", "Optimize code"];
    }
    if (lastIntent === "edit") {
        return ["Undo changes", "Show previous version", "Save changes"];
    }
    if (lastIntent === "delete") {
        return ["Restore deleted item", "Show trash", "Delete another"];
    }
    if (resp.includes("error") || resp.includes("sorry")) {
        return ["Try again", "Check API settings"];
    }
    return ["Tell me more", "How does that work?", "Can you explain further?"];
}

// Initialize sidebar navigation with animations
function initSidebarNavigation() {
    // Chat nav - just closes any open panels
    const chatNav = document.getElementById('chat-nav');
    if (chatNav) {
        chatNav.addEventListener('click', function() {
            // Close all panels and activate chat
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            // Use PanelManager if available for notes, manual for settings
            if (window.Notes && window.Notes.PanelManager && window.Notes.PanelManager.activePanel === 'notes') {
                window.Notes.PanelManager.setActivePanel(null);
            }
            document.querySelectorAll('.settings-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            this.classList.add('active');
            
            // Notify PanelManager if available
            if (window.Notes && window.Notes.PanelManager && window.Notes.PanelManager.setActivePanel) {
                window.Notes.PanelManager.setActivePanel(null);
            }
        });
    }
    
    // Settings navigation
    const settingsNav = document.getElementById('settings-nav');
    const settingsPanel = document.getElementById('settings-panel');
    
    if (settingsNav && settingsPanel) {
        settingsNav.addEventListener('click', function() {
            const isActive = settingsPanel.classList.contains('active');
            
            // Close other panels first
            if (!isActive) {
                document.querySelectorAll('.nav-item.active').forEach(item => {
                    if (item.id !== 'settings-nav') {
                        item.classList.remove('active');
                    }
                });
                document.querySelectorAll('.notes-panel.active').forEach(panel => {
                    panel.classList.remove('active');
                });
            }
            
            // Toggle nav item state
            if (isActive) {
                this.classList.remove('active');
            } else {
                this.classList.add('active');
            }
            
            // Use the global toggleSettingsPanel function
            toggleSettingsPanel();
        });
    }
    
    // Only handle settings close button - notes close is handled by notes.js
    const closeSettingsBtn = document.querySelector('.close-settings');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', function() {
            // Use the global toggleSettingsPanel function
            toggleSettingsPanel();
            
            // Update nav items
            const navItem = document.getElementById('settings-nav');
            if (navItem) {
                navItem.classList.remove('active');
            }
            
            const chatNav = document.getElementById('chat-nav');
            if (chatNav) {
                chatNav.classList.add('active');
            }
        });
    }
}

function toggleSettingsPanel() {
    // Ensure settingsPanel is properly initialized
    if (!settingsPanel) {
        settingsPanel = document.getElementById('settings-panel');
    }
    
    if (settingsPanel) {
        const isActive = settingsPanel.classList.contains('active');
        
        if (isActive) {
            // Closing animation - improved timing
            const elements = settingsPanel.querySelectorAll('h2, h3, .settings-section');
            
            // Set transition for all elements at once
            elements.forEach(el => {
                el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            });
            
            // Animate elements out
            elements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(20px)';
                }, index * 30);
            });
            
            // Calculate total animation time
            const totalAnimationTime = elements.length * 30 + 200;
            
            // Remove active class after all animations
            setTimeout(() => {
                settingsPanel.classList.remove('active');
                
                // Clean up styles after panel is fully hidden
                setTimeout(() => {
                    elements.forEach(el => {
                        el.style.opacity = '';
                        el.style.transform = '';
                        el.style.transition = '';
                    });
                }, 350); // Wait for CSS transition
            }, totalAnimationTime);
        } else {
            // Opening animation
            settingsPanel.classList.add('active');
            
            // Small delay to ensure panel is visible before animating elements
            setTimeout(() => {
                const elements = settingsPanel.querySelectorAll('h2, h3, .settings-section');
                elements.forEach((el, index) => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(20px)';
                    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    
                    setTimeout(() => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, 50 + (index * 50));
                });
            }, 50);
        }
    }
}

// Make function globally accessible
window.toggleSettingsPanel = toggleSettingsPanel;

function clearConversationHistory() {
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        chatHistory.messages = [];
        chatHistory.currentSession = null;
        chatHistory.sessions.clear();
        
        let message = "Conversation history has been cleared.";
        message = message.replace(/\*\*/g, '');
        
        addAIMessage(message, ["Start a new conversation"]);
        
        toggleSettingsPanel();
    }
}

function initThemeSystem() {
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    document.body.className = savedTheme;
    const themeElement = document.getElementById(`theme-${savedTheme}`);
    if (themeElement) {
        themeElement.checked = true;
    }
    
    themeRadios.forEach(radio => {
        radio.addEventListener('change', handleThemeChange);
    });
}

function handleThemeChange(event) {
    const newTheme = event.target.value;
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
}

async function copyMessageToClipboard(message) {
    try {
        if (message) {
            message = message.replace(/\*\*/g, '');
        }
        await navigator.clipboard.writeText(message);
        showToast('Message copied to clipboard', 'success');
    } catch (err) {
        console.error('Failed to copy message:', err);
        showToast('Failed to copy message', 'error');
    }
}

function saveMessageAsNote(message) {
    if (message) {
        message = message.replace(/\*\*/g, '');
    }
    
    const title = message.split('\n')[0].slice(0, 50) + (message.length > 50 ? '...' : '');
    
    const newNote = {
        id: Date.now(),
        title: title,
        content: message,
        tags: ['chat', 'ai-response'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    let storedNotes;
    try {
        const raw = localStorage.getItem('gct_notes');
        storedNotes = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch (e) {
        storedNotes = [];
        console.error('Corrupted notes in localStorage, resetting:', e);
        showToast('Corrupted notes detected. Notes reset.', 'error');
    }
    storedNotes.unshift(newNote);
    localStorage.setItem('gct_notes', JSON.stringify(storedNotes));
    showToast('Message saved as note', 'success');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.querySelector('.toast-container') || createToastContainer();
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function toggleSmartSuggestions(event) {
    const showSuggestions = event.target.checked;
    localStorage.setItem('smartSuggestions', showSuggestions);
    console.log(`Smart suggestions ${showSuggestions ? 'enabled' : 'disabled'}`);
}

function updateResponseStyle(event) {
    const selectedStyle = event.target.value;
    localStorage.setItem('responseStyle', selectedStyle);
    console.log(`Response style set to: ${selectedStyle}`);
}

function toggleImageUploadModal() {
    if (imageUploadModal) {
        imageUploadModal.classList.toggle('active');
        
        if (!imageUploadModal.classList.contains('active')) {
            resetUploadArea();
        }
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (uploadArea) {
        uploadArea.style.borderColor = '#0084ff';
        uploadArea.style.backgroundColor = 'rgba(0, 132, 255, 0.05)';
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (uploadArea) {
        uploadArea.style.borderColor = '#3a3a3a';
        uploadArea.style.backgroundColor = 'transparent';
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (uploadArea) {
        uploadArea.style.borderColor = '#3a3a3a';
        uploadArea.style.backgroundColor = 'transparent';
        
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files);
        }
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

function handleFiles(files) {
    const file = files[0];
    
    if (!file.type.match('image.*')) {
        alert('Please select an image file.');
        return;
    }
    
    if (uploadArea) {
        uploadArea.innerHTML = '';
        
        const img = document.createElement('img');
        img.classList.add('preview-image');
        img.file = file;
        
        uploadArea.appendChild(img);
        
        const fileNameElement = document.createElement('p');
        fileNameElement.textContent = file.name;
        fileNameElement.style.marginTop = '10px';
        uploadArea.appendChild(fileNameElement);
        
        const reader = new FileReader();
        reader.onload = (function(aImg) { 
            return function(e) { 
                aImg.src = e.target.result; 
                aImg.style.maxWidth = '100%';
                aImg.style.maxHeight = '150px';
                aImg.style.marginTop = '10px';
            }; 
        })(img);
        reader.readAsDataURL(file);
    }
}

function handleImageUpload() {
    toggleImageUploadModal();
    
    let message = "Image uploaded successfully! In a real application, this image would be processed or stored.";
    message = message.replace(/\*\*/g, '');
    
    addAIMessage(
        message,
        ["Tell me more about image processing", "How can I use this image?"]
    );
}

function resetUploadArea() {
    if (uploadArea) {
        uploadArea.innerHTML = '<p>Drag & drop an image or click to browse</p>';
        uploadArea.style.borderColor = '#3a3a3a';
        uploadArea.style.backgroundColor = 'transparent';
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
}

function ensureActiveSession() {
    const now = Date.now();
    
    if (chatHistory.currentSession) {
        const session = chatHistory.sessions.get(chatHistory.currentSession);
        if (session && now - session.lastActivity > CONTEXT_CONFIG.sessionTimeout) {
            chatHistory.currentSession = null;
        }
    }
    
    if (!chatHistory.currentSession) {
        const sessionId = Date.now().toString();
        chatHistory.sessions.set(sessionId, {
            startTime: now,
            lastActivity: now,
            messageCount: 0
        });
        chatHistory.currentSession = sessionId;
    }
    
    const session = chatHistory.sessions.get(chatHistory.currentSession);
    if (session) {
        session.lastActivity = now;
        session.messageCount++;
    }
}

function analyzeMessageType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('?') ||
        lowerMessage.startsWith('what') ||
        lowerMessage.startsWith('how') ||
        lowerMessage.startsWith('why') ||
        lowerMessage.startsWith('when') ||
        lowerMessage.startsWith('where')) {
        return MessageType.QUESTION;
    }
    
    if (lowerMessage.startsWith('show') ||
        lowerMessage.startsWith('display') ||
        lowerMessage.startsWith('list') ||
        lowerMessage.startsWith('create') ||
        lowerMessage.startsWith('update') ||
        lowerMessage.startsWith('delete')) {
        return MessageType.COMMAND;
    }
    
    if (lowerMessage.startsWith('could you') ||
        lowerMessage.startsWith('can you') ||
        lowerMessage.includes('mean') ||
        lowerMessage.includes('clarify')) {
        return MessageType.CLARIFICATION;
    }
    
    return MessageType.STATEMENT;
}

function updateMessageRelevanceScores() {
    const now = Date.now();
    
    chatHistory.messages.forEach(msg => {
        if (msg.metadata) {
            const age = (now - msg.metadata.timestamp) / (CONTEXT_CONFIG.sessionTimeout);
            const timeDecay = Math.max(0.1, 1 - age);
            
            let typeMultiplier = 1.0;
            switch (msg.metadata.type) {
                case MessageType.QUESTION:
                case MessageType.COMMAND:
                    typeMultiplier = 1.2;
                    break;
                case MessageType.CLARIFICATION:
                    typeMultiplier = 1.1;
                    break;
                case MessageType.SYSTEM:
                    typeMultiplier = 0.8;
                    break;
            }
            
            msg.metadata.relevanceScore = timeDecay * typeMultiplier;
        }
    });
}

function getRelevantContext() {
    const sortedMessages = [...chatHistory.messages]
        .filter(msg => msg.metadata && msg.metadata.relevanceScore >= CONTEXT_CONFIG.relevanceThreshold)
        .sort((a, b) => b.metadata.relevanceScore - a.metadata.relevanceScore)
        .slice(0, CONTEXT_CONFIG.maxMessages);
    
    return sortedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

// === Enhanced Command Palette ===
// Modular, extensible, accessible, keyboard-driven, fuzzy search, overlay UI

(function () {
    // --- Command Registry (easy to extend) ---
    const commands = [
        {
            name: "New Note",
            description: "Create a new note",
            category: "Notes",
            icon: "fas fa-plus",
            action: () => document.getElementById('new-note-btn')?.click()
        },
        {
            name: "Open Notes",
            description: "Show the notes panel",
            category: "Notes",
            icon: "fas fa-sticky-note",
            action: () => document.getElementById('notes-nav')?.click()
        },
        {
            name: "Open Settings",
            description: "Show the settings panel",
            category: "Settings",
            icon: "fas fa-cog",
            action: () => document.getElementById('settings-nav')?.click()
        },
        {
            name: "Clear Conversation",
            description: "Clear all chat messages",
            category: "Chat",
            icon: "fas fa-trash",
            action: () => document.getElementById('clear-history')?.click()
        },
        {
            name: "Focus Message Input",
            description: "Jump to the chat input box",
            category: "Chat",
            icon: "fas fa-keyboard",
            action: () => document.getElementById('message-input')?.focus()
        },
        {
            name: "Toggle Theme",
            description: "Switch between dark and light mode",
            category: "Settings",
            icon: "fas fa-adjust",
            action: () => {
                const current = document.body.className;
                const next = current === "light" ? "dark" : "light";
                document.body.className = next;
                localStorage.setItem('theme', next);
            }
        },
        {
            name: "Open Browser Control",
            description: "Show the browser control panel",
            category: "Browser",
            icon: "fas fa-globe",
            action: () => document.getElementById('browser-nav')?.click()
        },
        {
            name: "Launch Browser",
            description: "Launch a new browser instance",
            category: "Browser",
            icon: "fas fa-play",
            action: () => {
                document.getElementById('browser-nav')?.click();
                setTimeout(() => document.getElementById('browser-launch-btn')?.click(), 300);
            }
        }
        // Add more commands here as needed
    ];

    // --- Palette State ---
    let paletteOpen = false;
    let filtered = [];
    let selectedIdx = 0;

    // --- DOM Elements ---
    const palette = document.getElementById('command-palette');
    if (!palette) return;

    // --- Palette UI Template ---
    function renderPalette() {
        palette.innerHTML = `
            <div class="command-list" role="listbox" aria-label="Command Palette">
                <input type="text" id="palette-search" class="command-search" placeholder="Type a command..." aria-label="Search commands" autofocus autocomplete="off" spellcheck="false" />
                <div id="palette-commands"></div>
            </div>
        `;
        palette.style.left = "50%";
        palette.style.top = "20%";
        palette.style.transform = "translateX(-50%)";
        palette.style.minWidth = "350px";
        palette.style.maxWidth = "500px";
    }

    // --- Fuzzy Search ---
    function fuzzyMatch(query, cmd) {
        query = query.toLowerCase();
        const hay = (cmd.name + " " + cmd.description + " " + cmd.category).toLowerCase();
        if (!query) return 1;
        let score = 0, lastIdx = -1;
        for (let c of query) {
            let idx = hay.indexOf(c, lastIdx + 1);
            if (idx === -1) return 0;
            score += 1;
            lastIdx = idx;
        }
        return score / hay.length;
    }

    function filterCommands(query) {
        return commands
            .map(cmd => ({ cmd, score: fuzzyMatch(query, cmd) }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(x => x.cmd);
    }

    // --- Render Command List ---
    function updateCommandList(query = "") {
        filtered = filterCommands(query);
        selectedIdx = 0;
        const container = palette.querySelector('#palette-commands');
        if (!container) return;
        if (filtered.length === 0) {
            container.innerHTML = `<div class="command-item" style="opacity:0.6;">No commands found</div>`;
            return;
        }
        let lastCat = "";
        container.innerHTML = filtered.map((cmd, i) => {
            let catHeader = "";
            if (cmd.category !== lastCat) {
                catHeader = `<div class="command-category" style="margin:8px 0 2px 0;font-size:12px;color:#888;">
                    <i class="${cmd.icon}" style="margin-right:6px;"></i>${cmd.category}
                </div>`;
                lastCat = cmd.category;
            }
            return catHeader + `
                <div class="command-item${i === selectedIdx ? " active" : ""}" role="option" tabindex="-1" data-idx="${i}">
                    <span>
                        <i class="${cmd.icon}" style="margin-right:10px;"></i>
                        <span class="command-name">${cmd.name}</span>
                        <span class="command-description" style="margin-left:10px;">${cmd.description}</span>
                    </span>
                </div>
            `;
        }).join("");
        highlightSelected();
    }

    function highlightSelected() {
        palette.querySelectorAll('.command-item').forEach((el, i) => {
            if (i === selectedIdx) el.classList.add('active');
            else el.classList.remove('active');
        });
    }

    // --- Keyboard Navigation ---
    function handlePaletteKey(e) {
        const searchInput = palette.querySelector('#palette-search');
        if (!paletteOpen) return;
        if (e.key === "ArrowDown") {
            selectedIdx = Math.min(filtered.length - 1, selectedIdx + 1);
            highlightSelected();
            scrollSelectedIntoView();
            e.preventDefault();
        } else if (e.key === "ArrowUp") {
            selectedIdx = Math.max(0, selectedIdx - 1);
            highlightSelected();
            scrollSelectedIntoView();
            e.preventDefault();
        } else if (e.key === "Enter") {
            if (filtered[selectedIdx]) {
                closePalette();
                setTimeout(() => filtered[selectedIdx].action(), 10);
            }
            e.preventDefault();
        } else if (e.key === "Escape") {
            closePalette();
            e.preventDefault();
        } else if (e.key === "Tab") {
            // Prevent tabbing out
            e.preventDefault();
        } else if (e.target === searchInput) {
            updateCommandList(searchInput.value);
        }
    }

    function scrollSelectedIntoView() {
        const items = palette.querySelectorAll('.command-item');
        if (items[selectedIdx]) {
            items[selectedIdx].scrollIntoView({ block: "nearest" });
        }
    }

    // --- Open/Close Logic ---
    function openPalette() {
        if (paletteOpen) return;
        paletteOpen = true;
        renderPalette();
        palette.classList.add('active');
        updateCommandList("");
        setTimeout(() => {
            const input = palette.querySelector('#palette-search');
            if (input) {
                input.focus();
                input.addEventListener('input', e => updateCommandList(e.target.value));
            }
        }, 10);
        document.addEventListener('keydown', handlePaletteKey, true);
    }

    function closePalette() {
        paletteOpen = false;
        palette.classList.remove('active');
        palette.innerHTML = "";
        document.removeEventListener('keydown', handlePaletteKey, true);
    }

    // --- Global Shortcut (Ctrl+K) ---
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && !paletteOpen) {
            openPalette();
            e.preventDefault();
        }
    });

    // --- Accessibility: trap focus, close on blur ---
    palette.addEventListener('blur', function (e) {
        if (paletteOpen) closePalette();
    }, true);

    // --- Click outside to close ---
    document.addEventListener('mousedown', function (e) {
        if (paletteOpen && !palette.contains(e.target)) closePalette();
    });

    // --- Initial CSS fix for overlay position ---
    palette.style.position = "fixed";
    palette.style.left = "50%";
    palette.style.top = "20%";
    palette.style.transform = "translateX(-50%)";
    palette.style.minWidth = "350px";
    palette.style.maxWidth = "500px";
    palette.style.width = "90vw";
})();
// === KYNSEY Smart Typing Indicator API ===
window.KynseyIndicator = {
  show: (msg = "KYNSEY is thinking...") => {
    const el = document.getElementById('kynseyIndicator');
    if (el && typeof el.show === 'function') el.show(msg);
  },
  hide: () => {
    const el = document.getElementById('kynseyIndicator');
    if (el && typeof el.hide === 'function') el.hide();
  }
};
