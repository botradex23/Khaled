/**
 * Format utilities for the application
 * This file contains utility functions for formatting values for display
 */

/**
 * Format a value as currency with 2 decimal places
 * @param {number} value - The number to format
 * @param {string} currencySymbol - The currency symbol to use (default: $)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currencySymbol = '$') {
  return `${currencySymbol}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}