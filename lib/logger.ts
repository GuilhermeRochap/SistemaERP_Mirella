/**
 * Sistema de Logs Centralizado
 * Comportamento diferente para desenvolvimento e produção
 */

import { config } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = LOG_LEVELS[config.logging.level as LogLevel] || 0;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLogLevel;
}

function formatLogEntry(entry: LogEntry): string {
  if (config.isProduction) {
    // Em produção: JSON estruturado para parsing
    return JSON.stringify(entry);
  } else {
    // Em desenvolvimento: formato legível
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[entry.level];

    let output = `${emoji} [${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    if (entry.context) output += ` [${entry.context}]`;
    output += ` ${entry.message}`;
    
    if (entry.data) {
      output += `\n   Data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    return output;
  }
}

function createLogEntry(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    context,
  };
}

export const logger = {
  debug(message: string, data?: any, context?: string): void {
    if (shouldLog('debug')) {
      console.log(formatLogEntry(createLogEntry('debug', message, data, context)));
    }
  },

  info(message: string, data?: any, context?: string): void {
    if (shouldLog('info')) {
      console.log(formatLogEntry(createLogEntry('info', message, data, context)));
    }
  },

  warn(message: string, data?: any, context?: string): void {
    if (shouldLog('warn')) {
      console.warn(formatLogEntry(createLogEntry('warn', message, data, context)));
    }
  },

  error(message: string, data?: any, context?: string): void {
    if (shouldLog('error')) {
      console.error(formatLogEntry(createLogEntry('error', message, data, context)));
    }
  },

  // Log de requisições HTTP (útil para APIs)
  request(method: string, path: string, statusCode: number, duration: number): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this[level](`${method} ${path} ${statusCode} ${duration}ms`, undefined, 'HTTP');
  },

  // Log de queries do banco (apenas em dev se habilitado)
  query(sql: string, duration: number): void {
    if (config.logging.enableQueryLogging) {
      this.debug(`Query executada em ${duration}ms`, { sql: sql.substring(0, 200) }, 'DB');
    }
  },
};

export default logger;
