/**
 * @file formatCurrency.js
 * @description Utility functions to format and parse currency values.
 */

/**
 * Formats a number as a currency string.
 * 
 * @param {number} amount - The amount to format.
 * @param {string} [currency='USD'] - The currency code.
 * @param {string} [locale='en-US'] - The locale to use for formatting.
 * @returns {string} The formatted currency string.
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error('Amount must be a valid number');
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/**
 * Parses a currency string back to a number.
 * 
 * @param {string} currencyString - The currency string to parse.
 * @param {string} [locale='en-US'] - The locale to use for parsing.
 * @returns {number} The parsed number value.
 */
export function parseCurrency(currencyString, locale = 'en-US') {
    if (typeof currencyString !== 'string') {
        throw new Error('Currency string must be a valid string');
    }
    
    // Simple approach: remove all non-numeric characters except the decimal point
    // This handles most common cases without complex regex that might fail
    let sanitizedString = currencyString.replace(/[^\d.-]/g, '');
    
    // For locales that use comma as decimal separator (like many European countries)
    if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es') || 
        locale.startsWith('it') || locale.startsWith('pt') || locale.startsWith('nl')) {
        // Replace the last comma with a decimal point if present
        const lastCommaIndex = currencyString.lastIndexOf(',');
        if (lastCommaIndex !== -1 && lastCommaIndex > currencyString.lastIndexOf('.')) {
            sanitizedString = currencyString
                .replace(/\./g, '') // Remove dots (thousand separators)
                .replace(',', '.'); // Replace comma with dot for decimal
        }
    }
    
    // Handle potential multiple decimal points by keeping only the last one
    const parts = sanitizedString.split('.');
    if (parts.length > 2) {
        sanitizedString = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }
    
    const numberValue = parseFloat(sanitizedString);
    
    if (isNaN(numberValue)) {
        throw new Error('Failed to parse currency string to number');
    }
    
    return numberValue;
}

// Usage examples
// The examples below are for documentation purposes only

// Formatting currency examples:
// formatCurrency(1234.56)              -> "$1,234.56" (Default: USD, en-US)
// formatCurrency(1234.56, 'EUR', 'de-DE')  -> "1.234,56 €" (German locale with Euro)
// formatCurrency(1234.56, 'JPY', 'ja-JP')  -> "￥1,235" (Japanese locale with Yen)

// Parsing currency examples:
// parseCurrency('$1,234.56')            -> 1234.56
// parseCurrency('1.234,56 €', 'de-DE')  -> 1234.56
// parseCurrency('￥1,235', 'ja-JP')     -> 1235