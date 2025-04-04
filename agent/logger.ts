/**
 * Logger for CryptoTrade AI Agent
 */

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Logger configuration
interface LoggerConfig {
  logDirectory: string;
  logFile: string;
  consoleOutput: boolean;
  minimumLevel: LogLevel;
}

const defaultConfig: LoggerConfig = {
  logDirectory: 'logs',
  logFile: 'agent.log',
  consoleOutput: true,
  minimumLevel: 'info'
};

// Map of log levels to their numeric value (for filtering)
const logLevelValue: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    // Ensure log directory exists
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }
  
  /**
   * Log a message with specified level
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    // Check if this log should be output based on minimum level
    if (logLevelValue[level] < logLevelValue[this.config.minimumLevel]) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const metaString = meta ? `\n${util.inspect(meta, { depth: 4, colors: false })}` : '';
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}\n`;
    
    // Write to log file
    fs.appendFileSync(
      path.join(this.config.logDirectory, this.config.logFile),
      logEntry
    );
    
    // Output to console if enabled
    if (this.config.consoleOutput) {
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
      if (meta) {
        console.dir(meta, { depth: 4, colors: true });
      }
    }
  }
  
  /**
   * Get the appropriate console method for the log level
   */
  private getConsoleMethod(level: LogLevel): (message: string) => void {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error': 
      case 'fatal': 
        return console.error;
      default: return console.log;
    }
  }
  
  // Public logging methods
  
  /**
   * Log a debug message
   */
  public debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }
  
  /**
   * Log an info message
   */
  public info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }
  
  /**
   * Log an error message
   */
  public error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }
  
  /**
   * Log a fatal error message
   */
  public fatal(message: string, meta?: any): void {
    this.log('fatal', message, meta);
  }
}

// Export a singleton logger instance
export const logger = new Logger();