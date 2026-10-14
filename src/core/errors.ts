export type ErrorCode =
  | "INVALID_INPUT"
  | "AUTHENTICATION_FAILURE"
  | "PERMISSION_DENIED"
  | "MISSING_RESOURCE"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "RATE_LIMITED"
  | "TOOL_FAILURE"
  | "RETRIEVAL_FAILURE"
  | "DATABASE_FAILURE"
  | "CONFIRMATION_REQUIRED"
  | "REQUEST_CANCELLED"
  | "INTERNAL_FAILURE";

export abstract class AssistantError extends Error {
  public abstract readonly code: ErrorCode;
  public readonly isRetryable: boolean = false;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class InvalidInputError extends AssistantError {
  public readonly code = "INVALID_INPUT";
}

export class AuthenticationError extends AssistantError {
  public readonly code = "AUTHENTICATION_FAILURE";
}

export class PermissionDeniedError extends AssistantError {
  public readonly code = "PERMISSION_DENIED";
}

export class NotFoundError extends AssistantError {
  public readonly code = "MISSING_RESOURCE";
}

export class ProviderUnavailableError extends AssistantError {
  public readonly code = "PROVIDER_UNAVAILABLE";
  public override readonly isRetryable = true;
}

export class ProviderTimeoutError extends AssistantError {
  public readonly code = "PROVIDER_TIMEOUT";
  public override readonly isRetryable = true;
}

export class RateLimitError extends AssistantError {
  public readonly code = "RATE_LIMITED";
}

export class ToolExecutionError extends AssistantError {
  public readonly code = "TOOL_FAILURE";
}

export class RetrievalError extends AssistantError {
  public readonly code = "RETRIEVAL_FAILURE";
}

export class DatabaseError extends AssistantError {
  public readonly code = "DATABASE_FAILURE";
}

export class ConfirmationRequiredError extends AssistantError {
  public readonly code = "CONFIRMATION_REQUIRED";
}

export class RequestCancelledError extends AssistantError {
  public readonly code = "REQUEST_CANCELLED";
}

export class InternalError extends AssistantError {
  public readonly code = "INTERNAL_FAILURE";
}

export function toAssistantError(err: unknown): AssistantError {
  if (err instanceof AssistantError) {
    return err;
  }

  if (err instanceof Error) {
    if (err.name === "AbortError" || err.message.includes("abort")) {
      return new RequestCancelledError(err.message);
    }
    return new InternalError(err.message, { originalName: err.name });
  }

  return new InternalError(String(err));
}
