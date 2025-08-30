/**
 * Production-safe logger utility
 * Replaces console.log statements with conditional logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  component?: string
  userId?: string
  mapId?: string
  nodeId?: string
  [key: string]: any
}

class Logger {
  private get isDevelopment(): boolean {
    try {
      return typeof window === 'undefined' 
        ? process.env.NODE_ENV === 'development'
        : false // In browser, default to false for safety
    } catch {
      return false
    }
  }

  private get isVerbose(): boolean {
    try {
      return typeof window === 'undefined' && process.env.VERBOSE_LOGGING === 'true'
    } catch {
      return false
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` [${JSON.stringify(context)}]` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error'
    }
    
    // In development, log everything unless specifically disabled
    return true
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug') || this.isVerbose) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorStr = error instanceof Error ? error.message : String(error)
      const fullContext = { ...context, error: errorStr }
      console.error(this.formatMessage('error', message, fullContext))
      
      // In production, you might want to send to error reporting service
      if (!this.isDevelopment && error instanceof Error) {
        this.reportError(message, error, context)
      }
    }
  }

  // For gradual migration from console.log
  log(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(message, data)
    }
  }

  private reportError(message: string, error: Error, context?: LogContext): void {
    // Only report errors server-side in production to avoid client-side issues
    if (typeof window === 'undefined' && !this.isDevelopment) {
      try {
        // TODO: Integrate with error reporting service (Sentry, LogRocket, etc.)
        // Example: Sentry.captureException(error, { extra: { message, context } })
        
        // For now, just ensure it gets logged safely
        console.error('[Logger] Error report:', { message, error: error.message, context })
      } catch (reportingError) {
        // Silently fail to prevent cascading errors
        console.error('Logger: Failed to report error')
      }
    }
  }
}

// Create singleton instance
export const logger = new Logger()

// Convenience exports for common patterns
export const debugLog = (message: string, context?: LogContext) => logger.debug(message, context)
export const infoLog = (message: string, context?: LogContext) => logger.info(message, context)
export const warnLog = (message: string, context?: LogContext) => logger.warn(message, context)
export const errorLog = (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context)

// Component-specific loggers
export const createComponentLogger = (componentName: string) => ({
  debug: (message: string, context?: LogContext) => 
    logger.debug(message, { ...context, component: componentName }),
  info: (message: string, context?: LogContext) => 
    logger.info(message, { ...context, component: componentName }),
  warn: (message: string, context?: LogContext) => 
    logger.warn(message, { ...context, component: componentName }),
  error: (message: string, error?: Error | unknown, context?: LogContext) => 
    logger.error(message, error, { ...context, component: componentName }),
})

// API-specific logger
export const createApiLogger = (endpoint: string) => ({
  debug: (message: string, context?: LogContext) => 
    logger.debug(message, { ...context, endpoint }),
  info: (message: string, context?: LogContext) => 
    logger.info(message, { ...context, endpoint }),
  warn: (message: string, context?: LogContext) => 
    logger.warn(message, { ...context, endpoint }),
  error: (message: string, error?: Error | unknown, context?: LogContext) => 
    logger.error(message, error, { ...context, endpoint }),
})

export default logger