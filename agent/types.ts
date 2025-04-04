/**
 * Types for CryptoTrade AI Agent
 */

// Main agent configuration
export interface AgentConfig {
  // How often to check system health (milliseconds)
  checkIntervalMs: number;
  
  // Critical files that must exist
  criticalFiles: string[];
  
  // Endpoints to check
  endpoints: {
    frontend: string;
    backend: string;
    python: string;
  };
  
  // Database configuration
  db: {
    uri: string;
    name: string;
    enabled: boolean;
  };
  
  // Proxy configuration
  proxy: {
    enabled: boolean;
    filePath: string;
  };
  
  // Binance API configuration
  binance: {
    enabled: boolean;
    useProxy: boolean;
  };
  
  // Notification settings
  notifications: {
    enabled: boolean;
    email?: string;
    telegram?: {
      botToken: string;
      chatId: string;
    };
  };
}

// Health check issue
export interface Issue {
  type: 'file' | 'server' | 'database' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Health check result
export interface HealthCheckResult {
  healthy: boolean;
  issues: Issue[];
}

// File check result
export interface FileCheckResult extends HealthCheckResult {
  missingFiles: string[];
  existingFiles: string[];
}

// Server check result
export interface ServerCheckResult extends HealthCheckResult {
  servers: {
    name: string;
    url: string;
    status: 'online' | 'offline' | 'degraded';
    responseTime?: number;
    error?: string;
  }[];
}

// Database check result
export interface DatabaseCheckResult extends HealthCheckResult {
  connected: boolean;
  responseTime?: number;
  error?: string;
}

// Notification payload
export interface Notification {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  details?: any;
}

// Repair attempt options
export interface RepairAttemptOptions {
  fileIssues: Issue[];
  serverIssues: Issue[];
  dbIssues: Issue[];
}

// Repair result
export interface RepairResult {
  success: boolean;
  actionsAttempted: string[];
  actionsSucceeded: string[];
  actionsFailed: string[];
  issues: {
    fixed: Issue[];
    remaining: Issue[];
  };
}