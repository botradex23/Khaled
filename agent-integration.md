# Agent API Integration

This document explains how the OpenAI Agent integration works in the Tradeliy platform. The Agent API provides intelligent assistance for users and administrators.

## Architecture

The Agent API integration uses two possible approaches:

1. **Integrated Approach**: Agent functionality is embedded directly in the main Express server via `server/agent-integration.js`. This approach has limitations due to Vite middleware conflicts.

2. **Standalone Approach**: A separate server runs on port 3021 using `server/standalone-agent-server.js`, providing dedicated agent functionality without Vite conflicts.

## API Endpoints

Both approaches expose the same API endpoints:

- `GET /agent-api/health` - Check if the Agent API is available
- `GET /agent-api/verify-openai-key` - Verify the OpenAI API key
- `POST /agent-api/file-op` - Perform file operations
- `POST /agent-api/agent-chat` - Get a chat completion from the agent
- `POST /agent-api/agent-task` - Execute a complex agent task with file operations

## Standalone Server Setup

To run the agent as a standalone server:

1. Ensure OPENAI_API_KEY is set in the environment
2. Run `./agent-workflow.sh` to start the server
3. The server will listen on port 3021

## Client Usage

To access the Agent API from the client:

```javascript
// Example: Make a request to the Agent API
async function callAgentApi(endpoint, method = 'GET', data = null) {
  const baseUrl = 'http://localhost:3021/agent-api';
  const url = `${baseUrl}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  };
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Agent API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Example: Execute an agent task
async function executeAgentTask(prompt) {
  return await callAgentApi('/agent-task', 'POST', {
    prompt,
    systemPrompt: 'You are a helpful trading assistant.'
  });
}
```

## Development

To modify the Agent API:

1. Edit `server/standalone-agent-server.js` to change server behavior
2. Edit `agent-file-utils.js` to modify file operation capabilities
3. Restart the agent server to apply changes