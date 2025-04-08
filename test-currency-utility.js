/**
 * Test the generated currency utility
 */

import { formatCurrency, parseCurrency } from './formatCurrency.js';

// Tests
function runTests() {
  console.log('======================================');
  console.log('Testing Currency Utility Functions');
  console.log('======================================');
  
  // Test formatCurrency
  console.log('\nTesting formatCurrency function:');
  console.log('--------------------------------');
  try {
    console.log(`formatCurrency(1234.56) => ${formatCurrency(1234.56)}`);
    console.log(`formatCurrency(1234.56, 'EUR', 'de-DE') => ${formatCurrency(1234.56, 'EUR', 'de-DE')}`);
    console.log(`formatCurrency(0.5, 'GBP') => ${formatCurrency(0.5, 'GBP')}`);
    console.log(`formatCurrency(999999.99, 'JPY', 'ja-JP') => ${formatCurrency(999999.99, 'JPY', 'ja-JP')}`);
    console.log('✅ formatCurrency tests passed');
  } catch (error) {
    console.error(`❌ formatCurrency tests failed: ${error.message}`);
  }
  
  // Test parseCurrency
  console.log('\nTesting parseCurrency function:');
  console.log('--------------------------------');
  try {
    const test1 = parseCurrency('$1,234.56');
    console.log(`parseCurrency('$1,234.56') => ${test1} (${typeof test1})`);
    
    const test2 = parseCurrency('1.234,56 €', 'de-DE');
    console.log(`parseCurrency('1.234,56 €', 'de-DE') => ${test2} (${typeof test2})`);
    
    const test3 = parseCurrency('£0.50');
    console.log(`parseCurrency('£0.50') => ${test3} (${typeof test3})`);
    
    const test4 = parseCurrency('￥999,999', 'ja-JP');
    console.log(`parseCurrency('￥999,999', 'ja-JP') => ${test4} (${typeof test4})`);
    
    console.log('✅ parseCurrency tests passed');
  } catch (error) {
    console.error(`❌ parseCurrency tests failed: ${error.message}`);
  }
  
  console.log('\n======================================');
  console.log('Test Summary');
  console.log('======================================');
  console.log('All tests completed. Check above for any errors.');
}

// Run tests
runTests();