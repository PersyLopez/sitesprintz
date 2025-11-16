/**
 * Simple Logger Utility
 * 
 * Provides console logging with levels
 * In production, this would use Winston or Pino
 * 
 * Created as dependency for audit.js
 */

const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, data);
  },
  
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, data);
  },
  
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, data);
  },
  
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
};

export default logger;

