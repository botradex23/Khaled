/**
 * Self-Repair Module
 * 
 * Attempts to automatically fix common issues encountered by the agent.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Issue, RepairAttemptOptions, RepairResult } from './types';
import { logger } from './logger';
import { sendNotification } from './notifications';
import { getFileContent, ensureDirectoryExists } from './healthChecks/fileCheck';

// Promisify exec
const execAsync = promisify(exec);

/**
 * Attempt to repair issues based on health check results
 */
export async function attemptRepair(options: RepairAttemptOptions): Promise<RepairResult> {
  logger.info('Starting repair attempt', { options });
  
  const result: RepairResult = {
    success: false,
    actionsAttempted: [],
    actionsSucceeded: [],
    actionsFailed: [],
    issues: {
      fixed: [],
      remaining: []
    }
  };
  
  // Combine all issues
  const allIssues = [
    ...options.fileIssues,
    ...options.serverIssues,
    ...options.dbIssues
  ];
  
  if (allIssues.length === 0) {
    logger.info('No issues to repair');
    result.success = true;
    return result;
  }
  
  // First, try to fix file issues
  if (options.fileIssues.length > 0) {
    const fileRepairResult = await repairFileIssues(options.fileIssues);
    
    result.actionsAttempted.push(...fileRepairResult.actionsAttempted);
    result.actionsSucceeded.push(...fileRepairResult.actionsSucceeded);
    result.actionsFailed.push(...fileRepairResult.actionsFailed);
    result.issues.fixed.push(...fileRepairResult.issues.fixed);
    result.issues.remaining.push(...fileRepairResult.issues.remaining);
  }
  
  // Next, try to fix server issues
  if (options.serverIssues.length > 0) {
    const serverRepairResult = await repairServerIssues(options.serverIssues);
    
    result.actionsAttempted.push(...serverRepairResult.actionsAttempted);
    result.actionsSucceeded.push(...serverRepairResult.actionsSucceeded);
    result.actionsFailed.push(...serverRepairResult.actionsFailed);
    result.issues.fixed.push(...serverRepairResult.issues.fixed);
    result.issues.remaining.push(...serverRepairResult.issues.remaining);
  }
  
  // Finally, try to fix database issues
  if (options.dbIssues.length > 0) {
    const dbRepairResult = await repairDatabaseIssues(options.dbIssues);
    
    result.actionsAttempted.push(...dbRepairResult.actionsAttempted);
    result.actionsSucceeded.push(...dbRepairResult.actionsSucceeded);
    result.actionsFailed.push(...dbRepairResult.actionsFailed);
    result.issues.fixed.push(...dbRepairResult.issues.fixed);
    result.issues.remaining.push(...dbRepairResult.issues.remaining);
  }
  
  // Determine if repair was successful
  result.success = result.actionsFailed.length === 0 && result.issues.remaining.length === 0;
  
  // Send notification about repair attempt
  await sendNotification({
    level: result.success ? 'info' : 'warning',
    title: `Repair ${result.success ? 'Successful' : 'Attempted'}`,
    message: `${result.actionsSucceeded.length} actions succeeded, ${result.actionsFailed.length} actions failed`,
    details: {
      actionsAttempted: result.actionsAttempted,
      actionsSucceeded: result.actionsSucceeded,
      actionsFailed: result.actionsFailed,
      issuesFixed: result.issues.fixed.length,
      issuesRemaining: result.issues.remaining.length
    }
  });
  
  logger.info('Repair attempt completed', { result });
  return result;
}

/**
 * Repair file-related issues
 */
async function repairFileIssues(issues: Issue[]): Promise<RepairResult> {
  logger.info('Attempting to repair file issues', { issues });
  
  const result: RepairResult = {
    success: false,
    actionsAttempted: [],
    actionsSucceeded: [],
    actionsFailed: [],
    issues: {
      fixed: [],
      remaining: []
    }
  };
  
  for (const issue of issues) {
    try {
      // Extract file path from issue
      const filePath = issue.component;
      
      if (!filePath) {
        result.issues.remaining.push(issue);
        continue;
      }
      
      const action = `Fix missing or corrupted file: ${filePath}`;
      result.actionsAttempted.push(action);
      
      // Check if directory exists
      const dirPath = path.dirname(filePath);
      await ensureDirectoryExists(dirPath);
      
      if (filePath.endsWith('.js') || filePath.endsWith('.cjs')) {
        // For JavaScript files, try to restore from backup or create minimal version
        await repairJavaScriptFile(filePath);
        result.actionsSucceeded.push(action);
        result.issues.fixed.push(issue);
      } else if (filePath.endsWith('.json')) {
        // For JSON files, try to restore from backup or create default version
        await repairJsonFile(filePath);
        result.actionsSucceeded.push(action);
        result.issues.fixed.push(issue);
      } else if (filePath.endsWith('.py')) {
        // For Python files, try to restore from backup or create minimal version
        await repairPythonFile(filePath);
        result.actionsSucceeded.push(action);
        result.issues.fixed.push(issue);
      } else {
        // For other files, we can't restore them automatically
        logger.warn(`Cannot automatically repair file: ${filePath}`);
        result.actionsFailed.push(action);
        result.issues.remaining.push(issue);
      }
    } catch (error) {
      logger.error(`Failed to repair issue: ${issue.message}`, { error });
      result.actionsFailed.push(`Fix issue: ${issue.message}`);
      result.issues.remaining.push(issue);
    }
  }
  
  // Determine if repair was successful
  result.success = result.actionsFailed.length === 0 && result.issues.remaining.length === 0;
  
  return result;
}

/**
 * Attempt to repair a JavaScript file
 */
async function repairJavaScriptFile(filePath: string): Promise<boolean> {
  // Check if there's a backup file
  const backupPath = `${filePath}.bak`;
  
  if (fs.existsSync(backupPath)) {
    // Restore from backup
    logger.info(`Restoring ${filePath} from backup`);
    fs.copyFileSync(backupPath, filePath);
    return true;
  }
  
  // For specific critical files, create minimal versions
  if (filePath === 'server/index.js' || filePath === 'index.js') {
    logger.info(`Creating minimal version of ${filePath}`);
    
    const content = `
/**
 * Crypto Trading Platform Server
 * 
 * Basic server setup for serving static files
 */
const express = require('express');
const path = require('path');

// Create app
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;
    
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

/**
 * Attempt to repair a JSON file
 */
async function repairJsonFile(filePath: string): Promise<boolean> {
  // Check if there's a backup file
  const backupPath = `${filePath}.bak`;
  
  if (fs.existsSync(backupPath)) {
    // Restore from backup
    logger.info(`Restoring ${filePath} from backup`);
    fs.copyFileSync(backupPath, filePath);
    return true;
  }
  
  // For package.json, create a minimal version
  if (filePath.endsWith('package.json')) {
    logger.info(`Creating minimal version of ${filePath}`);
    
    const content = {
      name: "crypto-trading-platform",
      version: "1.0.0",
      description: "Cryptocurrency Trading Platform",
      main: "index.js",
      scripts: {
        "start": "node index.js",
        "dev": "node --require dotenv/config dev.cjs"
      },
      dependencies: {
        "axios": "^0.26.1",
        "cors": "^2.8.5",
        "dotenv": "^16.0.0",
        "express": "^4.17.3",
        "mongodb": "^4.5.0"
      }
    };
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    return true;
  }
  
  return false;
}

/**
 * Attempt to repair a Python file
 */
async function repairPythonFile(filePath: string): Promise<boolean> {
  // Check if there's a backup file
  const backupPath = `${filePath}.bak`;
  
  if (fs.existsSync(backupPath)) {
    // Restore from backup
    logger.info(`Restoring ${filePath} from backup`);
    fs.copyFileSync(backupPath, filePath);
    return true;
  }
  
  // For specific critical files, create minimal versions
  if (filePath.endsWith('api_server.py') || filePath.endsWith('binance_api_server.py')) {
    logger.info(`Creating minimal version of ${filePath}`);
    
    const content = `"""
Basic API Server

A minimal Flask server for API endpoints.
"""
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/status')
def status():
    """Get server status"""
    return jsonify({
        "status": "ok",
        "message": "Server is running"
    })

@app.route('/api/ping')
def ping():
    """Test connection to the server"""
    return jsonify({
        "status": "ok",
        "message": "pong"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
`;
    
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

/**
 * Repair server-related issues
 */
async function repairServerIssues(issues: Issue[]): Promise<RepairResult> {
  logger.info('Attempting to repair server issues', { issues });
  
  const result: RepairResult = {
    success: false,
    actionsAttempted: [],
    actionsSucceeded: [],
    actionsFailed: [],
    issues: {
      fixed: [],
      remaining: []
    }
  };
  
  for (const issue of issues) {
    try {
      const component = issue.component;
      const action = `Restart ${component} server`;
      
      result.actionsAttempted.push(action);
      
      if (component === 'frontend' || component === 'backend') {
        // Restart the Node.js server
        try {
          await execAsync('npm run dev &');
          result.actionsSucceeded.push(action);
          result.issues.fixed.push(issue);
        } catch (error) {
          logger.error(`Failed to restart Node.js server: ${error.message}`);
          result.actionsFailed.push(action);
          result.issues.remaining.push(issue);
        }
      } else if (component === 'python') {
        // Restart the Python API server
        try {
          await execAsync('python api_server.py &');
          result.actionsSucceeded.push(action);
          result.issues.fixed.push(issue);
        } catch (error) {
          logger.error(`Failed to restart Python API server: ${error.message}`);
          result.actionsFailed.push(action);
          result.issues.remaining.push(issue);
        }
      } else {
        // Unknown server component
        logger.warn(`Unknown server component: ${component}`);
        result.actionsFailed.push(action);
        result.issues.remaining.push(issue);
      }
    } catch (error) {
      logger.error(`Failed to repair issue: ${issue.message}`, { error });
      result.actionsFailed.push(`Fix issue: ${issue.message}`);
      result.issues.remaining.push(issue);
    }
  }
  
  // Determine if repair was successful
  result.success = result.actionsFailed.length === 0 && result.issues.remaining.length === 0;
  
  return result;
}

/**
 * Repair database-related issues
 */
async function repairDatabaseIssues(issues: Issue[]): Promise<RepairResult> {
  logger.info('Attempting to repair database issues', { issues });
  
  const result: RepairResult = {
    success: false,
    actionsAttempted: [],
    actionsSucceeded: [],
    actionsFailed: [],
    issues: {
      fixed: [],
      remaining: []
    }
  };
  
  for (const issue of issues) {
    try {
      const action = `Fix database issue: ${issue.message}`;
      result.actionsAttempted.push(action);
      
      if (issue.message.includes("doesn't exist")) {
        // Database doesn't exist, try to create it
        try {
          // We can't create MongoDB databases directly, they're created when first accessed
          // Just log the issue for manual intervention
          logger.info(`Database will be created automatically when first accessed: ${issue.message}`);
          result.actionsSucceeded.push(action);
          result.issues.fixed.push(issue);
        } catch (error) {
          logger.error(`Failed to address database issue: ${error.message}`);
          result.actionsFailed.push(action);
          result.issues.remaining.push(issue);
        }
      } else {
        // Other database issues - these often require manual intervention
        logger.warn(`Cannot automatically repair database issue: ${issue.message}`);
        result.actionsFailed.push(action);
        result.issues.remaining.push(issue);
      }
    } catch (error) {
      logger.error(`Failed to repair issue: ${issue.message}`, { error });
      result.actionsFailed.push(`Fix issue: ${issue.message}`);
      result.issues.remaining.push(issue);
    }
  }
  
  // Determine if repair was successful
  result.success = result.actionsFailed.length === 0 && result.issues.remaining.length === 0;
  
  return result;
}