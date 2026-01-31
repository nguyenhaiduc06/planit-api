export class AppError extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode: number,
      public details?: unknown
    ) {
      super(message);
      this.name = 'AppError';
    }
  }
  
  export class ValidationError extends AppError {
    constructor(details: { field: string; message: string; constraint: string }[]) {
      super('VALIDATION_ERROR', 'Validation failed', 400, details);
      this.name = 'ValidationError';
    }
  }
  
  export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
      super('UNAUTHORIZED', message, 401);
      this.name = 'UnauthorizedError';
    }
  }
  
  export class ForbiddenError extends AppError {
    constructor(message = "You don't have permission to perform this action") {
      super('FORBIDDEN', message, 403);
      this.name = 'ForbiddenError';
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(resource: string) {
      super('NOT_FOUND', `${resource} not found`, 404);
      this.name = 'NotFoundError';
    }
  }
  
  export class ConflictError extends AppError {
    constructor(message: string) {
      super('CONFLICT', message, 409);
      this.name = 'ConflictError';
    }
  }
  
  export class QuotaExceededError extends AppError {
    constructor(resource: string, limit: number, current: number) {
      super('QUOTA_EXCEEDED', `Maximum number of ${resource} reached`, 429, {
        limit,
        current,
        resource,
      });
      this.name = 'QuotaExceededError';
    }
  }
  
  /**
   * Error for configuration/setup issues (e.g., missing route parameters).
   * Returns 500 since this is a server-side configuration problem.
   */
  export class ConfigurationError extends AppError {
    constructor(message: string) {
      super('CONFIGURATION_ERROR', message, 500);
      this.name = 'ConfigurationError';
    }
  }
  