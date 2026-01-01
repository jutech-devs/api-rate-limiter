import { RateLimiterStrategy, RateLimiterConfig, RateLimiterState } from '../core/types';

export class FixedWindowStrategy implements RateLimiterStrategy {
  private requestCount = 0;
  private windowStart: number;
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.windowStart = Date.now();
  }

  canMakeRequest(): boolean {
    this.checkWindowReset();
    return this.requestCount < this.config.maxRequests;
  }

  consumeRequest(): void {
    this.checkWindowReset();
    this.requestCount++;
  }

  getState(): RateLimiterState {
    this.checkWindowReset();
    const remaining = Math.max(0, this.config.maxRequests - this.requestCount);
    const isLimited = remaining === 0;
    
    return {
      remaining,
      resetTime: this.windowStart + this.config.windowMs,
      isLimited,
      retryAfter: isLimited ? this.getWaitTime() : 0,
      totalRequests: this.requestCount,
    };
  }

  reset(): void {
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  getWaitTime(): number {
    const now = Date.now();
    const windowEnd = this.windowStart + this.config.windowMs;
    return Math.max(0, windowEnd - now);
  }

  private checkWindowReset(): void {
    const now = Date.now();
    if (now >= this.windowStart + this.config.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }
  }
}