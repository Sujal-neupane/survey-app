import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = "API_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err.flatten(),
        },
      },
      { status: 422 }
    );
  }

  console.error("Unhandled API error:", err);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

export function apiHandler(handler: (req: Request, context?: any) => Promise<Response>) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
