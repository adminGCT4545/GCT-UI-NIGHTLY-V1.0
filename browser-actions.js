// Browser Actions Module - Advanced action handling and recording
const BrowserActions = (function() {
    'use strict';
    
    // Module state
    let isRecording = false;
    let recordedActions = [];
    let coordinatePicker = null;
    let elementHighlighter = null;
    let actionSequences = {};
    let playbackQueue = [];
    let isPlaying = false;
    
    // Smart element detection patterns
    const elementPatterns = {
        button: {
            selectors: ['button', 'input[type="submit"]', 'input[type="button"]', 'a.btn', '[role="button"]'],
            keywords: ['click', 'submit', 'continue', 'next', 'login', 'search', 'save']
        },
        input: {
            selectors: ['input[type="text"]', 'input[type="email"]', 'input[type="password"]', 'textarea'],
            keywords: ['type', 'enter', 'fill', 'input']
        },
        link: {
            selectors: ['a[href]'],
            keywords: ['link', 'navigate', 'go to']
        },
        dropdown: {
            selectors: ['select'],
            keywords: ['select', 'choose', 'dropdown']
        }
    };
    
    // Initialize the module
    function init() {
        console.log('[BrowserActions] Initializing...');
        
        // Create coordinate picker overlay
        createCoordinatePicker();
        
        // Create element highlighter
        createElementHighlighter();
        
        // Set up recording controls
        setupRecordingControls();
        
        // Load saved sequences
        loadSavedSequences();
        
        console.log('[BrowserActions] Initialization complete');
    }
    
    // Create coordinate picker overlay
    function createCoordinatePicker() {
        const picker = document.createElement('div');
        picker.id = 'browser-coordinate-picker';
        picker.className = 'coordinate-picker';
        picker.innerHTML = `
            <div class="picker-crosshair"></div>
            <div class="picker-tooltip">
                <span class="picker-coords"></span>
                <span class="picker-hint">Click to select</span>
            </div>
            <div class="picker-grid"></div>
        `;
        picker.style.display = 'none';
        document.body.appendChild(picker);
        
        coordinatePicker = picker;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .coordinate-picker {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10000;
                display: none;
            }
            
            .coordinate-picker.active {
                pointer-events: auto;
                display: block;
            }
            
            .picker-crosshair {
                position: absolute;
                width: 1px;
                height: 100%;
                background: rgba(59, 130, 246, 0.5);
                pointer-events: none;
            }
            
            .picker-crosshair::before {
                content: '';
                position: absolute;
                width: 100vw;
                height: 1px;
                background: rgba(59, 130, 246, 0.5);
                left: -50vw;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .picker-tooltip {
                position: absolute;
                background: rgba(17, 24, 39, 0.95);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                white-space: nowrap;
                pointer-events: none;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                transform: translate(10px, -50%);
            }
            
            .picker-coords {
                font-weight: bold;
                color: #3b82f6;
                margin-right: 8px;
            }
            
            .picker-hint {
                color: #9ca3af;
            }
            
            .picker-grid {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: 
                    repeating-linear-gradient(0deg, rgba(59, 130, 246, 0.1) 0px, transparent 1px, transparent 20px, rgba(59, 130, 246, 0.1) 21px),
                    repeating-linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0px, transparent 1px, transparent 20px, rgba(59, 130, 246, 0.1) 21px);
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
            }
            
            .coordinate-picker.active .picker-grid {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create element highlighter
    function createElementHighlighter() {
        const highlighter = document.createElement('div');
        highlighter.id = 'browser-element-highlighter';
        highlighter.className = 'element-highlighter';
        highlighter.style.display = 'none';
        document.body.appendChild(highlighter);
        
        elementHighlighter = highlighter;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .element-highlighter {
                position: fixed;
                border: 2px solid #3b82f6;
                background: rgba(59, 130, 246, 0.1);
                pointer-events: none;
                z-index: 9999;
                transition: all 0.2s;
                border-radius: 4px;
            }
            
            .element-highlighter::before {
                content: attr(data-element-info);
                position: absolute;
                bottom: 100%;
                left: 0;
                background: rgba(17, 24, 39, 0.95);
                color: white;
                padding: 4px 8px;
                font-size: 11px;
                border-radius: 4px;
                white-space: nowrap;
                margin-bottom: 4px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set up recording controls
    function setupRecordingControls() {
        // Add recording button to browser control panel
        const controlPanel = document.getElementById('browser-control-panel');
        if (!controlPanel) return;
        
        const actionsSection = controlPanel.querySelector('.panel-section:nth-child(2)');
        if (!actionsSection) return;
        
        // Create recording controls
        const recordingControls = document.createElement('div');
        recordingControls.className = 'recording-controls';
        recordingControls.innerHTML = `
            <h4>Recording & Playback</h4>
            <div class="action-buttons">
                <button id="browser-record-btn" class="action-btn record-btn">
                    <i class="fas fa-circle"></i>
                    <span>Record</span>
                </button>
                <button id="browser-play-btn" class="action-btn" disabled>
                    <i class="fas fa-play"></i>
                    <span>Play</span>
                </button>
                <button id="browser-save-sequence-btn" class="action-btn" disabled>
                    <i class="fas fa-save"></i>
                    <span>Save</span>
                </button>
            </div>
            <div id="recording-status" class="recording-status"></div>
            <div id="recorded-actions-list" class="recorded-actions"></div>
        `;
        
        actionsSection.appendChild(recordingControls);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .recording-controls {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .recording-controls h4 {
                margin-bottom: 10px;
                color: #e5e7eb;
            }
            
            .record-btn.recording {
                background: #dc2626 !important;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            .recording-status {
                margin-top: 10px;
                font-size: 12px;
                color: #9ca3af;
            }
            
            .recording-status.active {
                color: #dc2626;
                font-weight: bold;
            }
            
            .recorded-actions {
                margin-top: 10px;
                max-height: 150px;
                overflow-y: auto;
                font-size: 12px;
            }
            
            .recorded-action-item {
                padding: 4px 8px;
                margin-bottom: 2px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .recorded-action-item .action-type {
                color: #3b82f6;
                font-weight: bold;
            }
            
            .recorded-action-item .action-detail {
                color: #9ca3af;
                margin-left: 8px;
            }
            
            .recorded-action-item button {
                background: none;
                border: none;
                color: #ef4444;
                cursor: pointer;
                padding: 2px 6px;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            
            .recorded-action-item button:hover {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
        
        // Set up event listeners
        document.getElementById('browser-record-btn')?.addEventListener('click', toggleRecording);
        document.getElementById('browser-play-btn')?.addEventListener('click', playRecording);
        document.getElementById('browser-save-sequence-btn')?.addEventListener('click', saveSequence);
    }
    
    // Enable coordinate picker
    function enableCoordinatePicker(callback) {
        if (!coordinatePicker) return;
        
        coordinatePicker.classList.add('active');
        
        const crosshair = coordinatePicker.querySelector('.picker-crosshair');
        const tooltip = coordinatePicker.querySelector('.picker-tooltip');
        const coords = coordinatePicker.querySelector('.picker-coords');
        
        function updatePosition(e) {
            crosshair.style.left = e.clientX + 'px';
            tooltip.style.left = e.clientX + 'px';
            tooltip.style.top = e.clientY + 'px';
            
            // Update coordinates based on browser preview
            const previewImage = document.getElementById('browser-preview-image');
            if (previewImage) {
                const rect = previewImage.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    const x = Math.round((e.clientX - rect.left) * (900 / rect.width));
                    const y = Math.round((e.clientY - rect.top) * (600 / rect.height));
                    coords.textContent = `${x}, ${y}`;
                } else {
                    coords.textContent = 'Outside preview';
                }
            }
        }
        
        function handleClick(e) {
            const previewImage = document.getElementById('browser-preview-image');
            if (previewImage) {
                const rect = previewImage.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    const x = Math.round((e.clientX - rect.left) * (900 / rect.width));
                    const y = Math.round((e.clientY - rect.top) * (600 / rect.height));
                    
                    // Disable picker
                    disableCoordinatePicker();
                    
                    // Call callback with coordinates
                    if (callback) {
                        callback(x, y);
                    }
                }
            }
        }
        
        coordinatePicker.addEventListener('mousemove', updatePosition);
        coordinatePicker.addEventListener('click', handleClick);
        
        // Store handlers for cleanup
        coordinatePicker._updatePosition = updatePosition;
        coordinatePicker._handleClick = handleClick;
    }
    
    // Disable coordinate picker
    function disableCoordinatePicker() {
        if (!coordinatePicker) return;
        
        coordinatePicker.classList.remove('active');
        
        // Remove event listeners
        if (coordinatePicker._updatePosition) {
            coordinatePicker.removeEventListener('mousemove', coordinatePicker._updatePosition);
            coordinatePicker.removeEventListener('click', coordinatePicker._handleClick);
        }
    }
    
    // Toggle recording
    function toggleRecording() {
        const recordBtn = document.getElementById('browser-record-btn');
        const status = document.getElementById('recording-status');
        const playBtn = document.getElementById('browser-play-btn');
        const saveBtn = document.getElementById('browser-save-sequence-btn');
        
        if (!isRecording) {
            // Start recording
            isRecording = true;
            recordedActions = [];
            recordBtn.classList.add('recording');
            recordBtn.querySelector('span').textContent = 'Stop';
            status.textContent = 'Recording actions...';
            status.classList.add('active');
            
            // Disable play button during recording
            playBtn.disabled = true;
            saveBtn.disabled = true;
            
            console.log('[BrowserActions] Recording started');
            
            // Listen for browser actions
            window.addEventListener('browserAction', recordAction);
        } else {
            // Stop recording
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('span').textContent = 'Record';
            status.textContent = `Recorded ${recordedActions.length} actions`;
            status.classList.remove('active');
            
            // Enable play button if we have actions
            if (recordedActions.length > 0) {
                playBtn.disabled = false;
                saveBtn.disabled = false;
            }
            
            console.log('[BrowserActions] Recording stopped, actions:', recordedActions);
            
            // Stop listening for browser actions
            window.removeEventListener('browserAction', recordAction);
            
            // Update display
            updateRecordedActionsList();
        }
    }
    
    // Record an action
    function recordAction(event) {
        if (!isRecording) return;
        
        const { action, params, timestamp } = event.detail;
        
        // Don't record screenshot actions or close actions
        if (action === 'screenshot' || action === 'close') return;
        
        const recordedAction = {
            action,
            params,
            timestamp: timestamp || Date.now(),
            delay: recordedActions.length > 0 ? 
                   Date.now() - recordedActions[recordedActions.length - 1].timestamp : 
                   0
        };
        
        recordedActions.push(recordedAction);
        console.log('[BrowserActions] Recorded action:', recordedAction);
        
        // Update UI
        updateRecordedActionsList();
    }
    
    // Update recorded actions list
    function updateRecordedActionsList() {
        const list = document.getElementById('recorded-actions-list');
        if (!list) return;
        
        list.innerHTML = recordedActions.map((action, index) => {
            let detail = '';
            switch (action.action) {
                case 'launch':
                    detail = action.params.url || '';
                    break;
                case 'click':
                    detail = `at ${action.params.coordinate || 'unknown'}`;
                    break;
                case 'type':
                    detail = `"${action.params.text || ''}"`;
                    break;
                case 'scroll_up':
                case 'scroll_down':
                    detail = '';
                    break;
            }
            
            return `
                <div class="recorded-action-item">
                    <div>
                        <span class="action-type">${action.action}</span>
                        <span class="action-detail">${detail}</span>
                    </div>
                    <button onclick="BrowserActions.removeAction(${index})" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }
    
    // Remove an action from recording
    function removeAction(index) {
        recordedActions.splice(index, 1);
        updateRecordedActionsList();
        
        // Update button states
        const playBtn = document.getElementById('browser-play-btn');
        const saveBtn = document.getElementById('browser-save-sequence-btn');
        if (recordedActions.length === 0) {
            playBtn.disabled = true;
            saveBtn.disabled = true;
        }
    }
    
    // Play recording
    async function playRecording() {
        if (isPlaying || recordedActions.length === 0) return;
        
        isPlaying = true;
        const playBtn = document.getElementById('browser-play-btn');
        const recordBtn = document.getElementById('browser-record-btn');
        const status = document.getElementById('recording-status');
        
        playBtn.disabled = true;
        recordBtn.disabled = true;
        playBtn.innerHTML = '<i class="fas fa-stop"></i><span>Playing...</span>';
        
        console.log('[BrowserActions] Starting playback of', recordedActions.length, 'actions');
        
        for (let i = 0; i < recordedActions.length; i++) {
            const action = recordedActions[i];
            status.textContent = `Playing action ${i + 1} of ${recordedActions.length}: ${action.action}`;
            
            // Wait for delay
            if (action.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.min(action.delay, 3000)));
            }
            
            // Execute action
            try {
                await window.BrowserControlUI.executeAction(action.action, action.params);
            } catch (error) {
                console.error('[BrowserActions] Playback error:', error);
                status.textContent = `Error during playback: ${error.message}`;
                break;
            }
            
            // Small delay between actions for visibility
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        isPlaying = false;
        playBtn.disabled = false;
        recordBtn.disabled = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i><span>Play</span>';
        status.textContent = 'Playback complete';
        
        console.log('[BrowserActions] Playback complete');
    }
    
    // Save sequence
    function saveSequence() {
        if (recordedActions.length === 0) return;
        
        const name = prompt('Enter a name for this action sequence:');
        if (!name) return;
        
        const sequence = {
            name,
            actions: recordedActions,
            created: new Date().toISOString()
        };
        
        // Generate unique ID
        const id = `seq_${Date.now()}`;
        actionSequences[id] = sequence;
        
        // Save to localStorage
        try {
            localStorage.setItem('browserActionSequences', JSON.stringify(actionSequences));
            console.log('[BrowserActions] Saved sequence:', name);
            
            // Show success message
            const status = document.getElementById('recording-status');
            if (status) {
                status.textContent = `Saved sequence: ${name}`;
            }
            
            // Update sequences list if panel exists
            updateSequencesList();
        } catch (error) {
            console.error('[BrowserActions] Failed to save sequence:', error);
            alert('Failed to save sequence');
        }
    }
    
    // Load saved sequences
    function loadSavedSequences() {
        try {
            const saved = localStorage.getItem('browserActionSequences');
            if (saved) {
                actionSequences = JSON.parse(saved);
                console.log('[BrowserActions] Loaded', Object.keys(actionSequences).length, 'sequences');
            }
        } catch (error) {
            console.error('[BrowserActions] Failed to load sequences:', error);
        }
    }
    
    // Update sequences list
    function updateSequencesList() {
        // This would update a UI element showing saved sequences
        // For now, just log them
        console.log('[BrowserActions] Available sequences:', Object.values(actionSequences).map(s => s.name));
    }
    
    // Detect elements on page (simulation for now)
    function detectElements(screenshot) {
        // In a real implementation, this would analyze the screenshot
        // to find clickable elements, input fields, etc.
        // For now, return simulated data
        
        return {
            buttons: [
                { type: 'button', text: 'Search', coords: { x: 450, y: 350 }, confidence: 0.95 },
                { type: 'button', text: 'I\'m Feeling Lucky', coords: { x: 550, y: 350 }, confidence: 0.92 }
            ],
            inputs: [
                { type: 'input', placeholder: 'Search', coords: { x: 450, y: 300 }, confidence: 0.98 }
            ],
            links: []
        };
    }
    
    // Get element coordinates (for smart actions)
    function getElementCoordinates(elementDescription) {
        // This would use AI/ML to find elements based on description
        // For now, return center of preview
        return { x: 450, y: 300 };
    }
    
    // Highlight element on preview
    function highlightElement(x, y, width = 100, height = 40) {
        if (!elementHighlighter) return;
        
        const previewImage = document.getElementById('browser-preview-image');
        if (!previewImage) return;
        
        const rect = previewImage.getBoundingClientRect();
        const scaleX = rect.width / 900;
        const scaleY = rect.height / 600;
        
        elementHighlighter.style.left = rect.left + (x - width/2) * scaleX + 'px';
        elementHighlighter.style.top = rect.top + (y - height/2) * scaleY + 'px';
        elementHighlighter.style.width = width * scaleX + 'px';
        elementHighlighter.style.height = height * scaleY + 'px';
        elementHighlighter.style.display = 'block';
        
        // Hide after 2 seconds
        setTimeout(() => {
            elementHighlighter.style.display = 'none';
        }, 2000);
    }
    
    // Parse natural language command
    function parseNaturalLanguageCommand(command) {
        command = command.toLowerCase();
        
        // Check for action keywords
        for (const [elementType, config] of Object.entries(elementPatterns)) {
            for (const keyword of config.keywords) {
                if (command.includes(keyword)) {
                    // Extract target from command
                    const targetMatch = command.match(new RegExp(`${keyword}\\s+(?:on\\s+)?(.+)`));
                    if (targetMatch) {
                        return {
                            action: keyword === 'type' || keyword === 'enter' || keyword === 'fill' ? 'type' : 'click',
                            target: targetMatch[1].trim(),
                            elementType
                        };
                    }
                }
            }
        }
        
        return null;
    }
    
    // Public API
    return {
        init,
        enableCoordinatePicker,
        disableCoordinatePicker,
        toggleRecording,
        playRecording,
        saveSequence,
        removeAction,
        detectElements,
        getElementCoordinates,
        highlightElement,
        parseNaturalLanguageCommand,
        isRecording: () => isRecording,
        getRecordedActions: () => recordedActions,
        getSequences: () => actionSequences
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', BrowserActions.init);
} else {
    BrowserActions.init();
}

// Export for global access
window.BrowserActions = BrowserActions;