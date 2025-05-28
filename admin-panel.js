/**
 * Admin Panel - Provides advanced administrative controls
 * FIXED VERSION - Resolves syntax errors and initialization issues
 */

class AdminPanel {
    constructor() {
        this.panel = null;
        this.isInitialized = false;
        this.currentTab = 'users';
        this.state = {
            users: [],
            systemStats: { cpuUsage: 0, memoryUsage: 0, activeUsers: 0, apiRequests: 0 },
            apiKeys: [],
            modelSettings: { temperature: 0.7, maxTokens: 4096, topP: 0.9 }
        };
    }

    /**
     * Initialize the Admin Panel
     */
    init() {
        console.log('AdminPanel.init() called');
        if (this.isInitialized) {
            console.log('Already initialized, returning early');
            return;
        }
        
        try {
            this.createPanelHTML();
            this.bindEvents();
            this.loadInitialData();
            
            this.isInitialized = true;
            console.log('Admin Panel initialized successfully');
        } catch (error) {
            console.error('Failed to initialize admin panel:', error);
            this.showNotification('Failed to initialize admin panel', 'error');
        }
    }

    /**
     * Create HTML structure for the admin panel
     */
    createPanelHTML() {
        console.log('Creating panel HTML');
        
        // Remove existing panel if it exists
        const existingPanel = document.getElementById('admin-panel-container');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const panelHTML = `
            <div id="admin-panel-container" class="admin-panel-container">
                <div class="admin-panel-overlay"></div>
                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h2>Admin Panel</h2>
                        <button id="close-admin-panel" class="close-admin-panel" aria-label="Close Admin Panel">×</button>
                    </div>
                    
                    <div class="admin-panel-tabs">
                        <button class="admin-tab-btn active" data-tab="users">Users</button>
                        <button class="admin-tab-btn" data-tab="system">System</button>
                        <button class="admin-tab-btn" data-tab="api">API</button>
                        <button class="admin-tab-btn" data-tab="models">Models</button>
                    </div>
                    
                    <div class="admin-panel-content">
                        <!-- Users Tab -->
                        <div class="admin-tab-content active" id="users-tab">
                            <div class="admin-section">
                                <div class="admin-section-header">
                                    <h3>User Management</h3>
                                    <button class="action-button primary admin-action-btn" id="add-user-btn">+ Add User</button>
                                </div>
                                <div class="admin-table-container">
                                    <table class="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Username</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="users-table-body">
                                            <!-- User data will be populated here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- System Tab -->
                        <div class="admin-tab-content" id="system-tab">
                            <div class="admin-section">
                                <h3>System Analytics</h3>
                                <div class="admin-stats-grid">
                                    <div class="admin-stat-card">
                                        <div class="stat-title">CPU Usage</div>
                                        <div class="stat-value"><span id="cpu-usage">0</span>%</div>
                                        <div class="stat-progress">
                                            <div class="stat-progress-bar" id="cpu-progress-bar" style="width: 0%"></div>
                                        </div>
                                    </div>
                                    <div class="admin-stat-card">
                                        <div class="stat-title">Memory Usage</div>
                                        <div class="stat-value"><span id="memory-usage">0</span>%</div>
                                        <div class="stat-progress">
                                            <div class="stat-progress-bar" id="memory-progress-bar" style="width: 0%"></div>
                                        </div>
                                    </div>
                                    <div class="admin-stat-card">
                                        <div class="stat-title">Active Users</div>
                                        <div class="stat-value" id="active-users">0</div>
                                    </div>
                                    <div class="admin-stat-card">
                                        <div class="stat-title">API Requests</div>
                                        <div class="stat-value" id="api-requests">0</div>
                                    </div>
                                </div>
                            </div>
                            <div class="admin-section">
                                <h3>System Configuration</h3>
                                <div class="admin-form-group">
                                    <label for="max-connections">Max Connections:</label>
                                    <input type="number" id="max-connections" value="100" min="1" max="1000">
                                </div>
                                <div class="admin-form-group">
                                    <label for="timeout-setting">Request Timeout (ms):</label>
                                    <input type="number" id="timeout-setting" value="30000" min="1000" step="1000">
                                </div>
                                <div class="admin-form-group">
                                    <label for="logging-level">Logging Level:</label>
                                    <select id="logging-level">
                                        <option value="error">Error</option>
                                        <option value="warn">Warning</option>
                                        <option value="info" selected>Info</option>
                                        <option value="debug">Debug</option>
                                    </select>
                                </div>
                                <button class="action-button primary" id="save-system-config">Save Configuration</button>
                            </div>
                        </div>
                        
                        <!-- API Tab -->
                        <div class="admin-tab-content" id="api-tab">
                            <div class="admin-section">
                                <div class="admin-section-header">
                                    <h3>API Keys</h3>
                                    <button class="action-button primary admin-action-btn" id="generate-api-key-btn">+ Generate New Key</button>
                                </div>
                                <div class="admin-table-container">
                                    <table class="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Key Name</th>
                                                <th>API Key</th>
                                                <th>Created</th>
                                                <th>Last Used</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="api-keys-table-body">
                                            <!-- API key data will be populated here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="admin-section">
                                <h3>Rate Limiting</h3>
                                <div class="admin-form-group">
                                    <label for="rate-limit-max">Max Requests per Minute:</label>
                                    <input type="number" id="rate-limit-max" value="60" min="1">
                                </div>
                                <div class="admin-form-group">
                                    <label for="rate-limit-window">Rate Limit Window (seconds):</label>
                                    <input type="number" id="rate-limit-window" value="60" min="1">
                                </div>
                                <button class="action-button primary" id="save-rate-limit">Save Rate Limits</button>
                            </div>
                        </div>
                        
                        <!-- Models Tab -->
                        <div class="admin-tab-content" id="models-tab">
                            <div class="admin-section">
                                <h3>Model Settings</h3>
                                <div class="admin-form-group">
                                    <label for="model-temperature">Temperature:</label>
                                    <input type="range" id="model-temperature" min="0" max="1" step="0.1" value="0.7">
                                    <span id="temperature-value">0.7</span>
                                </div>
                                <div class="admin-form-group">
                                    <label for="model-max-tokens">Max Tokens:</label>
                                    <input type="number" id="model-max-tokens" value="4096" min="1">
                                </div>
                                <div class="admin-form-group">
                                    <label for="model-top-p">Top P:</label>
                                    <input type="range" id="model-top-p" min="0" max="1" step="0.1" value="0.9">
                                    <span id="top-p-value">0.9</span>
                                </div>
                                <button class="action-button primary" id="save-model-settings">Save Model Settings</button>
                            </div>
                            <div class="admin-section">
                                <div class="admin-section-header">
                                    <h3>Available Models</h3>
                                    <button class="action-button primary admin-action-btn" id="refresh-models-btn">↻ Refresh</button>
                                </div>
                                <div class="admin-table-container">
                                    <table class="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Model Name</th>
                                                <th>Status</th>
                                                <th>Context Length</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="models-table-body">
                                            <!-- Model data will be populated here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        this.panel = document.getElementById('admin-panel-container');
        console.log('Panel HTML created successfully:', this.panel);
    }

    /**
     * Bind event listeners to admin panel elements
     */
    bindEvents() {
        console.log('Binding events');
        
        // Close button
        const closeBtn = document.getElementById('close-admin-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Tab navigation
        const tabButtons = document.querySelectorAll('.admin-tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // Admin panel overlay (close when clicking outside)
        const overlay = document.querySelector('.admin-panel-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }
        
        // Bind form events
        this.bindFormEvents();
    }
    
    /**
     * Bind events for forms and interactive elements
     */
    bindFormEvents() {
        // Temperature range
        const temperatureRange = document.getElementById('model-temperature');
        const temperatureValue = document.getElementById('temperature-value');
        if (temperatureRange && temperatureValue) {
            temperatureRange.addEventListener('input', (e) => {
                temperatureValue.textContent = e.target.value;
                this.state.modelSettings.temperature = parseFloat(e.target.value);
            });
        }
        
        // Top P range
        const topPRange = document.getElementById('model-top-p');
        const topPValue = document.getElementById('top-p-value');
        if (topPRange && topPValue) {
            topPRange.addEventListener('input', (e) => {
                topPValue.textContent = e.target.value;
                this.state.modelSettings.topP = parseFloat(e.target.value);
            });
        }
        
        // Max tokens
        const maxTokensInput = document.getElementById('model-max-tokens');
        if (maxTokensInput) {
            maxTokensInput.addEventListener('change', (e) => {
                this.state.modelSettings.maxTokens = parseInt(e.target.value, 10);
            });
        }
        
        // Action buttons
        this.bindActionButtons();
    }
    
    /**
     * Bind action button events
     */
    bindActionButtons() {
        const buttonConfigs = [
            { id: 'add-user-btn', handler: () => this.showAddUserForm() },
            { id: 'generate-api-key-btn', handler: () => this.generateNewApiKey() },
            { id: 'save-system-config', handler: () => this.saveSystemConfig() },
            { id: 'save-rate-limit', handler: () => this.saveRateLimit() },
            { id: 'save-model-settings', handler: () => this.saveModelSettings() },
            { id: 'refresh-models-btn', handler: () => this.refreshModels() }
        ];
        
        buttonConfigs.forEach(({ id, handler }) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
        
        // Bind delete action handlers with event delegation
        this.bindDeleteHandlers();
    }
    
    /**
     * Open the admin panel
     */
    open() {
        console.log('AdminPanel.open() called');
        
        if (!this.isInitialized) {
            console.log('Admin panel not initialized, initializing now...');
            this.init();
        }
        
        if (this.panel) {
            console.log('Opening admin panel...');
            this.panel.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Update real-time data when opening
            this.updateSystemStats();
            
            // Add keyboard event listener for ESC key
            this.addKeyboardListeners();
        } else {
            console.error('Admin panel element not found. Panel was not properly initialized.');
            this.showNotification('Failed to open admin panel', 'error');
        }
    }
    
    /**
     * Close the admin panel
     */
    close() {
        console.log('AdminPanel.close() called');
        
        if (this.panel) {
            this.panel.classList.remove('active');
            document.body.style.overflow = '';
            
            // Remove keyboard event listeners
            this.removeKeyboardListeners();
        }
    }
    
    /**
     * Add keyboard event listeners
     */
    addKeyboardListeners() {
        this.keyboardHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.keyboardHandler);
    }
    
    /**
     * Remove keyboard event listeners
     */
    removeKeyboardListeners() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    }
    
    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        if (tabName === this.currentTab) return;
        
        // Update tab buttons
        const allTabButtons = document.querySelectorAll('.admin-tab-btn');
        allTabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        const allTabContents = document.querySelectorAll('.admin-tab-content');
        allTabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }
    
    /**
     * Load data specific to the active tab
     */
    loadTabData(tabName) {
        switch (tabName) {
            case 'system':
                this.updateSystemStats();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'api':
                this.loadApiKeys();
                break;
            case 'models':
                this.loadModels();
                break;
        }
    }
    
    /**
     * Load initial data for the admin panel
     */
    loadInitialData() {
        console.log('Loading initial data');
        
        // Load demo data
        this.loadDemoData();
        
        // Update system stats periodically
        this.statsInterval = setInterval(() => {
            if (this.panel && this.panel.classList.contains('active') && this.currentTab === 'system') {
                this.updateSystemStats();
            }
        }, 5000);
    }
    
    /**
     * Load demo data for testing
     */
    loadDemoData() {
        // Demo users
        this.state.users = [
            { id: 1, username: 'admin', email: 'admin@example.com', role: 'Administrator', status: 'Active' },
            { id: 2, username: 'john_doe', email: 'john@example.com', role: 'Editor', status: 'Active' },
            { id: 3, username: 'jane_smith', email: 'jane@example.com', role: 'Viewer', status: 'Inactive' }
        ];
        
        // Demo API keys
        this.state.apiKeys = [
            { id: 1, name: 'Production API', key: 'kyn_prd_' + this.generateRandomString(24), created: '2025-04-15', lastUsed: '2025-05-21' },
            { id: 2, name: 'Development API', key: 'kyn_dev_' + this.generateRandomString(24), created: '2025-04-20', lastUsed: '2025-05-20' }
        ];
        
        // Demo models
        this.state.models = [
            { id: 1, name: 'kynsey-7b', status: 'Active', contextLength: 8192 },
            { id: 2, name: 'kynsey-13b', status: 'Active', contextLength: 16384 },
            { id: 3, name: 'kynsey-70b', status: 'Loading', contextLength: 32768 }
        ];
        
        // Render the demo data
        this.renderUsers();
        this.renderApiKeys();
        this.renderModels();
    }
    
    /**
     * Generate a random string for demo purposes
     */
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * Show user dialog for add/edit
     */
    showUserDialog(user = null) {
        const isEdit = !!user;
        const dialogTitle = isEdit ? 'Edit User' : 'Add New User';
        
        const dialogContainer = document.createElement('div');
        dialogContainer.className = 'admin-confirm-dialog-container';
        dialogContainer.innerHTML = `
            <div class="admin-confirm-dialog user-dialog">
                <div class="confirm-dialog-header">
                    <h3>${dialogTitle}</h3>
                </div>
                <form id="user-form" class="admin-user-form">
                    <div class="confirm-dialog-body">
                        <div class="admin-form-group">
                            <label for="user-username">Username <span class="required">*</span></label>
                            <input type="text" id="user-username" name="username" value="${user?.username || ''}" required minlength="3" maxlength="50">
                            <span class="error-message" id="username-error"></span>
                        </div>
                        <div class="admin-form-group">
                            <label for="user-email">Email <span class="required">*</span></label>
                            <input type="email" id="user-email" name="email" value="${user?.email || ''}" required>
                            <span class="error-message" id="email-error"></span>
                        </div>
                        <div class="admin-form-group">
                            <label for="user-role">Role <span class="required">*</span></label>
                            <select id="user-role" name="role" required>
                                <option value="">Select a role</option>
                                <option value="Administrator" ${user?.role === 'Administrator' ? 'selected' : ''}>Administrator</option>
                                <option value="Editor" ${user?.role === 'Editor' ? 'selected' : ''}>Editor</option>
                                <option value="Viewer" ${user?.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                            </select>
                            <span class="error-message" id="role-error"></span>
                        </div>
                        <div class="admin-form-group">
                            <label for="user-status">Status</label>
                            <select id="user-status" name="status">
                                <option value="Active" ${!user || user?.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Inactive" ${user?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div class="confirm-dialog-footer">
                        <button type="button" class="action-button neutral" id="user-cancel">Cancel</button>
                        <button type="submit" class="action-button primary" id="user-save">${isEdit ? 'Update' : 'Create'} User</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(dialogContainer);
        
        // Get form elements
        const form = document.getElementById('user-form');
        const cancelBtn = document.getElementById('user-cancel');
        const usernameInput = document.getElementById('user-username');
        const emailInput = document.getElementById('user-email');
        const roleSelect = document.getElementById('user-role');
        
        // Focus first input
        setTimeout(() => usernameInput.focus(), 100);
        
        // Close dialog function
        const closeDialog = () => {
            dialogContainer.remove();
        };
        
        // Validation functions
        const validateUsername = () => {
            const username = usernameInput.value.trim();
            const errorEl = document.getElementById('username-error');
            
            if (!username) {
                errorEl.textContent = 'Username is required';
                return false;
            }
            if (username.length < 3) {
                errorEl.textContent = 'Username must be at least 3 characters';
                return false;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                errorEl.textContent = 'Username can only contain letters, numbers, and underscores';
                return false;
            }
            
            // Check for duplicate username (exclude current user in edit mode)
            const duplicate = this.state.users.find(u => 
                u.username.toLowerCase() === username.toLowerCase() && 
                (!isEdit || u.id !== user.id)
            );
            if (duplicate) {
                errorEl.textContent = 'Username already exists';
                return false;
            }
            
            errorEl.textContent = '';
            return true;
        };
        
        const validateEmail = () => {
            const email = emailInput.value.trim();
            const errorEl = document.getElementById('email-error');
            
            if (!email) {
                errorEl.textContent = 'Email is required';
                return false;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errorEl.textContent = 'Please enter a valid email address';
                return false;
            }
            
            // Check for duplicate email (exclude current user in edit mode)
            const duplicate = this.state.users.find(u => 
                u.email.toLowerCase() === email.toLowerCase() && 
                (!isEdit || u.id !== user.id)
            );
            if (duplicate) {
                errorEl.textContent = 'Email already exists';
                return false;
            }
            
            errorEl.textContent = '';
            return true;
        };
        
        const validateRole = () => {
            const role = roleSelect.value;
            const errorEl = document.getElementById('role-error');
            
            if (!role) {
                errorEl.textContent = 'Please select a role';
                return false;
            }
            
            errorEl.textContent = '';
            return true;
        };
        
        // Add real-time validation
        usernameInput.addEventListener('blur', validateUsername);
        emailInput.addEventListener('blur', validateEmail);
        roleSelect.addEventListener('change', validateRole);
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Validate all fields
            const isUsernameValid = validateUsername();
            const isEmailValid = validateEmail();
            const isRoleValid = validateRole();
            
            if (!isUsernameValid || !isEmailValid || !isRoleValid) {
                return;
            }
            
            // Get form data
            const formData = {
                username: usernameInput.value.trim(),
                email: emailInput.value.trim(),
                role: roleSelect.value,
                status: document.getElementById('user-status').value
            };
            
            if (isEdit) {
                // Update existing user
                const userIndex = this.state.users.findIndex(u => u.id === user.id);
                if (userIndex !== -1) {
                    this.state.users[userIndex] = { ...user, ...formData };
                    this.showNotification('User updated successfully', 'success');
                }
            } else {
                // Add new user
                const newUser = {
                    id: Math.max(...this.state.users.map(u => u.id), 0) + 1,
                    ...formData
                };
                this.state.users.push(newUser);
                this.showNotification('User created successfully', 'success');
            }
            
            this.renderUsers();
            closeDialog();
        });
        
        // Handle cancel
        cancelBtn.addEventListener('click', closeDialog);
        
        // Close on background click
        dialogContainer.addEventListener('click', (e) => {
            if (e.target === dialogContainer) {
                closeDialog();
            }
        });
        
        // Close on ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    
    /**
     * Update system statistics
     */
    updateSystemStats() {
        // Simulate changing stats for demo
        this.state.systemStats.cpuUsage = Math.floor(Math.random() * 60) + 10;
        this.state.systemStats.memoryUsage = Math.floor(Math.random() * 50) + 20;
        this.state.systemStats.activeUsers = Math.floor(Math.random() * 50) + 5;
        this.state.systemStats.apiRequests = Math.floor(Math.random() * 5000) + 1000;
        
        // Update the DOM
        this.updateStatElement('cpu-usage', this.state.systemStats.cpuUsage);
        this.updateStatElement('cpu-progress-bar', this.state.systemStats.cpuUsage, true);
        this.updateStatElement('memory-usage', this.state.systemStats.memoryUsage);
        this.updateStatElement('memory-progress-bar', this.state.systemStats.memoryUsage, true);
        this.updateStatElement('active-users', this.state.systemStats.activeUsers);
        this.updateStatElement('api-requests', this.state.systemStats.apiRequests);
    }
    
    /**
     * Update a stat element
     */
    updateStatElement(id, value, isProgressBar = false) {
        const element = document.getElementById(id);
        if (element) {
            if (isProgressBar) {
                element.style.width = `${value}%`;
            } else {
                element.textContent = value;
            }
        }
    }
    
    /**
     * Load and render users
     */
    loadUsers() {
        this.renderUsers();
    }
    
    /**
     * Render users table
     */
    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        this.state.users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
                <td class="action-cell">
                    <button class="admin-icon-btn edit" data-id="${user.id}" data-type="user" title="Edit User">✏️</button>
                    <button class="admin-icon-btn delete" data-id="${user.id}" data-type="user" data-name="${user.username}" title="Delete User">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    /**
     * Load and render API keys
     */
    loadApiKeys() {
        this.renderApiKeys();
    }
    
    /**
     * Render API keys table
     */
    renderApiKeys() {
        const tbody = document.getElementById('api-keys-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        this.state.apiKeys.forEach(apiKey => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${apiKey.name}</td>
                <td><code>${apiKey.key}</code></td>
                <td>${apiKey.created}</td>
                <td>${apiKey.lastUsed}</td>
                <td class="action-cell">
                    <button class="admin-icon-btn copy" data-id="${apiKey.id}" data-key="${apiKey.key}" title="Copy API Key">📋</button>
                    <button class="admin-icon-btn delete" data-id="${apiKey.id}" data-type="apikey" data-name="${apiKey.name}" title="Revoke API Key">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    /**
     * Load and render models
     */
    loadModels() {
        this.renderModels();
    }
    
    /**
     * Render models table
     */
    renderModels() {
        const tbody = document.getElementById('models-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        this.state.models.forEach(model => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${model.name}</td>
                <td><span class="status-badge ${model.status.toLowerCase()}">${model.status}</span></td>
                <td>${model.contextLength.toLocaleString()}</td>
                <td class="action-cell">
                    <button class="admin-icon-btn reload" data-id="${model.id}" title="Reload Model">🔄</button>
                    <button class="admin-icon-btn settings" data-id="${model.id}" title="Model Settings">⚙️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    /**
     * Action handlers
     */
    showAddUserForm() {
        this.showUserDialog();
    }
    
    generateNewApiKey() {
        // Show dialog to get API key name
        const dialogContainer = document.createElement('div');
        dialogContainer.className = 'admin-confirm-dialog-container';
        dialogContainer.innerHTML = `
            <div class="admin-confirm-dialog">
                <div class="confirm-dialog-header">
                    <h3>Generate New API Key</h3>
                </div>
                <form id="api-key-form" class="admin-user-form">
                    <div class="confirm-dialog-body">
                        <div class="admin-form-group">
                            <label for="api-key-name">API Key Name <span class="required">*</span></label>
                            <input type="text" id="api-key-name" placeholder="e.g., Production API" required>
                            <span class="error-message" id="api-key-error"></span>
                        </div>
                    </div>
                    <div class="confirm-dialog-footer">
                        <button type="button" class="action-button neutral" id="api-cancel">Cancel</button>
                        <button type="submit" class="action-button primary">Generate Key</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(dialogContainer);
        
        const form = document.getElementById('api-key-form');
        const nameInput = document.getElementById('api-key-name');
        const cancelBtn = document.getElementById('api-cancel');
        
        // Focus input
        setTimeout(() => nameInput.focus(), 100);
        
        const closeDialog = () => dialogContainer.remove();
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const keyName = nameInput.value.trim();
            const errorEl = document.getElementById('api-key-error');
            
            if (!keyName) {
                errorEl.textContent = 'API key name is required';
                return;
            }
            
            if (this.state.apiKeys.find(k => k.name === keyName)) {
                errorEl.textContent = 'An API key with this name already exists';
                return;
            }
            
            const newKey = {
                id: Math.max(...this.state.apiKeys.map(k => k.id), 0) + 1,
                name: keyName,
                key: 'kyn_' + keyName.toLowerCase().replace(/\s+/g, '_') + '_' + this.generateRandomString(24),
                created: new Date().toISOString().split('T')[0],
                lastUsed: 'Never'
            };
            
            this.state.apiKeys.push(newKey);
            this.renderApiKeys();
            this.showNotification(`API key "${keyName}" generated successfully`, 'success');
            
            // Show the generated key in a dialog
            closeDialog();
            this.showGeneratedKeyDialog(newKey);
        });
        
        cancelBtn.addEventListener('click', closeDialog);
        dialogContainer.addEventListener('click', (e) => {
            if (e.target === dialogContainer) closeDialog();
        });
    }
    
    /**
     * Show generated API key dialog
     */
    showGeneratedKeyDialog(apiKey) {
        const dialogContainer = document.createElement('div');
        dialogContainer.className = 'admin-confirm-dialog-container';
        dialogContainer.innerHTML = `
            <div class="admin-confirm-dialog">
                <div class="confirm-dialog-header">
                    <h3>API Key Generated</h3>
                </div>
                <div class="confirm-dialog-body">
                    <p style="margin-bottom: 16px;">Your new API key has been generated. Please copy it now as it won't be shown again.</p>
                    <div class="api-key-display">
                        <code id="generated-key">${apiKey.key}</code>
                        <button class="admin-icon-btn copy" id="copy-generated-key" title="Copy">📋</button>
                    </div>
                </div>
                <div class="confirm-dialog-footer">
                    <button class="action-button primary" id="close-key-dialog">Done</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialogContainer);
        
        const copyBtn = document.getElementById('copy-generated-key');
        const closeBtn = document.getElementById('close-key-dialog');
        
        copyBtn.addEventListener('click', () => {
            this.copyToClipboard(apiKey.key);
        });
        
        closeBtn.addEventListener('click', () => dialogContainer.remove());
    }
    
    saveSystemConfig() {
        const maxConnections = parseInt(document.getElementById('max-connections').value);
        const timeout = parseInt(document.getElementById('timeout-setting').value);
        const loggingLevel = document.getElementById('logging-level').value;
        
        // Validation
        let hasError = false;
        
        if (isNaN(maxConnections) || maxConnections < 1 || maxConnections > 1000) {
            this.showNotification('Max connections must be between 1 and 1000', 'error');
            hasError = true;
        }
        
        if (isNaN(timeout) || timeout < 1000) {
            this.showNotification('Timeout must be at least 1000ms', 'error');
            hasError = true;
        }
        
        if (hasError) return;
        
        // Show confirmation for critical changes
        this.showConfirmDialog({
            title: 'Update System Configuration',
            message: 'Are you sure you want to update the system configuration? This may affect all active connections.',
            confirmText: 'Update',
            onConfirm: () => {
                console.log('Saving system config:', { maxConnections, timeout, loggingLevel });
                this.showNotification('System configuration saved successfully', 'success');
            }
        });
    }
    
    saveRateLimit() {
        const rateMax = parseInt(document.getElementById('rate-limit-max').value);
        const rateWindow = parseInt(document.getElementById('rate-limit-window').value);
        
        // Validation
        let hasError = false;
        
        if (isNaN(rateMax) || rateMax < 1) {
            this.showNotification('Max requests must be at least 1', 'error');
            hasError = true;
        }
        
        if (isNaN(rateWindow) || rateWindow < 1) {
            this.showNotification('Rate limit window must be at least 1 second', 'error');
            hasError = true;
        }
        
        if (hasError) return;
        
        console.log('Saving rate limits:', { rateMax, rateWindow });
        this.showNotification('Rate limit settings saved successfully', 'success');
    }
    
    saveModelSettings() {
        console.log('Saving model settings:', this.state.modelSettings);
        this.showNotification('Model settings saved', 'success');
    }
    
    refreshModels() {
        this.showNotification('Refreshing models...', 'info');
        setTimeout(() => {
            this.loadModels();
            this.showNotification('Models refreshed', 'success');
        }, 1000);
    }
    
    /**
     * Bind delete handlers using event delegation
     */
    bindDeleteHandlers() {
        // Use event delegation for dynamically created buttons
        if (this.panel) {
            this.panel.addEventListener('click', (e) => {
                const target = e.target;
                
                // Handle delete buttons
                if (target.classList.contains('delete')) {
                    const id = parseInt(target.getAttribute('data-id'));
                    const type = target.getAttribute('data-type');
                    const name = target.getAttribute('data-name');
                    
                    this.showConfirmDialog({
                        title: `Delete ${type === 'user' ? 'User' : 'API Key'}`,
                        message: `Are you sure you want to ${type === 'user' ? 'delete user' : 'revoke API key'} "${name}"? This action cannot be undone.`,
                        confirmText: 'Delete',
                        confirmClass: 'danger',
                        onConfirm: () => {
                            if (type === 'user') {
                                this.deleteUser(id);
                            } else if (type === 'apikey') {
                                this.deleteApiKey(id);
                            }
                        }
                    });
                }
                
                // Handle copy API key buttons
                if (target.classList.contains('copy')) {
                    const key = target.getAttribute('data-key');
                    this.copyToClipboard(key);
                }
                
                // Handle edit user buttons
                if (target.classList.contains('edit')) {
                    const id = parseInt(target.getAttribute('data-id'));
                    const type = target.getAttribute('data-type');
                    if (type === 'user') {
                        this.editUser(id);
                    }
                }
            });
        }
    }
    
    /**
     * Show confirmation dialog
     */
    showConfirmDialog(options) {
        const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'primary', onConfirm, onCancel } = options;
        
        // Create dialog container
        const dialogContainer = document.createElement('div');
        dialogContainer.className = 'admin-confirm-dialog-container';
        dialogContainer.innerHTML = `
            <div class="admin-confirm-dialog">
                <div class="confirm-dialog-header">
                    <h3>${title}</h3>
                </div>
                <div class="confirm-dialog-body">
                    <p>${message}</p>
                </div>
                <div class="confirm-dialog-footer">
                    <button class="action-button neutral" id="confirm-cancel">${cancelText}</button>
                    <button class="action-button ${confirmClass}" id="confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialogContainer);
        
        // Add event listeners
        const cancelBtn = dialogContainer.querySelector('#confirm-cancel');
        const confirmBtn = dialogContainer.querySelector('#confirm-ok');
        
        const closeDialog = () => {
            dialogContainer.remove();
        };
        
        cancelBtn.addEventListener('click', () => {
            closeDialog();
            if (onCancel) onCancel();
        });
        
        confirmBtn.addEventListener('click', () => {
            closeDialog();
            if (onConfirm) onConfirm();
        });
        
        // Close on background click
        dialogContainer.addEventListener('click', (e) => {
            if (e.target === dialogContainer) {
                closeDialog();
                if (onCancel) onCancel();
            }
        });
        
        // Focus confirm button
        setTimeout(() => confirmBtn.focus(), 100);
    }
    
    /**
     * Delete user
     */
    deleteUser(userId) {
        this.state.users = this.state.users.filter(user => user.id !== userId);
        this.renderUsers();
        this.showNotification('User deleted successfully', 'success');
    }
    
    /**
     * Delete/Revoke API key
     */
    deleteApiKey(keyId) {
        this.state.apiKeys = this.state.apiKeys.filter(key => key.id !== keyId);
        this.renderApiKeys();
        this.showNotification('API key revoked successfully', 'success');
    }
    
    /**
     * Edit user
     */
    editUser(userId) {
        const user = this.state.users.find(u => u.id === userId);
        if (user) {
            this.showUserDialog(user);
        }
    }
    
    /**
     * Copy text to clipboard
     */
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('API key copied to clipboard', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy API key', 'error');
        });
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let container = document.querySelector('.admin-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'admin-notification-container';
            document.body.appendChild(container);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'admin-notification';
        notification.textContent = message;
        
        // Add type-specific styling
        if (type === 'success') {
            notification.style.borderLeftColor = '#10B981';
        } else if (type === 'error') {
            notification.style.borderLeftColor = '#EF4444';
        } else if (type === 'warning') {
            notification.style.borderLeftColor = '#F59E0B';
        }
        
        // Add to container
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        this.removeKeyboardListeners();
        
        if (this.panel) {
            this.panel.remove();
        }
        
        this.isInitialized = false;
    }
}

// Create and export the admin panel instance
const adminPanel = new AdminPanel();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: Initializing admin panel');
    
    try {
        // Initialize the admin panel
        adminPanel.init();
        
        // Set up click handler for the admin panel button
        const adminPanelBtn = document.getElementById('admin-panel');
        if (adminPanelBtn) {
            console.log('Admin panel button found, adding click event listener');
            
            // Remove any existing onclick attribute
            adminPanelBtn.removeAttribute('onclick');
            
            // Add proper event listener
            adminPanelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Admin panel button clicked');
                adminPanel.open();
            });
        } else {
            console.error('Admin panel button not found in the DOM with ID "admin-panel"');
        }
        
        console.log('Admin Panel ready');
    } catch (error) {
        console.error('Failed to initialize admin panel:', error);
    }
});

// Export for global access
window.adminPanel = adminPanel;
console.log('Admin panel exported to window object');
