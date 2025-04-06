/**
 * Test Risk Management Functionality
 * 
 * This script provides an easy way to test the risk management functionality
 * for both long and short positions, and for both normal and extreme market conditions.
 */

// Using global fetch which is available in Node.js 18+

async function testRiskManagement() {
  console.log("=".repeat(50));
  console.log("RISK MANAGEMENT SYSTEM TEST");
  console.log("=".repeat(50));
  
  // Test regular risk management scenarios
  console.log("\n🧪 Testing standard risk management scenarios...");
  const standardResponse = await fetch('http://localhost:5000/api/risk-test/test-all', {
    method: 'POST'
  });
  
  const standardResults = await standardResponse.json();
  
  // Print results in a readable format
  console.log("\n📊 STANDARD TESTS RESULTS:");
  console.log("-".repeat(50));
  console.log(`✅ LONG Take Profit Test: ${standardResults.longPositionTests.takeProfit.result}`);
  console.log(`✅ LONG Stop Loss Test: ${standardResults.longPositionTests.stopLoss.result}`);
  console.log(`✅ SHORT Take Profit Test: ${standardResults.shortPositionTests.takeProfit.result}`);
  console.log(`✅ SHORT Stop Loss Test: ${standardResults.shortPositionTests.stopLoss.result}`);
  console.log("-".repeat(50));
  console.log(`📊 Overall Result: ${standardResults.summary.overallResult}`);
  console.log(`📊 Passing Tests: ${standardResults.summary.passingTests}/${standardResults.summary.totalTests} (${standardResults.summary.completionPercentage})`);
  
  // Test extreme scenarios (flash crash and flash spike)
  console.log("\n🧪 Testing extreme market scenarios...");
  const extremeResponse = await fetch('http://localhost:5000/api/flash-test/test-all', {
    method: 'POST'
  });
  
  const extremeResults = await extremeResponse.json();
  
  // Print results for extreme tests
  console.log("\n📊 EXTREME TESTS RESULTS:");
  console.log("-".repeat(50));
  console.log(`✅ Flash Crash Test (8% Stop Loss): ${extremeResults.flashCrashTest.result}`);
  console.log(`✅ Flash Spike Test (10% Take Profit): ${extremeResults.flashSpikeTest.result}`);
  console.log("-".repeat(50));
  console.log(`📊 Overall Extreme Tests Result: ${extremeResults.overallResult}`);
  
  // Summary
  const allPassed = 
    standardResults.summary.overallResult === "PASS" && 
    extremeResults.overallResult === "PASS";
  
  console.log("\n=".repeat(50));
  console.log(`📊 FINAL RESULT: ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
  console.log("=".repeat(50));
}

// Run the tests
testRiskManagement().catch(error => {
  console.error("Error running risk management tests:", error);
});