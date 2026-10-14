export interface OperationalMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timedOutRequests: number;
  toolInvocations: Record<string, number>;
  averageLatencyMs: number;
  recentLatencies: number[];
}

export class MetricsCollector {
  private total = 0;
  private success = 0;
  private failures = 0;
  private timeouts = 0;
  private readonly toolCalls = new Map<string, number>();
  private readonly latencies: number[] = [];

  public recordRequest(durationMs: number, status: "success" | "failure" | "timeout"): void {
    this.total++;
    if (status === "success") this.success++;
    else if (status === "timeout") {
      this.timeouts++;
      this.failures++;
    } else {
      this.failures++;
    }

    this.latencies.push(durationMs);
    if (this.latencies.length > 500) {
      this.latencies.shift();
    }
  }

  public recordToolCall(toolName: string): void {
    const current = this.toolCalls.get(toolName) ?? 0;
    this.toolCalls.set(toolName, current + 1);
  }

  public getSnapshot(): OperationalMetrics {
    const totalLatency = this.latencies.reduce((a, b) => a + b, 0);
    const averageLatencyMs = this.latencies.length > 0 ? Math.round(totalLatency / this.latencies.length) : 0;

    const toolObj: Record<string, number> = {};
    for (const [k, v] of this.toolCalls.entries()) {
      toolObj[k] = v;
    }

    return {
      totalRequests: this.total,
      successfulRequests: this.success,
      failedRequests: this.failures,
      timedOutRequests: this.timeouts,
      toolInvocations: toolObj,
      averageLatencyMs,
      recentLatencies: this.latencies.slice(-10),
    };
  }

  public reset(): void {
    this.total = 0;
    this.success = 0;
    this.failures = 0;
    this.timeouts = 0;
    this.toolCalls.clear();
    this.latencies.length = 0;
  }
}

export const metrics = new MetricsCollector();
