import type { Request, Response, NextFunction } from "express";
import { RequestCancelledError } from "./errors.js";

export function bindRequestCancellation(
  req: Request,
  controller: AbortController
): () => void {
  const onAborted = () => {
    if (!controller.signal.aborted) {
      controller.abort(new RequestCancelledError("Client closed connection before completion."));
    }
  };

  req.on("close", onAborted);
  return () => {
    req.removeListener("close", onAborted);
  };
}

export function handleCancellationError(err: unknown, res: Response): boolean {
  if (err instanceof RequestCancelledError || (err instanceof Error && err.name === "AbortError")) {
    if (!res.headersSent) {
      res.status(499).json({
        status: "cancelled",
        message: "The request was cancelled by the client or execution deadline was reached.",
      });
    }
    return true;
  }
  return false;
}
