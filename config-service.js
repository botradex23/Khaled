```javascript
// config-service.js

// Importing necessary modules
const fs = require('fs');
const path = require('path');

/**
 * Class ConfigService
 * A service to manage application configuration.
 */
class ConfigService {
    constructor(configFilePath) {
        this.configFilePath = configFilePath || path.resolve(__dirname, 'config.json');
        this.configuration = this.loadConfiguration();
    }

    /**
     * Loads configuration from a JSON file.
     * @returns {Object} The configuration object.
     */
    loadConfiguration() {
        try {
            if (!fs.existsSync(this.configFilePath)) {
                console.error(`Config file not found at ${this.configFilePath}`);
                return {};
            }

            const fileContents = fs.readFileSync(this.configFilePath, 'utf8');
            return JSON.parse(fileContents);
        } catch (error) {
            console.error('Error loading configuration:', error);
            return {};
        }
    }

    /**
     * Gets a configuration value by key.
     * @param {string} key - The configuration key to retrieve.
     * @returns {*} The configuration value or undefined.
     */
    get(key) {
        return this.configuration[key];
    }

    /**
     * Sets a configuration value by key.
     * @param {string} key - The configuration key to set.
     * @param {*} value - The value to set the key to.
     */
    set(key, value) {
        this.configuration[key] = value;
        this.saveConfiguration();
    }

    /**
     * Saves the current configuration back to the file.
     */
    saveConfiguration() {
        try {
            const data = JSON.stringify(this.configuration, null, 2);
            fs.writeFileSync(this.configFilePath, data, 'utf8');
        } catch (error) {
            console.error('Error saving configuration:', error);
        }
    }
}

// Export the ConfigService for external usage
module.exports = ConfigService;
```