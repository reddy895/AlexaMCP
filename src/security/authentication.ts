import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { getConfig } from "../config/env.js";

export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

export function createAuthMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const config = getConfig();

    // Secure local development mode: If no AUTH_TOKEN configured, permit local access
    if (!config.AUTH_TOKEN || config.AUTH_TOKEN.trim().length === 0) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        error: "unauthorized",
        message: "Missing Authorization header. Bearer token is required.",
      });
      return;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({
        error: "unauthorized",
        message: "Invalid Authorization header format. Expected 'Bearer <token>'.",
      });
      return;
    }

    const providedToken = match[1].trim();
    const isValid = constantTimeCompare(providedToken, config.AUTH_TOKEN.trim());

    if (!isValid) {
      res.status(401).json({
        error: "unauthorized",
        message: "Invalid authentication token provided.",
      });
      return;
    }

    next();
  };
}
