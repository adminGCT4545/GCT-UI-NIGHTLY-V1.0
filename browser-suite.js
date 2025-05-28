// Browser Suite Module for GCT UI
(function() {
    'use strict';

    // Browser Suite namespace
    window.BrowserSuite = {
        // State management
        state: {
            isOpen: false,
            currentMode: 'control',
            browserSession: null,
            recordedActions: [],
            macros: [],
            panels: {
                actionsPanel: true,
                previewPanel: true,
                devToolsPanel: false
            },
            zoom: 100,
            coordinatePickerActive: false,
            currentUrl: '',
            browserConnected: false
        },

        // Initialize the browser suite
        init: function() {
            console.log('[BrowserSuite] Initializing Browser Suite...');
            this.initializeEventListeners();
            this.initializeDragAndDrop();
            this.initializePanelResizing();
            this.initializeCoordinatePicker();
            this.loadSavedMacros();
        },

        // Initialize event listeners
        initializeEventListeners: function() {
            // Open/Close suite
            const closeSuiteBtn = document.getElementById('close-browser-suite');
            if (closeSuiteBtn) {
                closeSuiteBtn.addEventListener('click', () => this.closeSuite());
            }

            const backToPanel = document.getElementById('browser-back-to-panel');
            if (backToPanel) {
                backToPanel.addEventListener('click', () => this.closeSuite());
            }

            // View mode switching
            document.querySelectorAll('.browser-view-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => this.switchViewMode(btn.dataset.mode));
            });

            // Panel toggles
            document.querySelectorAll('.browser-panel-toggle').forEach(btn => {
                btn.addEventListener('click', () => this.togglePanel(btn.dataset.panel));
            });

            // Tab switching
            document.querySelectorAll('.browser-panel-tab').forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });

            // Action buttons
            document.getElementById('browser-suite-record')?.addEventListener('click', () => this.toggleRecording());
            document.getElementById('browser-suite-play')?.addEventListener('click', () => this.playRecording());
            document.getElementById('browser-suite-save-macro')?.addEventListener('click', () => this.saveMacro());
            
            // Export and share
            document.getElementById('browser-suite-export')?.addEventListener('click', () => this.exportSession());
            document.getElementById('browser-suite-share')?.addEventListener('click', () => this.shareSession());

            // Zoom controls
            document.getElementById('browser-zoom-in-suite')?.addEventListener('click', () => this.zoomIn());
            document.getElementById('browser-zoom-out-suite')?.addEventListener('click', () => this.zoomOut());
            document.getElementById('browser-zoom-reset-suite')?.addEventListener('click', () => this.zoomReset());

            // Coordinate picker
            document.getElementById('browser-coord-picker')?.addEventListener('click', () => this.toggleCoordinatePicker());

            // DevTools toggle
            document.getElementById('browser-devtools-toggle')?.addEventListener('click', () => this.toggleDevTools());

            // Quick actions
            this.initializeQuickActions();
        },

        // Open the browser suite with enhanced initialization
        openSuite: function() {
            const modal = document.getElementById('browser-suite-modal');
            if (!modal) {
                console.error('[BrowserSuite] Suite modal not found!');
                return;
            }

            // Ensure proper initialization
            if (!this.state.initialized) {
                this.initializeEventListeners();
                this.initializeDragAndDrop();
                this.initializePanelResizing();
                this.initializeCoordinatePicker();
                this.loadSavedMacros();
                this.state.initialized = true;
            }

            // Show modal
            modal.style.display = 'block';
            setTimeout(() => {
                modal.classList.add('active');
                this.state.isOpen = true;
                document.body.style.overflow = 'hidden';
                
                // Transfer current browser session
                this.transferSession();
                
                // Initialize preview
                this.updatePreview();
                
                console.log('[BrowserSuite] Suite opened and initialized');
            }, 50);

            // Setup escape key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state.isOpen) {
                    this.closeSuite();
                }
            });
        },

        // Close the browser suite with proper cleanup
        closeSuite: function() {
            const modal = document.getElementById('browser-suite-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    this.state.isOpen = false;
                    document.body.style.overflow = '';
                    
                    // Clean up any active features
                    if (this.state.coordinatePickerActive) {
                        this.stopCoordinatePicker();
                    }
                    if (this.state.isRecording) {
                        this.stopActionRecording();
                    }
                    
                    console.log('[BrowserSuite] Suite closed with cleanup');
                }, 300); // Match transition duration
            }
        },

        // Switch view mode
        switchViewMode: function(mode) {
            this.state.currentMode = mode;
            
            // Update button states
            document.querySelectorAll('.browser-view-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            // Update view
            const views = {
                control: this.showControlView.bind(this),
                automation: this.showAutomationView.bind(this),
                developer: this.showDeveloperView.bind(this)
            };

            if (views[mode]) {
                views[mode]();
            }

            console.log(`[BrowserSuite] Switched to ${mode} mode`);
        },

        // Show control view
        showControlView: function() {
            // Show standard browser control interface
            document.getElementById('browser-control-view')?.classList.add('active');
            document.getElementById('browser-automation-view')?.classList.remove('active');
            document.getElementById('browser-developer-view')?.classList.remove('active');
        },

        // Show automation view
        showAutomationView: function() {
            // Show macro recording and playback interface
            document.getElementById('browser-control-view')?.classList.remove('active');
            document.getElementById('browser-automation-view')?.classList.add('active');
            document.getElementById('browser-developer-view')?.classList.remove('active');
            
            this.loadMacrosList();
        },

        // Show developer view
        showDeveloperView: function() {
            // Show developer tools and debugging interface
            document.getElementById('browser-control-view')?.classList.remove('active');
            document.getElementById('browser-automation-view')?.classList.remove('active');
            document.getElementById('browser-developer-view')?.classList.add('active');
            
            this.loadConsoleOutput();
        },

        // Toggle panel visibility
        togglePanel: function(panelId) {
            const panel = document.getElementById(panelId);
            if (panel) {
                const isCollapsed = panel.classList.toggle('collapsed');
                this.state.panels[panelId] = !isCollapsed;
                
                // Update toggle button icon
                const toggleBtn = panel.querySelector('.browser-panel-toggle');
                if (toggleBtn) {
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        if (panelId === 'browser-actions-panel') {
                            icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
                        } else {
                            icon.className = isCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
                        }
                    }
                }
            }
        },

        // Switch tab
        switchTab: function(tabName) {
            // Update tab buttons
            document.querySelectorAll('.browser-panel-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });

            // Update tab content
            document.querySelectorAll('.browser-tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `browser-${tabName}-tab`);
            });
        },

        // Transfer session from side panel
        transferSession: function() {
            if (window.browserUltimate && window.browserUltimate.getSessionInfo) {
                const sessionInfo = window.browserUltimate.getSessionInfo();
                this.state.browserSession = sessionInfo;
                this.state.currentUrl = sessionInfo.url || '';
                this.state.browserConnected = sessionInfo.active || false;
                
                // Update UI with session info
                this.updateSessionDisplay();
            }
        },

        // Update session display
        updateSessionDisplay: function() {
            const urlDisplay = document.getElementById('browser-suite-url');
            const statusDisplay = document.getElementById('browser-suite-status');
            
            if (urlDisplay) {
                urlDisplay.textContent = this.state.currentUrl || 'No active session';
            }
            
            if (statusDisplay) {
                statusDisplay.innerHTML = this.state.browserConnected ? 
                    '<span style="color: #51cf66;">● Connected</span>' :
                    '<span style="color: #ff6b6b;">● Disconnected</span>';
            }
        },

        // Recording functionality
        toggleRecording: function() {
            const isRecording = this.state.isRecording;
            this.state.isRecording = !isRecording;
            
            const recordBtn = document.getElementById('browser-suite-record');
            if (recordBtn) {
                recordBtn.classList.toggle('recording', !isRecording);
                recordBtn.innerHTML = !isRecording ? 
                    '<i class="fas fa-stop"></i> Stop' : 
                    '<i class="fas fa-circle"></i> Record';
            }
            
            if (!isRecording) {
                // Start recording
                this.state.recordedActions = [];
                this.startActionRecording();
            } else {
                // Stop recording
                this.stopActionRecording();
            }
        },

        // Start recording browser actions
        startActionRecording: function() {
            // Hook into browser control actions
            if (window.browserUltimate && window.browserUltimate.onAction) {
                window.browserUltimate.onAction((action) => {
                    this.state.recordedActions.push({
                        type: action.type,
                        params: action.params,
                        timestamp: Date.now()
                    });
                    this.updateRecordingDisplay();
                });
            }
        },

        // Stop recording
        stopActionRecording: function() {
            if (window.browserUltimate && window.browserUltimate.onAction) {
                window.browserUltimate.onAction(null);
            }
        },

        // Play recorded actions
        playRecording: async function() {
            if (this.state.recordedActions.length === 0) {
                alert('No actions recorded');
                return;
            }
            
            const playBtn = document.getElementById('browser-suite-play');
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Playing...';
            }
            
            // Play each action with delay
            for (const action of this.state.recordedActions) {
                if (window.browserUltimate && window.browserUltimate.executeAction) {
                    await window.browserUltimate.executeAction(action.type, action.params);
                    await this.delay(500); // 500ms delay between actions
                }
            }
            
            if (playBtn) {
                playBtn.disabled = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            }
        },

        // Save macro
        saveMacro: function() {
            if (this.state.recordedActions.length === 0) {
                alert('No actions to save');
                return;
            }
            
            const name = prompt('Enter macro name:');
            if (name) {
                const macro = {
                    id: Date.now().toString(),
                    name: name,
                    actions: [...this.state.recordedActions],
                    created: new Date().toISOString()
                };
                
                this.state.macros.push(macro);
                this.saveMacrosToStorage();
                this.updateMacrosDisplay();
                
                alert('Macro saved successfully');
            }
        },

        // Load saved macros
        loadSavedMacros: function() {
            const saved = localStorage.getItem('browserSuiteMacros');
            if (saved) {
                try {
                    this.state.macros = JSON.parse(saved);
                } catch (e) {
                    console.error('[BrowserSuite] Failed to load macros:', e);
                }
            }
        },

        // Save macros to storage
        saveMacrosToStorage: function() {
            try {
                localStorage.setItem('browserSuiteMacros', JSON.stringify(this.state.macros));
            } catch (e) {
                console.error('[BrowserSuite] Failed to save macros:', e);
            }
        },

        // Zoom controls
        zoomIn: async function() {
            this.state.zoom = Math.min(this.state.zoom + 25, 200);
            await this.updateZoom();
        },

        zoomOut: async function() {
            this.state.zoom = Math.max(this.state.zoom - 25, 25);
            await this.updateZoom();
        },

        zoomReset: async function() {
            this.state.zoom = 100;
            await this.updateZoom();
        },

        updateZoom: async function() {
            // Update display
            const zoomDisplay = document.getElementById('browser-zoom-display');
            if (zoomDisplay) {
                zoomDisplay.textContent = `${this.state.zoom}%`;
            }
            
            // Update actual browser viewport if connected
            if (this.state.browserConnected && window.browserUltimate && window.browserUltimate.setZoom) {
                try {
                    await window.browserUltimate.setZoom(this.state.zoom);
                    console.log(`[BrowserSuite] Browser zoom set to ${this.state.zoom}%`);
                } catch (error) {
                    console.error('[BrowserSuite] Failed to set browser zoom:', error);
                }
            }
            
            // Also update preview scale for visual feedback
            const preview = document.getElementById('browser-suite-preview');
            if (preview) {
                preview.style.transform = `scale(${this.state.zoom / 100})`;
            }
        },

        // Coordinate picker
        toggleCoordinatePicker: function() {
            this.state.coordinatePickerActive = !this.state.coordinatePickerActive;
            
            const pickerBtn = document.getElementById('browser-coord-picker');
            if (pickerBtn) {
                pickerBtn.classList.toggle('active', this.state.coordinatePickerActive);
            }
            
            if (this.state.coordinatePickerActive) {
                this.startCoordinatePicker();
            } else {
                this.stopCoordinatePicker();
            }
        },

        startCoordinatePicker: function() {
            const preview = document.getElementById('browser-suite-preview');
            if (preview) {
                preview.style.cursor = 'crosshair';
                preview.addEventListener('click', this.handleCoordinatePick);
                preview.addEventListener('mousemove', this.handleCoordinateHover);
            }
        },

        stopCoordinatePicker: function() {
            const preview = document.getElementById('browser-suite-preview');
            if (preview) {
                preview.style.cursor = '';
                preview.removeEventListener('click', this.handleCoordinatePick);
                preview.removeEventListener('mousemove', this.handleCoordinateHover);
            }
        },

        handleCoordinatePick: function(e) {
            const rect = e.target.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) * (100 / BrowserSuite.state.zoom));
            const y = Math.round((e.clientY - rect.top) * (100 / BrowserSuite.state.zoom));
            
            // Execute click at coordinates
            if (window.browserUltimate && window.browserUltimate.executeAction) {
                window.browserUltimate.executeAction('click', { x, y });
            }
            
            // Stop picker
            BrowserSuite.toggleCoordinatePicker();
        },

        handleCoordinateHover: function(e) {
            const rect = e.target.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) * (100 / BrowserSuite.state.zoom));
            const y = Math.round((e.clientY - rect.top) * (100 / BrowserSuite.state.zoom));
            
            const display = document.getElementById('browser-coord-display');
            if (display) {
                display.textContent = `${x}, ${y}`;
            }
        },

        // Update preview
        updatePreview: function() {
            // Get latest screenshot from browser control
            if (window.browserUltimate && window.browserUltimate.getScreenshot) {
                const screenshot = window.browserUltimate.getScreenshot();
                if (screenshot) {
                    const preview = document.getElementById('browser-suite-preview');
                    if (preview) {
                        preview.src = screenshot;
                    }
                }
            }
        },

        // Initialize drag and drop for panels
        initializeDragAndDrop: function() {
            // Implement panel drag and drop functionality
            console.log('[BrowserSuite] Drag and drop initialized');
        },

        // Initialize panel resizing
        initializePanelResizing: function() {
            // Implement panel resizing functionality
            console.log('[BrowserSuite] Panel resizing initialized');
        },

        // Initialize coordinate picker
        initializeCoordinatePicker: function() {
            // Set up coordinate picker overlay
            console.log('[BrowserSuite] Coordinate picker initialized');
        },

        // Initialize quick actions
        initializeQuickActions: function() {
            // Set up quick action buttons
            console.log('[BrowserSuite] Quick actions initialized');
        },

        // Load macros list
        loadMacrosList: function() {
            const macrosList = document.getElementById('browser-macros-list');
            if (macrosList) {
                macrosList.innerHTML = '';
                
                this.state.macros.forEach(macro => {
                    const item = document.createElement('div');
                    item.className = 'macro-item';
                    item.innerHTML = `
                        <div class="macro-info">
                            <h4>${macro.name}</h4>
                            <span>${macro.actions.length} actions</span>
                        </div>
                        <div class="macro-actions">
                            <button onclick="BrowserSuite.playMacro('${macro.id}')" class="macro-btn">
                                <i class="fas fa-play"></i>
                            </button>
                            <button onclick="BrowserSuite.deleteMacro('${macro.id}')" class="macro-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    macrosList.appendChild(item);
                });
            }
        },

        // Play specific macro
        playMacro: async function(macroId) {
            const macro = this.state.macros.find(m => m.id === macroId);
            if (macro) {
                this.state.recordedActions = macro.actions;
                await this.playRecording();
            }
        },

        // Delete macro
        deleteMacro: function(macroId) {
            if (confirm('Delete this macro?')) {
                this.state.macros = this.state.macros.filter(m => m.id !== macroId);
                this.saveMacrosToStorage();
                this.loadMacrosList();
            }
        },

        // Load console output
        loadConsoleOutput: function() {
            // Load browser console output for developer view
            if (window.browserUltimate && window.browserUltimate.getConsoleOutput) {
                const output = window.browserUltimate.getConsoleOutput();
                const consoleEl = document.getElementById('browser-dev-console');
                if (consoleEl) {
                    consoleEl.innerHTML = output;
                }
            }
        },

        // Export session
        exportSession: function() {
            const data = {
                url: this.state.currentUrl,
                macros: this.state.macros,
                recordedActions: this.state.recordedActions,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `browser-session-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        // Share session
        shareSession: function() {
            // Implement session sharing functionality
            alert('Share functionality coming soon!');
        },

        // Toggle DevTools
        toggleDevTools: function() {
            this.state.panels.devToolsPanel = !this.state.panels.devToolsPanel;
            this.togglePanel('browser-devtools-panel');
        },

        // Update recording display
        updateRecordingDisplay: function() {
            const display = document.getElementById('browser-recording-display');
            if (display) {
                display.innerHTML = `
                    <div class="recording-status">
                        <i class="fas fa-circle recording-dot"></i>
                        Recording: ${this.state.recordedActions.length} actions
                    </div>
                `;
            }
        },

        // Utility: delay function
        delay: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BrowserSuite.init());
    } else {
        BrowserSuite.init();
    }
})();