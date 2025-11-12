// src/lib/logger.ts

/**
 * Centralized logging utility for the Luna ERP system
 * 
 * - Logs are only shown in development mode
 * - Production logs are silenced to prevent console clutter and data exposure
 * - Errors are always logged (can be sent to error tracking services)
 * - Provides structured logging with timestamps and context
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  module?: string;
  userId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isServer: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Debug level logging - only in development
   * Use for detailed debugging information
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${this.getTimestamp()} ${message}`, ...args);
    }
  }

  /**
   * Info level logging - only in development
   * Use for general informational messages
   */
  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${this.getTimestamp()} ${message}`, ...args);
    }
  }

  /**
   * Warning level logging - only in development
   * Use for warning messages that aren't critical
   */
  warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${this.getTimestamp()} ${message}`, ...args);
    }
  }

  /**
   * Error level logging - always logged
   * Use for error conditions that should be tracked
   * In production, these can be sent to error tracking services
   */
  error(message: string, error?: any, context?: LogContext): void {
    const errorMessage = `[ERROR] ${this.getTimestamp()} ${message}`;
    
    if (this.isDevelopment) {
      console.error(errorMessage, error, context);
    } else {
      // In production, log to error tracking service
      // TODO: Integrate with Sentry, LogRocket, or similar
      console.error(errorMessage);
      
      // You can add error tracking service integration here:
      // if (typeof window !== 'undefined' && window.Sentry) {
      //   window.Sentry.captureException(error, {
      //     extra: { message, ...context }
      //   });
      // }
    }
  }

  /**
   * Log with custom context
   * Useful for structured logging with additional metadata
   */
  logWithContext(level: LogLevel, message: string, context: LogContext): void {
    const contextStr = Object.keys(context).length > 0 
      ? `\n  Context: ${JSON.stringify(context, null, 2)}` 
      : '';
    
    switch (level) {
      case 'debug':
        this.debug(`${message}${contextStr}`);
        break;
      case 'info':
        this.info(`${message}${contextStr}`);
        break;
      case 'warn':
        this.warn(`${message}${contextStr}`);
        break;
      case 'error':
        this.error(`${message}${contextStr}`, undefined, context);
        break;
    }
  }

  /**
   * Get formatted timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a scoped logger for a specific module
   * This helps identify which part of the app generated the log
   */
  createModuleLogger(moduleName: string) {
    return {
      debug: (message: string, ...args: any[]) => 
        this.debug(`[${moduleName}] ${message}`, ...args),
      info: (message: string, ...args: any[]) => 
        this.info(`[${moduleName}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => 
        this.warn(`[${moduleName}] ${message}`, ...args),
      error: (message: string, error?: any, context?: LogContext) => 
        this.error(`[${moduleName}] ${message}`, error, { ...context, module: moduleName }),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience function for creating module loggers
export const createLogger = (moduleName: string) => logger.createModuleLogger(moduleName);
