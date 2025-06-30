import { useCallback, useEffect, useState } from 'preact/hooks';

export interface RuntimeError {
  message: string;
  filename: string;
  lineno: number;
  colno: number;
  stack?: string;
  timestamp: Date;
}

export function useRuntimeErrors() {
  const [lastError, setLastError] = useState<RuntimeError | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const runtimeError: RuntimeError = {
        message: event.message,
        filename: event.filename || 'unknown',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        stack: event.error?.stack,
        timestamp: new Date(),
      };

      setLastError(runtimeError);
      setErrorCount((prev) => prev + 1);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const runtimeError: RuntimeError = {
        message: `Unhandled Promise Rejection: ${event.reason}`,
        filename: 'unknown',
        lineno: 0,
        colno: 0,
        stack: event.reason?.stack,
        timestamp: new Date(),
      };

      setLastError(runtimeError);
      setErrorCount((prev) => prev + 1);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
    };
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    errorCount,
    clearError,
    hasError: lastError !== null,
  };
}
