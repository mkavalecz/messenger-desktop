import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { getLogFile, getLogsDir, IS_DEBUG, LOG_ROTATION_MAX_FILES, LOG_ROTATION_SIZE_BYTES } from './constants';

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

let logFilePath: string | null = null;
let logFileSetupDone = false;
let bytesWritten = 0;
let rotationFailed = false;

export function createLogger(module: string): Logger {
  return {
    debug: (message: string, ...args: unknown[]) => {
      if (IS_DEBUG) {
        console.log(`[${module}] ${message}`, ...args);
        writeToFile('DEBUG', module, message, args);
      }
    },
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

// Lazily initializes the log file on the first write.
function initLogFile(): void {
  if (logFileSetupDone) {
    return;
  }
  logFileSetupDone = true;
  try {
    fs.mkdirSync(getLogsDir(), { recursive: true });
    logFilePath = getLogFile();

    // Seed the in-memory counter from the actual file size so the threshold is
    // accurate even across restarts. Rotate immediately if already over the limit.
    try {
      bytesWritten = fs.statSync(logFilePath).size;
    } catch {
      bytesWritten = 0;
    }
    if (bytesWritten >= LOG_ROTATION_SIZE_BYTES) {
      rotateLogs();
    }

    const separator = `\n--- Session started ${new Date().toISOString()} ---\n`;
    fs.appendFileSync(logFilePath, separator);
    bytesWritten += Buffer.byteLength(separator);
  } catch {
    logFilePath = null;
    console.warn('[logging] Logfile is unavailable. Continuing with console only.');
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
    if (bytesWritten >= LOG_ROTATION_SIZE_BYTES && !rotationFailed) {
      rotateLogs();
    }
    fs.appendFileSync(logFilePath, line);
    bytesWritten += Buffer.byteLength(line);
  } catch {
    // Silently continue with console only if the file write fails.
  }
}

// Compresses the current log file to app.1.log.gz, shifts older compressed logs
// down by one, and drops the oldest if LOG_ROTATION_MAX_FILES would be exceeded.
// All operations are synchronous to avoid concurrency issues.
// If anything fails, the current log file is left untouched and rotation is
// disabled for this session via rotationFailed.
function rotateLogs(): void {
  if (logFilePath === null) {
    return;
  }
  try {
    const dir = path.dirname(logFilePath);

    const rotatedFilePath = (index: number): string => path.join(dir, `app.${index}.log.gz`);

    // Drop the oldest file to make room for the incoming one.
    const oldestPath = rotatedFilePath(LOG_ROTATION_MAX_FILES);
    if (fs.existsSync(oldestPath)) {
      fs.unlinkSync(oldestPath);
    }

    // Shift: app.3.log.gz → app.4.log.gz, app.2 → app.3, app.1 → app.2
    for (let i = LOG_ROTATION_MAX_FILES - 1; i >= 1; i--) {
      const src = rotatedFilePath(i);
      if (fs.existsSync(src)) {
        fs.renameSync(src, rotatedFilePath(i + 1));
      }
    }

    // Compress the current log into app.1.log.gz, then remove the original.
    // Unlink only happens after a successful write so the log is never lost.
    const content = fs.readFileSync(logFilePath);
    fs.writeFileSync(rotatedFilePath(1), zlib.gzipSync(content));
    fs.unlinkSync(logFilePath);
    bytesWritten = 0;
  } catch {
    // If rotation fails (e.g. disk full), stop retrying for this session.
    // The file will keep growing, but writes will continue uninterrupted.
    rotationFailed = true;
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
