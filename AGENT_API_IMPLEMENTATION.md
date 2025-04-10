# Agent API Implementation Guide

This guide provides practical instructions for developers to implement the Agent API solution in their code, addressing the Vite middleware issue where API endpoints return HTML instead of JSON.

## Quick Start

### Option 1: Using the Direct Agent Client (Recommended)

This approach bypasses HTTP entirely by accessing the filesystem and OpenAI API directly.

#### Step 1: Import the Client

```typescript
import { AgentApiClient } from './src/agent-client';
```

#### Step 2: Create an Instance

```typescript
// Load environment variables (if needed)
import { config } from 'dotenv';
config();

// Create the client
const agentClient = new AgentApiClient(process.env.OPENAI_API_KEY);
```

#### Step 3: Use File Operations

```typescript
// Reading a file
async function readExample() {
  const result = await agentClient.readFile('path/to/file.txt');
  
  if (result.success) {
    console.log('File content:', result.content);
  } else {
    console.error('Error reading file:', result.message);
  }
}

// Writing a file
async function writeExample() {
  const content = 'This is content to write to the file';
  const result = await agentClient.writeFile('output.txt', content);
  
  if (result.success) {
    console.log('File written successfully');
  } else {
    console.error('Error writing file:', result.message);
  }
}

// Listing files in a directory
async function listExample() {
  const result = await agentClient.listFiles('src');
  
  if (result.success && result.files) {
    console.log('Files found:', result.files.length);
    result.files.forEach(file => {
      console.log(`- ${file.name} (${file.isDirectory ? 'Directory' : 'File'})`);
    });
  } else {
    console.error('Error listing files:', result.message);
  }
}
```

#### Step 4: Use OpenAI API

```typescript
async function openaiExample() {
  const prompt = 'What are the key benefits of TypeScript over JavaScript?';
  const systemPrompt = 'You are a helpful programming assistant';
  
  const result = await agentClient.getChatCompletion(prompt, systemPrompt);
  
  if (result.success) {
    console.log('OpenAI Response:');
    console.log(result.completion);
  } else {
    console.error('Error getting completion:', result.message);
  }
}
```

### Option 2: Using the Standalone API Server

This approach uses a separate Express server running on port 3099.

#### Step 1: Start the Server

```bash
# Start the server
./start-agent-server.sh

# To stop the server later
kill $(cat agent-standalone-api.pid)
```

#### Step 2: Make API Requests

```typescript
import axios from 'axios';

// Set the base URL and auth header
const baseUrl = 'http://localhost:3099';
const headers = { 'X-Test-Admin': 'true' };

// Reading a file
async function readFileExample() {
  try {
    const response = await axios.get(`${baseUrl}/read-file`, {
      params: { path: 'path/to/file.txt' },
      headers
    });
    
    if (response.data.success) {
      console.log('File content:', response.data.content);
    } else {
      console.error('Error reading file:', response.data.message);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Listing files in a directory
async function listFilesExample() {
  try {
    const response = await axios.get(`${baseUrl}/list-files`, {
      params: { directory: 'src' },
      headers
    });
    
    if (response.data.success) {
      console.log('Files found:', response.data.files.length);
      response.data.files.forEach(file => {
        console.log(`- ${file.name} (${file.isDirectory ? 'Directory' : 'File'})`);
      });
    } else {
      console.error('Error listing files:', response.data.message);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}
```

## Error Handling

Both approaches provide consistent error reporting:

```typescript
// Direct client
const result = await agentClient.readFile('non-existent-file.txt');
if (!result.success) {
  console.error(`Error: ${result.message}`);
  // Handle the error appropriately
}

// API server
try {
  const response = await axios.get(`${baseUrl}/read-file`, {
    params: { path: 'non-existent-file.txt' },
    headers
  });
  
  if (!response.data.success) {
    console.error(`Error: ${response.data.message}`);
    // Handle the error appropriately
  }
} catch (error) {
  console.error('Request failed:', error.message);
  // Handle network errors
}
```

## Use Cases

### 1. Reading Configuration Files

```typescript
async function loadConfig() {
  const result = await agentClient.readFile('config.json');
  if (result.success) {
    return JSON.parse(result.content);
  }
  return null;
}
```

### 2. Reading/Writing Log Files

```typescript
async function appendToLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // First read existing log
  const readResult = await agentClient.readFile('app.log');
  const existingContent = readResult.success ? readResult.content : '';
  
  // Then append new content
  return agentClient.writeFile('app.log', existingContent + logEntry);
}
```

### 3. Generating Content with OpenAI

```typescript
async function generateReadme(projectName, description) {
  const prompt = `Generate a README.md file for a project called "${projectName}". 
The project description is: "${description}"`;

  const result = await agentClient.getChatCompletion(prompt);
  
  if (result.success) {
    await agentClient.writeFile('README.md', result.completion);
    return true;
  }
  return false;
}
```

## Performance Considerations

1. The direct client is faster than HTTP requests since it avoids network overhead.
2. For bulk operations, the direct client is significantly more efficient.
3. When using the standalone server, consider connection pooling and request batching.

## Best Practices

1. **Error Handling**: Always check the `success` property in responses.
2. **Path Safety**: Avoid absolute paths; use paths relative to the project root.
3. **Authentication**: Always include the authentication header when using the standalone server.
4. **OpenAI Usage**: Set appropriate system prompts to get better results.
5. **Large Files**: Be cautious with very large files; consider streaming or chunking.