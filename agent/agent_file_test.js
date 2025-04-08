/**
 * This is a test file for the OpenAI agent to demonstrate file manipulation capabilities
 * The agent should be able to:
 * 1. Read this file
 * 2. Modify its contents
 * 3. Create new files based on instructions
 */

// Simple function that the agent can modify
function getMessage() {
  return "Hello from the agent test file!";
}

// Configuration object that can be updated
const agentConfig = {
  name: "File Access Test",
  version: "1.0.1",
  capabilities: [
    "read_files",
    "modify_files",
    "create_files"
  ],
  lastModified: new Date().toISOString()
};

export {
  getMessage,
  agentConfig
};