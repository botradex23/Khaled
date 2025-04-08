# Agent Terminal API - cURL Examples

This document provides examples of how to use the Agent Terminal Server with curl commands. These commands allow you to interact with the OpenAI agent and perform file operations directly from your terminal.

## Starting and Stopping the Server

### Start the Server

```bash
node run-agent-terminal.js
```

### Stop the Server

```bash
node stop-agent-terminal.js
```

## Basic Health Check

To check if the server is running:

```bash
curl http://localhost:5002/health
```

## Verifying OpenAI API Key

To verify if the OpenAI API key is valid:

```bash
curl http://localhost:5002/verify-openai-key -H "X-Test-Admin: true"
```

## File Operations

### Read a File (GET method - simpler for curl usage)

```bash
curl "http://localhost:5002/read-file?path=package.json" -H "X-Test-Admin: true"
```

### Create a Test File

```bash
curl -X POST http://localhost:5002/create-test-file \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "filename": "agent_test_output.txt",
    "content": "Hello from the OpenAI agent!"
  }'
```

### Unified File Operations Endpoint

This versatile endpoint handles multiple file operations:

#### Read a File

```bash
curl -X POST http://localhost:5002/file-op \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "operation": "read",
    "filePath": "agent_test_output.txt"
  }'
```

#### Write to a File

```bash
curl -X POST http://localhost:5002/file-op \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "operation": "write",
    "filePath": "agent_test_output.txt",
    "content": "Updated content from the terminal!"
  }'
```

#### Append to a File

```bash
curl -X POST http://localhost:5002/file-op \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "operation": "append",
    "filePath": "agent_test_output.txt",
    "content": "\nThis line was appended."
  }'
```

#### Delete a File

```bash
curl -X POST http://localhost:5002/file-op \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "operation": "delete",
    "filePath": "agent_test_output.txt"
  }'
```

#### List Files in a Directory

```bash
curl -X POST http://localhost:5002/file-op \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "operation": "list",
    "directory": "./"
  }'
```

#### Check if a File Exists

```bash
curl -X POST http://localhost:5002/file-op \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "operation": "exists",
    "filePath": "agent_test_output.txt"
  }'
```

#### Create a Directory

```bash
curl -X POST http://localhost:5002/file-op \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "operation": "mkdir",
    "directoryPath": "agent_test_dir"
  }'
```

## Agent Interactions

### Chat with the Agent

```bash
curl -X POST http://localhost:5002/agent-chat \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "prompt": "Please create a file named agent_test_output.txt and write the text: Hello from the OpenAI agent!"
  }'
```

### Execute an Agent Task

```bash
curl -X POST http://localhost:5002/agent-task \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "prompt": "Create a JavaScript function that calculates the factorial of a number.",
    "systemPrompt": "You are an expert JavaScript developer."
  }'
```

### File Operation with Agent Assistance

#### Generate and Write to a File

```bash
curl -X POST http://localhost:5002/agent-file-operation \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "action": "generateAndWrite",
    "filePath": "factorial.js",
    "prompt": "Create a JavaScript function that calculates the factorial of a number. Include both recursive and iterative implementations."
  }'
```

#### Write to a File Directly

```bash
curl -X POST http://localhost:5002/agent-file-operation \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "action": "writeFile",
    "filePath": "agent_test_output.txt",
    "content": "Hello from the terminal agent!"
  }'
```

#### Read from a File

```bash
curl -X POST http://localhost:5002/agent-file-operation \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "action": "readFile",
    "filePath": "agent_test_output.txt"
  }'
```

## Example Workflow

Here's an example workflow to perform all the file operations from the requirements:

1. Check if the server is running:
```bash
curl http://localhost:5002/health
```

2. Create a test file with the required content:
```bash
curl -X POST http://localhost:5002/create-test-file \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "filename": "agent_test_output.txt",
    "content": "Hello from the OpenAI agent!"
  }'
```

3. Read the file to verify its contents:
```bash
curl "http://localhost:5002/read-file?path=agent_test_output.txt" -H "X-Test-Admin: true"
```

4. Verify the entire operation was successful:
```bash
curl -X POST http://localhost:5002/agent-chat \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "prompt": "I created a file named agent_test_output.txt with the text \"Hello from the OpenAI agent!\". Can you confirm the file exists and its contents?"
  }'
```