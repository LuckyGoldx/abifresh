import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', '..', 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'abifresh-api' },
  transports: [
    // Console output (simple format for dev readability)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        }),
      ),
    }),

    // Daily rotating application log
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // Separate error log
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
    }),

    // Security / audit log
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
    }),
  ],
});

export default logger;

// ==================== Convenience helpers ====================

/**
 * Log a security-relevant event (authentication, authorization, admin actions).
 */
export function logSecurity(event: string, meta: Record<string, unknown> = {}) {
  logger.info(event, { category: 'security', ...meta });
}

/**
 * Log an HTTP request summary (used by the request-logging middleware).
 */
export function logRequest(method: string, path: string, statusCode: number, durationMs: number, meta: Record<string, unknown> = {}) {
  logger.info(`${method} ${path} ${statusCode} ${durationMs}ms`, { category: 'http', ...meta });
}
