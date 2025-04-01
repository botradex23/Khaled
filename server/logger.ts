/**
 * Simple logger implementation
 */

export const logger = {
  info: (message: string) => {
    console.log(`[INFO] ${message}`);
  },
  error: (message: string) => {
    console.error(`[ERROR] ${message}`);
  },
  warn: (message: string) => {
    console.warn(`[WARN] ${message}`);
  },
  debug: (message: string) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }
};