/**
 * Test script for stop-loss and take-profit functionality
 * This script creates positions with SL/TP settings and simulates price changes
 */

// Using the ES Module format with .mjs extension for compatibility

async function main() {
  try {
    console.log("Starting stop-loss and take-profit functionality test");
    
    // Create a test position with SL/TP parameters
    const symbol = "BTCUSDT";
    const initialPrice = 70000;
    
    // First, set the initial price
    console.log(`Setting initial price for ${symbol}: $${initialPrice}`);
    await simulatePriceChange(symbol, initialPrice);
    
    // Create a LONG position
    console.log("Creating test LONG position...");
    const longPosition = await createPosition({
      symbol,
      direction: "LONG",
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test stop-loss and take-profit functionality",
      confidence: 0.95,
      signalSource: "dca",
      metadata: {
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    });
    
    if (!longPosition.success) {
      console.error("Failed to create test position:", longPosition.error);
      return;
    }
    
    console.log(`Created LONG position. ID: ${longPosition.positionId}`);
    
    // Test scenarios
    await testTakeProfitScenario(symbol, initialPrice, longPosition.positionId);
    await testStopLossScenario(symbol, initialPrice);
    
    console.log("\nTest completed!");
  } catch (error) {
    console.error("Error in test:", error);
  }
}

async function testTakeProfitScenario(symbol, initialPrice, positionId) {
  // First small price increase (below take-profit threshold)
  const smallIncreasePrice = initialPrice * 1.05; // 5% increase
  console.log(`\nScenario 1: Price increases 5% to $${smallIncreasePrice} (below TP threshold)`);
  await simulatePriceChange(symbol, smallIncreasePrice);

  // Wait longer for risk manager to process
  console.log('Waiting 5 seconds for risk manager to process...');
  await sleep(5000);

  // Check if position is still open
  const openPositions1 = await getOpenPositions();
  console.log('Open positions found:', openPositions1.length);
  const isPositionOpen1 = openPositions1.some(p => p.id === positionId);
  
  if (isPositionOpen1) {
    console.log("✅ Position still open after 5% price increase (below take-profit threshold)");
  } else {
    console.error("❌ Position unexpectedly closed after small price increase");
  }

  // Second price increase (above take-profit threshold)
  const largeIncreasePrice = initialPrice * 1.11; // 11% increase, above 10% TP
  console.log(`\nScenario 2: Price increases to $${largeIncreasePrice} (11% gain, above TP threshold)`);
  await simulatePriceChange(symbol, largeIncreasePrice);

  // Wait for risk manager to process
  await sleep(3000);

  // Check if position was automatically closed
  const openPositions2 = await getOpenPositions();
  const isPositionOpen2 = openPositions2.some(p => p.id === positionId);
  
  if (!isPositionOpen2) {
    console.log("✅ Position automatically closed after price moved above take-profit level");
  } else {
    console.error("❌ Take-profit didn't trigger - position still open");
  }
}

async function testStopLossScenario(symbol, initialPrice) {
  // Reset price to initial
  await simulatePriceChange(symbol, initialPrice);
  await sleep(1000);
  
  // Create another position for stop-loss test
  console.log("\nCreating new test position for stop-loss test...");
  const slPosition = await createPosition({
    symbol,
    direction: "LONG",
    entryPrice: initialPrice,
    quantity: 0.1,
    reason: "Test stop-loss functionality",
    confidence: 0.95,
    signalSource: "dca",
    metadata: {
      stopLossPercent: 5,
      takeProfitPercent: 10
    }
  });
  
  if (!slPosition.success) {
    console.error("Failed to create test position:", slPosition.error);
    return;
  }
  
  const slPositionId = slPosition.positionId;
  console.log(`Created test position. Position ID: ${slPositionId}`);
  
  // Small price decrease (above stop-loss threshold)
  const smallDecreasePrice = initialPrice * 0.97; // 3% decrease
  console.log(`\nScenario 3: Price decreases 3% to $${smallDecreasePrice} (above SL threshold)`);
  await simulatePriceChange(symbol, smallDecreasePrice);
  
  // Wait for risk manager to process
  await sleep(2000);
  
  // Check if position is still open
  const openPositions3 = await getOpenPositions();
  const isPositionOpen3 = openPositions3.some(p => p.id === slPositionId);
  
  if (isPositionOpen3) {
    console.log("✅ Position still open after 3% price decrease (above stop-loss threshold)");
  } else {
    console.error("❌ Position unexpectedly closed after small price decrease");
  }
  
  // Larger price decrease (below stop-loss threshold)
  const largeDecreasePrice = initialPrice * 0.94; // 6% decrease, below 5% SL
  console.log(`\nScenario 4: Price decreases to $${largeDecreasePrice} (6% loss, below SL threshold)`);
  await simulatePriceChange(symbol, largeDecreasePrice);
  
  // Wait for risk manager to process
  await sleep(3000);
  
  // Check if position was automatically closed
  const openPositions4 = await getOpenPositions();
  const isPositionOpen4 = openPositions4.some(p => p.id === slPositionId);
  
  if (!isPositionOpen4) {
    console.log("✅ Position automatically closed after price moved below stop-loss level");
  } else {
    console.error("❌ Stop-loss didn't trigger - position still open");
  }
}

// Helper functions
async function createPosition(tradeSignal) {
  try {
    const response = await fetch('http://localhost:5000/api/paper-trading/execute-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': 'admin'  // Special test header for authentication
      },
      body: JSON.stringify(tradeSignal),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error creating position:', error);
    return { success: false, error: error.message };
  }
}

async function getOpenPositions() {
  try {
    // First, let's create an account if it doesn't exist yet
    try {
      const accountResponse = await fetch('http://localhost:5000/api/paper-trading/account', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-test-user-id': 'admin'  // Special test header for authentication
        },
        body: JSON.stringify({ initialBalance: 10000 })
      });
      console.log('Account creation status:', accountResponse.status);
    } catch (e) {
      console.log('Account already exists or error creating account:', e.message);
    }

    // Now get positions
    const response = await fetch('http://localhost:5000/api/paper-trading/positions', {
      headers: { 'x-test-user-id': 'admin' }
    });
    const data = await response.json();
    
    // Check if the response is an array or an error message
    if (Array.isArray(data)) {
      return data;
    } else {
      console.error('Error response from positions endpoint:', data);
      return [];
    }
  } catch (error) {
    console.error('Error getting positions:', error);
    return [];
  }
}

async function simulatePriceChange(symbol, price) {
  try {
    const response = await fetch('http://localhost:5000/api/paper-trading/simulate-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, price }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error simulating price change:', error);
    return { success: false, error: error.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
main().catch(console.error);