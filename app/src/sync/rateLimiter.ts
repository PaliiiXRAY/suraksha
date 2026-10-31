/**
 * Author Rate Limiter — SRS §9 + §10.
 *
 * Enforces anti-abuse limits: maximum 10 events per author per hour (sliding window).
 * Receivers enforce this to reject flooding/spam attacks before storing events.
 */

export class RateLimiter {
  private readonly maxEventsPerHour: number;
  private readonly windowMs: number;
  private history = new Map<string, number[]>(); // author -> timestamps ms

  constructor(maxEventsPerHour: number = 10, windowMs: number = 3600 * 1000) {
    this.maxEventsPerHour = maxEventsPerHour;
    this.windowMs = windowMs;
  }

  /**
   * Check if an event by this author is allowed within the rate limit.
   */
  public checkLimit(
    author: string,
    nowMs: number = Date.now()
  ): { allowed: boolean; reason?: string } {
    const cutoff = nowMs - this.windowMs;
    const timestamps = (this.history.get(author) || []).filter((t) => t > cutoff);

    if (timestamps.length >= this.maxEventsPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: author ${author.slice(0, 8)} sent ${timestamps.length} events in the last hour (max ${this.maxEventsPerHour})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record an accepted event from an author.
   */
  public record(author: string, nowMs: number = Date.now()): void {
    const cutoff = nowMs - this.windowMs;
    const timestamps = (this.history.get(author) || []).filter((t) => t > cutoff);
    timestamps.push(nowMs);
    this.history.set(author, timestamps);
  }

  /**
   * Get active event count for an author in the current window.
   */
  public getCount(author: string, nowMs: number = Date.now()): number {
    const cutoff = nowMs - this.windowMs;
    const timestamps = (this.history.get(author) || []).filter((t) => t > cutoff);
    return timestamps.length;
  }

  /**
   * Reset rate limiter state (useful for tests).
   */
  public reset(): void {
    this.history.clear();
  }
}

export const defaultRateLimiter = new RateLimiter(10, 3600 * 1000);

