import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

const log = createLogger('logging');

let logFilePath: string | null = null;
let logFileSetupDone = false;

export function createLogger(module: string): Logger {
  return {
    info: (message: string, ...args: unknown[]) => {
      console.log(`[${module}] ${message}`, ...args);
      writeToFile('INFO', module, message, args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[${module}] ${message}`, ...args);
      writeToFile('WARN', module, message, args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[${module}] ${message}`, ...args);
      writeToFile('ERROR', module, message, args);
    }
  };
}

// Lazily initialises the log file on the first write. Called before app.whenReady()
// is safe because app.getPath('logs') is available as soon as the main process starts.
function initLogFile(): void {
  if (logFileSetupDone) {
    return;
  }
  logFileSetupDone = true;
  try {
    const logsDir = app.getPath('logs');
    fs.mkdirSync(logsDir, { recursive: true });
    logFilePath = path.join(logsDir, 'app.log');
    fs.appendFileSync(logFilePath, `\n--- Session started ${new Date().toISOString()} ---\n`);
  } catch {
    // File logging unavailable; warn and continue with console only.
    log.warn('Logfile is unavailable. Continuing with console only.');
  }
}

function writeToFile(level: string, moduleName: string, message: string, args: unknown[]): void {
  initLogFile();
  if (logFilePath === null) {
    return;
  }
  const timestamp = new Date().toISOString();
  const argsText = args.length > 0 ? ' ' + args.map(serializeArg).join(' ') : '';
  const line = `[${timestamp}] [${level.padEnd(5)}] [${moduleName}] ${message}${argsText}\n`;
  try {
    fs.appendFileSync(logFilePath, line);
  } catch {
    // Silently continue with console only if the file write fails.
  }
}

function serializeArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}
