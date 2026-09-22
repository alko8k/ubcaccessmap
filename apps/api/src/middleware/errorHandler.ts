import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors.js";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    response.status(error.status).json({
      error: error.message,
      details: error.details ?? null,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Invalid request.",
      details: error.flatten(),
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: "Something went wrong. Try again shortly.",
  });
}
