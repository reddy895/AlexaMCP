import type { Request, Response, NextFunction } from "express";
import { getConfig } from "../config/env.js";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();
  private activeConcurrency = 0;
  private readonly maxRps: number;
  private readonly maxConcurrency: number;

  constructor(maxRps?: number, maxConcurrency?: number) {
    const config = getConfig();
    this.maxRps = maxRps ?? config.RATE_LIMIT_RPS;
    this.maxConcurrency = maxConcurrency ?? config.MAX_CONCURRENT_REQUESTS;
  }

  public checkRate(clientKey: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(clientKey);

    if (!bucket) {
      bucket = { tokens: this.maxRps, lastRefill: now };
      this.buckets.set(clientKey, bucket);
    } else {
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(this.maxRps, bucket.tokens + elapsedSeconds * this.maxRps);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  public acquireConcurrency(): boolean {
    if (this.activeConcurrency >= this.maxConcurrency) {
      return false;
    }
    this.activeConcurrency++;
    return true;
  }

  public releaseConcurrency(): void {
    if (this.activeConcurrency > 0) {
      this.activeConcurrency--;
    }
  }

  public getActiveConcurrency(): number {
    return this.activeConcurrency;
  }

  public reset(): void {
    this.buckets.clear();
    this.activeConcurrency = 0;
  }
}

export const globalRateLimiter = new RateLimiter();

export function createRateLimitMiddleware(limiter: RateLimiter = globalRateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientKey = req.ip || "127.0.0.1";

    if (!limiter.checkRate(clientKey)) {
      res.status(429).json({
        error: "rate_limited",
        message: "Too many requests. Please throttle your request rate.",
      });
      return;
    }

    if (!limiter.acquireConcurrency()) {
      res.status(429).json({
        error: "concurrency_limited",
        message: "Maximum concurrent requests reached. Please retry momentarily.",
      });
      return;
    }

    res.on("finish", () => limiter.releaseConcurrency());
    res.on("close", () => limiter.releaseConcurrency());

    next();
  };
}
