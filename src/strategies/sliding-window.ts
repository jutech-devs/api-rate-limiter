import { RateLimiterStrategy, RateLimiterConfig, RateLimiterState } from '../core/types';

export class SlidingWindowStrategy implements RateLimiterStrategy {
  private requestTimestamps: number[] = [];
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  canMakeRequest(): boolean {
    this.cleanupOldRequests();
    return this.requestTimestamps.length < this.config.maxRequests;
  }

  consumeRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  getState(): RateLimiterState {
    this.cleanupOldRequests();
    const remaining = Math.max(0, this.config.maxRequests - this.requestTimestamps.length);
    const isLimited = remaining === 0;
    
    return {
      remaining,
      resetTime: this.getNextResetTime(),
      isLimited,
      retryAfter: isLimited ? this.getWaitTime() : 0,
      totalRequests: this.requestTimestamps.length,
    };
  }

  reset(): void {
    this.requestTimestamps = [];
  }

  getWaitTime(): number {
    if (this.requestTimestamps.length === 0) return 0;
    const oldestRequest = this.requestTimestamps[0];
    return Math.max(0, this.config.windowMs - (Date.now() - oldestRequest));
  }

  private cleanupOldRequests(): void {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.config.windowMs
    );
  }

  private getNextResetTime(): number {
    if (this.requestTimestamps.length === 0) return Date.now() + this.config.windowMs;
    return this.requestTimestamps[0] + this.config.windowMs;
  }
}