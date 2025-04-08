# OpenAI Agent File System Access Guide

This document provides instructions on how to use the OpenAI agent with file system access in the Tradeliy project.

## Overview

The OpenAI agent has been configured to read from and write to files within the project directory. There are several ways to interact with the agent and utilize its file system access capabilities:

1. **Direct File Access**: Using the agent-file-utils.js module directly
2. **Terminal Server**: Using the agent-terminal-server.js to expose HTTP endpoints
3. **Web Interface**: Using the browser-based agent interface

## Verification Status

✅ **Verified**: The OpenAI agent can successfully:
- Create new files
- Write content to files
- Read content from files
- Append to existing files
- Delete files
- List files in directories

## How to Use the Agent for File Operations

### Method 1: Direct File Operations

For simple file operations without starting a server, use the `direct-file-test.js` script:

```bash
node direct-file-test.js
```

This script demonstrates:
1. Creating a file called `agent_test_output.txt`
2. Writing "Hello from the OpenAI agent!" to the file
3. Reading the content back to verify successful operation

### Method 2: Using the Terminal Server

#### Start the Agent Terminal Server

```bash
node run-agent-terminal.js
```

This will start the agent server on port 5002, accessible at `http://localhost:5002`.

#### Stop the Agent Terminal Server

```bash
node stop-agent-terminal.js
```

#### Example Curl Commands

To create a test file:

```bash
curl -X POST http://localhost:5002/create-test-file \
  -H "Content-Type: application/json" \
  -H "X-Test-Admin: true" \
  -d '{
    "filename": "agent_test_output.txt",
    "content": "Hello from the OpenAI agent!"
  }'
```

To read a file:

```bash
curl "http://localhost:5002/read-file?path=agent_test_output.txt" -H "X-Test-Admin: true"
```

For more examples, see `agent-terminal-examples.md`.

### Method 3: Web Interface

Access the agent web interface at:

```
https://[replit-url]/api/my-agent/chat
```

In this interface, you can ask the agent to perform file operations using natural language, such as:

```
Please create a file named agent_test_output.txt with the content "Hello from the OpenAI agent!" and verify its contents.
```

## Agent API Endpoints

When using the terminal server, the following endpoints are available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check if the server is running |
| `/verify-openai-key` | GET | Verify the OpenAI API key |
| `/read-file` | GET | Read a file (use query param `?path=file.txt`) |
| `/file-op` | POST | Perform various file operations |
| `/create-test-file` | POST | Create a test file with content |
| `/agent-chat` | POST | Chat with the agent |
| `/agent-task` | POST | Execute an agent task |
| `/agent-file-operation` | POST | Perform file operations with agent assistance |

All endpoints require the `X-Test-Admin: true` header for authentication.

## Troubleshooting

If you encounter issues with the agent's file operations:

1. **Permission issues**: Ensure the agent has proper permissions to read/write in the target directory.
2. **OpenAI API key**: Verify the API key is set correctly in the `.env` file.
3. **Server connectivity**: If using the terminal server, check it's running on the expected port.
4. **Path issues**: Use absolute paths or properly resolved relative paths.

## Technical Details

- The agent uses the `agent-file-utils.js` module for all file operations.
- All paths are normalized using Node.js `path.resolve()` to handle both relative and absolute paths.
- Directory creation is handled automatically when writing to a file in a non-existent directory.
- The agent server uses HTTP authentication via the X-Test-Admin header.

## Example Use Cases

1. **Configuration Management**: Reading and updating config files
2. **Log Analysis**: Reading and processing log files
3. **Code Generation**: Creating new code files based on requirements
4. **Data Processing**: Reading, processing, and writing data files

## Security Considerations

- The agent server should only be used in development environments.
- Authentication is handled via the X-Test-Admin header, which is not secure for production use.
- In production, implement proper authentication and authorization mechanisms.
- Be cautious about the file paths accessible to the agent to prevent unintended access.