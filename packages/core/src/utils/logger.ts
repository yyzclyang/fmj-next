export interface Logger {
  log(category: string, message: string): void;
  info(category: string, message: string): void;
  warn(category: string, message: string): void;
  error(category: string, message: string, error?: unknown): void;
}

export function createLogger(scope: string): Logger {
  return {
    log: (category, message) => {
      console.log(formatLog(scope, category, message));
    },
    info: (category, message) => {
      console.log(formatLog(scope, category, message));
    },
    warn: (category, message) => {
      console.warn(formatLog(scope, category, message));
    },
    error: (category, message, error) => {
      if (error === undefined) {
        console.error(formatLog(scope, category, message));
        return;
      }
      console.error(formatLog(scope, category, message), error);
    },
  };
}

function formatLog(scope: string, category: string, message: string): string {
  return `[${scope}][${category}] ${message}`;
}
