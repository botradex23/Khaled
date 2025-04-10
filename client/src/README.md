# Tradeliy Source Code

This directory contains the refactored source code for the Tradeliy platform, organized in a clean, modular structure.

## Directory Structure

- **controllers/**: Contains controller components for handling business logic
- **routes/**: API route definitions and handlers
- **services/**: Service modules for core functionality (OpenAI, file handling, database, etc.)
- **utils/**: Utility functions and helper modules

## Agent API Integration

The project integrates an OpenAI-powered agent for smart analysis, code assistance, and natural language processing. There are two ways to access the agent functionality:

### 1. Via Express Routes (may be intercepted by Vite)

The agent is accessible via API endpoints at:
- `/api/agent/*` - Main agent endpoints
- `/api/my-agent/*` - Alternative agent endpoints

**Note**: Due to Vite middleware, some of these routes may return HTML instead of JSON when accessed via HTTP. The `/api/agent/status` endpoint should work reliably.

### 2. Direct Client Access (recommended)

#### For TypeScript/ES Module usage:

Use the `agentClient` from `src/agent-client.ts`:

```typescript
import { agentClient } from './src/agent-client';

// Get agent status
const status = agentClient.getStatus();

// Verify OpenAI API key
const keyStatus = await agentClient.verifyOpenAIKey();

// Get chat response
const response = await agentClient.getChatResponse("Hello, how can you help me?");

// Smart analyze and edit
const analysis = await agentClient.smartAnalyzeAndEdit("What files handle user authentication?");
```

#### For CommonJS usage:

For scripts using CommonJS (require instead of import), use the `agent-client.cjs` file at the root:

```javascript
const { agentClient } = require('./agent-client.cjs');

// Get agent status
const status = agentClient.getStatus();

// Further examples in agent-example.cjs
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

If you're having issues with API routes returning HTML instead of JSON, use the direct API client approach described above.