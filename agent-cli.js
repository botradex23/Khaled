#!/usr/bin/env node

/**
 * Simple Command Line Interface for Agent Terminal Server
 * 
 * This script provides a convenient way to interact with the agent from the command line.
 * Usage: node agent-cli.js "your question or command here"
 */

import fetch from 'node-fetch';
import readline from 'readline';

// Configuration
const AGENT_SERVER_URL = 'http://localhost:3021'; // Default agent server URL

// We'll create readline interfaces on demand for each interaction

/**
 * Send a chat request to the agent
 * @param {string} prompt - The prompt to send to the agent
 * @param {Object} options - Additional options
 * @param {string} options.serverUrl - Custom server URL
 * @param {boolean} options.useTask - Use agent-task endpoint instead of agent-chat
 * @param {string} options.systemPrompt - Custom system prompt
 * @returns {Promise<string>} - The agent's response
 */
async function chatWithAgent(prompt, options = {}) {
  try {
    // If called with just a string prompt, convert to object
    if (typeof options === 'string') {
      options = { prompt: options };
    }
    
    // Handle options
    const serverUrl = options.serverUrl || AGENT_SERVER_URL;
    const useTask = options.useTask || false;
    const systemPrompt = options.systemPrompt;
    
    // Determine endpoint based on useTask flag
    const endpoint = useTask ? 'agent-task' : 'agent-chat';
    
    // Prepare request body
    const requestBody = {
      prompt: prompt
    };
    
    // Add system prompt if provided
    if (systemPrompt) {
      requestBody.systemPrompt = systemPrompt;
    }
    
    // Make the request
    const response = await fetch(`${serverUrl}/agent-api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Admin': 'true'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!data.success) {
      return `Error: ${data.message || 'Unknown error'}`;
    }
    
    return data.response || data.message;
  } catch (error) {
    console.error('Error communicating with agent server:', error);
    return `Failed to connect to agent server at ${options.serverUrl || AGENT_SERVER_URL}. Make sure it's running.`;
  }
}

/**
 * Check if the agent server is running
 * @param {string} serverUrl - URL of the agent server to check
 * @returns {Promise<boolean>} - True if the server is running
 */
async function checkServerStatus(serverUrl = AGENT_SERVER_URL) {
  try {
    const response = await fetch(`${serverUrl}/agent-api/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    return false;
  }
}

/**
 * Interactive mode for chatting with the agent
 * @param {Object} options - Options for the interactive mode
 */
async function startInteractiveMode(options = {}) {
  console.log('Agent CLI - Interactive Mode');
  console.log('Type "exit" or "quit" to end the session');
  console.log('Type "!help" for additional commands');
  console.log('------------------------------------');

  // Keep track of session options
  const sessionOptions = {
    serverUrl: options.serverUrl || AGENT_SERVER_URL,
    useTask: options.useTask || false,
    systemPrompt: options.systemPrompt
  };
  
  // Display current settings
  console.log(`Server URL: ${sessionOptions.serverUrl}`);
  console.log(`Mode: ${sessionOptions.useTask ? 'Agent Task (advanced)' : 'Agent Chat (basic)'}`);
  if (sessionOptions.systemPrompt) {
    console.log(`Custom system prompt: "${sessionOptions.systemPrompt.substring(0, 50)}..."`);
  }
  console.log('------------------------------------');
  
  // Create a new readline interface for each question to avoid ERR_USE_AFTER_CLOSE
  const askQuestion = async () => {
    const questionRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    try {
      const input = await new Promise(resolve => {
        questionRl.question('> ', answer => {
          resolve(answer);
          questionRl.close();
        });
      });
      
      // Handle special commands
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        return;
      } else if (input === '!help') {
        console.log('\nAvailable commands:');
        console.log('!help - Display this help message');
        console.log('!task - Toggle agent task mode');
        console.log('!system <prompt> - Set a custom system prompt');
        console.log('!server <url> - Set server URL');
        console.log('!status - Display current settings');
        console.log('exit/quit - End the session');
        console.log('------------------------------------');
        setTimeout(() => askQuestion(), 100);
        return;
      } else if (input === '!task') {
        sessionOptions.useTask = !sessionOptions.useTask;
        console.log(`\nAgent task mode ${sessionOptions.useTask ? 'enabled' : 'disabled'}`);
        console.log('------------------------------------');
        setTimeout(() => askQuestion(), 100);
        return;
      } else if (input.startsWith('!system ')) {
        sessionOptions.systemPrompt = input.substring(8);
        console.log('\nSystem prompt updated');
        console.log('------------------------------------');
        setTimeout(() => askQuestion(), 100);
        return;
      } else if (input.startsWith('!server ')) {
        sessionOptions.serverUrl = input.substring(8);
        console.log(`\nServer URL updated to ${sessionOptions.serverUrl}`);
        console.log('------------------------------------');
        setTimeout(() => askQuestion(), 100);
        return;
      } else if (input === '!status') {
        console.log(`\nServer URL: ${sessionOptions.serverUrl}`);
        console.log(`Mode: ${sessionOptions.useTask ? 'Agent Task (advanced)' : 'Agent Chat (basic)'}`);
        if (sessionOptions.systemPrompt) {
          console.log(`Custom system prompt: "${sessionOptions.systemPrompt.substring(0, 50)}..."`);
        } else {
          console.log('Using default system prompt');
        }
        console.log('------------------------------------');
        setTimeout(() => askQuestion(), 100);
        return;
      }
      
      // Regular prompt, send to agent
      const response = await chatWithAgent(input, sessionOptions);
      console.log('\nAgent:');
      console.log(response);
      console.log('------------------------------------');
      
      // Call askQuestion again with a slight delay to ensure the previous readline is fully closed
      setTimeout(() => askQuestion(), 100);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  };
  
  await askQuestion();
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Tradeliy Agent CLI - Command Line Interface for Agent Server

USAGE:
  node agent-cli.js [options] [prompt]

OPTIONS:
  --help, -h            Display this help message
  --interactive, -i     Start in interactive mode
  --server, -s <url>    Set a custom agent server URL (default: ${AGENT_SERVER_URL})
  --task, -t            Use the agent-task endpoint instead of agent-chat (more comprehensive)
  --system, -p <text>   Set a custom system prompt

EXAMPLES:
  node agent-cli.js "How does the platform handle geo-restrictions?"
  node agent-cli.js -i
  node agent-cli.js -t "Analyze the performance of XGBoost models"
  node agent-cli.js -s http://localhost:3030 "Custom server query"
  node agent-cli.js -p "You are a crypto analyst" "Tell me about Bitcoin"
`);
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const result = {
    help: false,
    interactive: false,
    serverUrl: AGENT_SERVER_URL,
    useTask: false,
    systemPrompt: undefined,
    prompt: '',
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--interactive' || arg === '-i') {
      result.interactive = true;
    } else if (arg === '--task' || arg === '-t') {
      result.useTask = true;
    } else if (arg === '--server' || arg === '-s') {
      if (i + 1 < args.length) {
        result.serverUrl = args[++i];
      }
    } else if (arg === '--system' || arg === '-p') {
      if (i + 1 < args.length) {
        result.systemPrompt = args[++i];
      }
    } else {
      // Collect remaining arguments as the prompt
      const promptArgs = args.slice(i);
      result.prompt = promptArgs.join(' ');
      break;
    }
  }
  
  return result;
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = parseArguments();
  
  // Display help and exit if requested
  if (args.help) {
    displayHelp();
    return;
  }
  
  // Check if agent server is running
  const serverRunning = await checkServerStatus(args.serverUrl);
  
  if (!serverRunning) {
    console.error(`
Error: Cannot connect to agent server at ${args.serverUrl}
Make sure the agent server is running with:
  node server/standalone-agent-server.js
`);
    process.exit(1);
  }
  
  // Prepare options for both interactive mode and single command mode
  const options = {
    serverUrl: args.serverUrl,
    useTask: args.useTask,
    systemPrompt: args.systemPrompt
  };

  if (args.interactive) {
    // Interactive mode with options
    await startInteractiveMode(options);
  } else if (args.prompt) {
    // Single command mode with options
    const response = await chatWithAgent(args.prompt, options);
    console.log(response);
  } else {
    // No prompt provided, default to interactive mode
    await startInteractiveMode(options);
  }
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});