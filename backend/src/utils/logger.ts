

import fs from 'fs';
import path from 'path';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_FILE_PATH = process.env['LOG_FILE_PATH'] || path.join(process.cwd(), 'logs', 'app.log');
const LOG_TO_FILE = process.env['LOG_TO_FILE'] === 'true';
const LOG_LEVEL: LogLevel = (process.env['LOG_LEVEL'] as LogLevel) || 'info';

const levelPriority: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};


function getTimestamp(): string {
  return new Date().toISOString();
}


function format(level: LogLevel, message: string, meta?: unknown): string {
  let base = `[${getTimestamp()}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    if (meta instanceof Error) {
      base += ` | ${meta.name}: ${meta.message}\n${meta.stack}`;
    } else {
      base += ` | ${JSON.stringify(meta)}`;
    }
  }
  return base;
}

function writeToFile(line: string) {
  const dir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(LOG_FILE_PATH, line + '\n', { encoding: 'utf8' });
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] <= levelPriority[LOG_LEVEL];
}

const colorMap: Record<LogLevel, string> = {
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
  debug: '\x1b[35m',  // magenta
};

function colorize(level: LogLevel, text: string): string {
  if (process.env['NODE_ENV'] === 'production') return text;
  return colorMap[level] + text + '\x1b[0m';
}


export const logger = {
  info: (message: string, meta?: unknown) => {
    if (!shouldLog('info')) return;
    const line = format('info', message, meta);
    console.info(colorize('info', line));
    if (LOG_TO_FILE) writeToFile(line);
  },
  warn: (message: string, meta?: unknown) => {
    if (!shouldLog('warn')) return;
    const line = format('warn', message, meta);
    console.warn(colorize('warn', line));
    if (LOG_TO_FILE) writeToFile(line);
  },
  error: (message: string, meta?: unknown) => {
    if (!shouldLog('error')) return;
    const line = format('error', message, meta);
    console.error(colorize('error', line));
    if (LOG_TO_FILE) writeToFile(line);
  },
  debug: (message: string, meta?: unknown) => {
    if (!shouldLog('debug')) return;
    if (process.env['NODE_ENV'] !== 'production') {
      const line = format('debug', message, meta);
      console.debug(colorize('debug', line));
      if (LOG_TO_FILE) writeToFile(line);
    }
  },
};
