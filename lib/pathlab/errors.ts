/**
 * Error Handling for PathLab Page Builder
 *
 * Centralized error handling with user-friendly messages and structured logging.
 */

import { ValidationError } from './validation';
import { UnauthorizedError, NotFoundError } from './authorization';

export class PathLabError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PathLabError';
  }
}

export class NetworkError extends PathLabError {
  constructor(message: string) {
    super(message, 'Network error. Please check your connection.', 'NETWORK_ERROR', 503);
  }
}

export class PartialBatchError extends PathLabError {
  constructor(
    message: string,
    public succeeded: any[],
    public failed: Array<{ item: any; error: Error }>
  ) {
    super(
      message,
      `${succeeded.length} of ${succeeded.length + failed.length} operations succeeded`,
      'PARTIAL_BATCH_ERROR',
      207 // Multi-Status
    );
  }
}

export class ConflictError extends PathLabError {
  constructor(message: string, userMessage?: string) {
    super(
      message,
      userMessage || 'A conflict occurred. Please refresh and try again.',
      'CONFLICT_ERROR',
      409
    );
  }
}

export class PayloadTooLargeError extends PathLabError {
  constructor(message: string) {
    super(
      message,
      'The data you submitted is too large',
      'PAYLOAD_TOO_LARGE',
      413
    );
  }
}

/**
 * Handle errors and return standardized API response
 */
export function handleApiError(error: unknown): {
  statusCode: number;
  body: {
    error: string;
    message: string;
    code?: string;
  };
} {
  // Log the error (in production, send to monitoring service)
  console.error('[API ERROR]', error);

  // Validation errors
  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      body: {
        error: error.userMessage,
        message: error.message,
        code: 'VALIDATION_ERROR',
      },
    };
  }

  // Authorization errors
  if (error instanceof UnauthorizedError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.message,
        message: error.message,
        code: 'UNAUTHORIZED',
      },
    };
  }

  // Not found errors
  if (error instanceof NotFoundError) {
    return {
      statusCode: 404,
      body: {
        error: error.message,
        message: error.message,
        code: 'NOT_FOUND',
      },
    };
  }

  // PathLab errors
  if (error instanceof PathLabError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.userMessage,
        message: error.message,
        code: error.code,
      },
    };
  }

  // Supabase/PostgreSQL errors
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string };

    // Unique constraint violation
    if (pgError.code === '23505') {
      return {
        statusCode: 409,
        body: {
          error: 'A duplicate entry already exists',
          message: pgError.message,
          code: 'DUPLICATE_ENTRY',
        },
      };
    }

    // Foreign key violation
    if (pgError.code === '23503') {
      return {
        statusCode: 400,
        body: {
          error: 'Referenced resource not found',
          message: pgError.message,
          code: 'FOREIGN_KEY_VIOLATION',
        },
      };
    }

    // RLS policy violation
    if (pgError.code === '42501') {
      return {
        statusCode: 403,
        body: {
          error: 'Access denied',
          message: 'You do not have permission to perform this action',
          code: 'ACCESS_DENIED',
        },
      };
    }
  }

  // Generic error
  return {
    statusCode: 500,
    body: {
      error: 'An unexpected error occurred',
      message:
        error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR',
    },
  };
}

/**
 * Log errors with structured context
 */
export function logError(
  error: unknown,
  context: {
    operation: string;
    userId?: string;
    pageId?: string;
    activityId?: string;
    [key: string]: any;
  }
): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  console.error('[PathLab Error]', JSON.stringify(errorInfo, null, 2));

  // In production, send to monitoring service (Sentry, DataDog, etc.)
  // Example: Sentry.captureException(error, { contexts: { pathlab: errorInfo } });
}

/**
 * Retry logic for network errors
 */
export async function retryOnNetworkError<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on network errors
      if (
        error instanceof NetworkError ||
        (error instanceof Error && error.message.includes('fetch'))
      ) {
        if (attempt < maxRetries - 1) {
          // Exponential backoff
          const delay = delayMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Don't retry validation/auth errors
      throw error;
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Handle partial batch failures
 */
export function createPartialBatchError(
  results: Array<{ success: boolean; data?: any; error?: Error; index: number }>
): PartialBatchError | null {
  const succeeded = results.filter(r => r.success).map(r => r.data);
  const failed = results
    .filter(r => !r.success)
    .map(r => ({
      item: r.index,
      error: r.error || new Error('Unknown error'),
    }));

  if (failed.length === 0) {
    return null; // All succeeded
  }

  return new PartialBatchError(
    `Batch operation partially failed: ${succeeded.length}/${results.length} succeeded`,
    succeeded,
    failed
  );
}
