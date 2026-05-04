// ==================== CUSTOM ERROR HIERARCHY ====================

/**
 * Base application error. All domain errors extend this.
 * Carries an HTTP status code, optional structured details (never sent to client),
 * and a `trusted` flag that controls whether the message is safe for the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly trusted: boolean;

  constructor(
    message: string,
    statusCode: number,
    options?: { details?: unknown; trusted?: boolean },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = options?.details;
    this.trusted = options?.trusted ?? statusCode < 500;
  }
}

/** 400 — Invalid input or request shape. */
export class ValidationError extends AppError {
  constructor(
    message: string,
    options?: { details?: unknown; trusted?: boolean },
  ) {
    super(message, 400, { ...options, trusted: options?.trusted ?? true });
  }
}

/** 401 — Missing or invalid authentication. */
export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication failed",
    options?: { details?: unknown; trusted?: boolean },
  ) {
    super(message, 401, { ...options, trusted: options?.trusted ?? true });
  }
}

/** 404 — Requested resource not found. */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    options?: { details?: unknown; trusted?: boolean },
  ) {
    super(`${resource} not found`, 404, {
      ...options,
      trusted: options?.trusted ?? true,
    });
  }
}

/** 500 — Unexpected database failure. */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    options?: { details?: unknown; trusted?: boolean },
  ) {
    super(message, 500, { ...options, trusted: options?.trusted ?? false });
  }
}

/** 502 — External service (LLM, OAuth provider) failure. */
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    options?: { details?: unknown; trusted?: boolean },
  ) {
    super(message, 502, { ...options, trusted: options?.trusted ?? false });
  }
}

/** Type guard to check if an error is an AppError (or subclass). */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
