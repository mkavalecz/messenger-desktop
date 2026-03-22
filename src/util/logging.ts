export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export function createLogger(module: string): Logger {
  return {
    info: (message: string, ...args: unknown[]) => {
      console.log(`[${module}] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[${module}] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[${module}] ${message}`, ...args);
    }
  };
}
