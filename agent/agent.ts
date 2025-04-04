/**
 * CryptoTrade AI Agent
 * 
 * A self-monitoring, self-repairing agent that keeps the system running smoothly.
 * It checks for issues with files, servers, and databases, and attempts to fix
 * them automatically when possible.
 */

import * as path from 'path';
import { AgentConfig, Issue, HealthCheckResult } from './types';
import { logger } from './logger';
import { checkCriticalFiles } from './healthChecks/fileCheck';
import { checkServerStatus } from './healthChecks/serverCheck';
import { checkDatabaseConnection } from './healthChecks/databaseCheck';
import { checkProxyHealth } from './healthChecks/proxyCheck';
import { checkBinanceApiHealth } from './healthChecks/binanceCheck';
import { sendNotification } from './notifications';
import { attemptRepair } from './repair';

// Default agent configuration
const defaultConfig: AgentConfig = {
  checkIntervalMs: 60 * 1000, // 1 minute
  criticalFiles: [
    'index.js',
    'dev.cjs',
    'start.cjs',
    'run-app.cjs',
    'minimal_server.cjs',
    'api_server.py',
    'binance_api_server.py',
    '.env',
    'public/index.html',
    'public/js/main.js'
  ],
  endpoints: {
    frontend: 'http://localhost:5000',
    backend: 'http://localhost:5000/api/status',
    python: 'http://localhost:5001/api/status'
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    name: process.env.MONGODB_DB_NAME || 'crypto_trading',
    enabled: process.env.MONGODB_ENABLED !== 'false'
  },
  proxy: {
    enabled: true,
    filePath: 'attached_assets/Webshare 5 proxies.txt'
  },
  binance: {
    enabled: true,
    useProxy: true
  },
  notifications: {
    enabled: true,
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_ADMIN_CHAT_ID || ''
    }
  }
};

class CryptoTradeAgent {
  private config: AgentConfig;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private previousIssues: Issue[] = [];
  private lastRepairAttempt: number = 0;
  private isRepairing: boolean = false;
  
  constructor(config: Partial<AgentConfig> = {}) {
    // Merge provided config with default config
    this.config = { ...defaultConfig, ...config };
    
    // Update database URI from environment if available
    if (process.env.MONGODB_URI) {
      this.config.db.uri = process.env.MONGODB_URI;
    }
    
    // Adjust paths for critical files to be absolute
    this.config.criticalFiles = this.config.criticalFiles.map(file => {
      // If path is already absolute, return it directly
      if (path.isAbsolute(file)) {
        return file;
      }
      
      // Otherwise, make it absolute relative to current directory
      return path.join(process.cwd(), file);
    });
    
    logger.info('Agent initialized with configuration', { config: this.config });
  }
  
  /**
   * Start the agent
   */
  public start(): void {
    logger.info('Starting agent...');
    
    // Perform initial check immediately
    this.performHealthCheck();
    
    // Schedule regular checks
    this.checkIntervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkIntervalMs);
    
    logger.info(`Agent started, will check every ${this.config.checkIntervalMs / 1000} seconds`);
  }
  
  /**
   * Stop the agent
   */
  public stop(): void {
    logger.info('Stopping agent...');
    
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    
    logger.info('Agent stopped');
  }
  
  /**
   * Perform a health check
   */
  private async performHealthCheck(): Promise<void> {
    logger.info('Performing health check...');
    
    try {
      // Check critical files
      const fileCheckResult = await checkCriticalFiles(this.config.criticalFiles);
      
      // Check server status
      const serverCheckResult = await checkServerStatus(this.config.endpoints);
      
      // Check database connection
      const dbCheckResult = await checkDatabaseConnection(this.config.db);
      
      // Initialize proxy and Binance-related issues
      let proxyCheckResult = null;
      let binanceCheckResult = null;
      
      // Check proxy health if enabled
      if (this.config.proxy.enabled) {
        proxyCheckResult = await checkProxyHealth(this.config.proxy.filePath);
      }
      
      // Check Binance API health if enabled
      if (this.config.binance.enabled) {
        binanceCheckResult = await checkBinanceApiHealth({
          apiKey: process.env.BINANCE_API_KEY || '',
          secretKey: process.env.BINANCE_SECRET_KEY || '',
          useProxy: this.config.binance.useProxy,
          proxyFilePath: this.config.proxy.filePath
        });
      }
      
      // Combine results
      const allIssues = [
        ...fileCheckResult.issues,
        ...serverCheckResult.issues,
        ...dbCheckResult.issues
      ];
      
      // Add proxy issues if applicable
      if (proxyCheckResult) {
        allIssues.push(...proxyCheckResult.issues);
      }
      
      // Add Binance API issues if applicable
      if (binanceCheckResult) {
        allIssues.push(...binanceCheckResult.issues);
      }
      
      // Check if any new issues were found
      const newIssues = this.findNewIssues(allIssues);
      
      // Log summary
      logger.info('Health check completed', {
        fileHealth: fileCheckResult.healthy,
        serverHealth: serverCheckResult.healthy,
        dbHealth: dbCheckResult.healthy,
        proxyHealth: proxyCheckResult ? proxyCheckResult.healthy : 'not checked',
        binanceHealth: binanceCheckResult ? binanceCheckResult.healthy : 'not checked',
        totalIssues: allIssues.length,
        newIssues: newIssues.length
      });
      
      // Send notifications for new issues
      if (newIssues.length > 0) {
        await this.notifyNewIssues(newIssues);
      }
      
      // Update previous issues
      this.previousIssues = allIssues;
      
      // Attempt to repair issues if needed
      await this.repairIfNeeded(fileCheckResult, serverCheckResult, dbCheckResult);
    } catch (error) {
      logger.error('Error during health check', { error });
    }
  }
  
  /**
   * Find new issues that weren't present in the previous check
   */
  private findNewIssues(currentIssues: Issue[]): Issue[] {
    if (this.previousIssues.length === 0) {
      // First check, all current issues are new
      return currentIssues;
    }
    
    // Find issues that weren't present before
    return currentIssues.filter(current => {
      // Check if the same issue already existed
      return !this.previousIssues.some(previous => 
        previous.type === current.type && 
        previous.component === current.component &&
        previous.message === current.message);
    });
  }
  
  /**
   * Send notifications for new issues
   */
  private async notifyNewIssues(newIssues: Issue[]): Promise<void> {
    // Group issues by type and severity
    const issuesByTypeSeverity: Record<string, Issue[]> = {};
    
    for (const issue of newIssues) {
      const key = `${issue.type}-${issue.severity}`;
      
      if (!issuesByTypeSeverity[key]) {
        issuesByTypeSeverity[key] = [];
      }
      
      issuesByTypeSeverity[key].push(issue);
    }
    
    // Send grouped notifications
    for (const [key, issues] of Object.entries(issuesByTypeSeverity)) {
      const [type, severity] = key.split('-');
      
      let notificationLevel: 'info' | 'warning' | 'error' | 'critical';
      
      switch (severity) {
        case 'low':
          notificationLevel = 'info';
          break;
        case 'medium':
          notificationLevel = 'warning';
          break;
        case 'high':
          notificationLevel = 'error';
          break;
        case 'critical':
          notificationLevel = 'critical';
          break;
        default:
          notificationLevel = 'warning';
      }
      
      // Create notification title based on type and count
      const title = `${issues.length} ${severity} ${type} issue${issues.length > 1 ? 's' : ''} detected`;
      
      // Create notification message listing the issues
      const message = issues.map(issue => 
        `- ${issue.component}: ${issue.message}`
      ).join('\n');
      
      // Send notification
      await sendNotification({
        level: notificationLevel,
        title,
        message,
        details: { issues }
      });
    }
  }
  
  /**
   * Attempt to repair issues if needed
   */
  private async repairIfNeeded(
    fileCheckResult: HealthCheckResult,
    serverCheckResult: HealthCheckResult,
    dbCheckResult: HealthCheckResult
  ): Promise<void> {
    // Skip if already repairing
    if (this.isRepairing) {
      logger.info('Skipping repair attempt as another repair is in progress');
      return;
    }
    
    // Check if any issues need to be repaired
    const allIssues = [
      ...fileCheckResult.issues,
      ...serverCheckResult.issues,
      ...dbCheckResult.issues
    ];
    
    if (allIssues.length === 0) {
      // No issues to repair
      return;
    }
    
    // Check if a repair was attempted recently (within the last 5 minutes)
    const now = Date.now();
    const timeSinceLastRepair = now - this.lastRepairAttempt;
    
    if (timeSinceLastRepair < 5 * 60 * 1000) {
      logger.info('Skipping repair attempt as last attempt was recent', {
        timeSinceLastRepair: `${Math.round(timeSinceLastRepair / 1000)} seconds ago`
      });
      return;
    }
    
    // Update last repair attempt time
    this.lastRepairAttempt = now;
    this.isRepairing = true;
    
    try {
      logger.info('Attempting to repair issues...');
      
      // Attempt to repair the issues
      const repairResult = await attemptRepair({
        fileIssues: fileCheckResult.issues,
        serverIssues: serverCheckResult.issues,
        dbIssues: dbCheckResult.issues
      });
      
      logger.info('Repair attempt completed', { repairResult });
      
      // If repair was successful, perform another health check after a delay
      if (repairResult.success) {
        setTimeout(() => this.performHealthCheck(), 10000); // Check again after 10 seconds
      }
    } catch (error) {
      logger.error('Error during repair attempt', { error });
    } finally {
      this.isRepairing = false;
    }
  }
}

// Create and export the agent instance
export const agent = new CryptoTradeAgent();

// If this file is the main module, start the agent
if (require.main === module) {
  agent.start();
}