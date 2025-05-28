// Configuration management with environment awareness and validation
const config = {
    // Configuration state
    _initialized: false,
    _values: {},

    // Default values
    defaults: {
        API_URL: "http://192.168.1.7:4545",
        API_TIMEOUT: 30000,
        MAX_RETRIES: 3
    },

    // Required configuration keys
    required: ['API_URL'],

    // Initialize configuration
    init() {
        try {
            // Load environment variables or use defaults
            this._values = {
                API_URL: window.ENV_API_URL || this.defaults.API_URL,
                API_TIMEOUT: parseInt(window.ENV_API_TIMEOUT) || this.defaults.API_TIMEOUT,
                MAX_RETRIES: parseInt(window.ENV_MAX_RETRIES) || this.defaults.MAX_RETRIES
            };

            // Validate required values
            const missingKeys = this.required.filter(key => !this._values[key]);
            if (missingKeys.length > 0) {
                throw new Error(`Missing required configuration: ${missingKeys.join(', ')}`);
            }

            // Validate API URL format
            try {
                new URL(this._values.API_URL);
            } catch (e) {
                throw new Error(`Invalid API_URL format: ${this._values.API_URL}`);
            }

            this._initialized = true;
            console.log('Configuration initialized successfully');
        } catch (error) {
            console.error('Configuration initialization failed:', error);
            throw error;
        }
    },

    // Get configuration value with validation
    get(key) {
        if (!this._initialized) {
            this.init();
        }
        if (!(key in this._values)) {
            throw new Error(`Invalid configuration key: ${key}`);
        }
        return this._values[key];
    }
};

// Initialize configuration on load
try {
    config.init();
    // Export configuration values to window for legacy compatibility
    window.API_URL = config.get('API_URL');
} catch (error) {
    // Add visible error notification for configuration failures
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;text-align:center;z-index:9999';
    errorDiv.textContent = `Configuration Error: ${error.message}`;
    document.body.appendChild(errorDiv);
}

// Export config object for module usage
window.config = config;
