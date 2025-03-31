// Override specific console messages to avoid showing simulation messages
const originalConsoleLog = console.log;

// Filter out unwanted messages related to simulation mode
console.log = function() {
  // Convert arguments to array
  const args = Array.from(arguments);
  
  // Check if the message is one we want to filter out
  if (args[0] === "Detected geo-restriction (451), switching to simulation mode" ||
      args[0] === "[WebSocket] Binance WebSocket geo-restriction detected (451). Switching to simulation mode.") {
    // Skip these specific messages
    return;
  }
  
  // Forward all other messages to the original console.log
  return originalConsoleLog.apply(console, args);
};

// Export a dummy function to make the ESM import work
export default function setup() {
  // Nothing to do, the override is done when the file is imported
}