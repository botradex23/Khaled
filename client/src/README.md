# Tradeliy Source Code

This directory contains the refactored source code for the Tradeliy platform, organized in a clean, modular structure.

## Directory Structure

- **controllers/**: Contains controller components for handling business logic
- **routes/**: API route definitions and handlers
- **services/**: Service modules for core functionality (OpenAI, file handling, database, etc.)
- **utils/**: Utility functions and helper modules

## Agent Integration

The project integrates an OpenAI-powered agent for smart analysis, code assistance, and natural language processing. The recommended way to access this functionality is:

### Direct Client Access

For programmatic access to agent functionality, use the `agentClient` from `src/agent-client.ts`. This bypasses any middleware that could interfere with API responses:

```typescript
import { agentClient } from './agent-client';

// Get agent status
const status = agentClient.getStatus();

// Verify OpenAI API key
const keyStatus = await agentClient.verifyOpenAIKey();

// Get chat response
const response = await agentClient.getChatResponse("Hello, how can you help me?");

// Smart analyze and edit
const analysis = await agentClient.smartAnalyzeAndEdit("What files handle user authentication?");

// File operations
const files = await agentClient.executeFileOperation('listFiles', { directory: './src/services' });
```

A complete usage example is available in `src/agent-client-example.ts`. To run the example:

```bash
npx tsx src/agent-client-example.ts
```

## OpenAI Integration

The OpenAI service is configured in `src/services/openai-service.ts` and provides capabilities for:

- Chat completion generation
- Smart code and project analysis
- File content generation

## Main Services

- **Config Service**: Application configuration management
- **Database Service**: Database connections and operations
- **File Service**: File system operations
- **Market Data Service**: Real-time market data access
- **OpenAI Service**: AI assistant capabilities

## Running the Application

The application is started via the workflow defined in the root directory. All API endpoints are available on port 5000.

## Troubleshooting

If you're having issues with API routes returning HTML instead of JSON, use the direct API client approach described above. This bypasses the Vite middleware that may intercept and transform API responses.