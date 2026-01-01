import { RateLimiterStrategy, RateLimiterConfig, RateLimiterState } from '../core/types';

export class TokenBucketStrategy implements RateLimiterStrategy {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimiterConfig;
  private refillRate: number;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
    this.refillRate = config.maxRequests / (config.windowMs / 1000);
  }

  canMakeRequest(): boolean {
    this.refillTokens();
    return this.tokens >= 1;
  }

  consumeRequest(): void {
    this.refillTokens();
    if (this.tokens >= 1) {
      this.tokens = Math.max(0, this.tokens - 1);
    }
  }

  getState(): RateLimiterState {
    this.refillTokens();
    const remaining = Math.floor(this.tokens);
    const isLimited = this.tokens < 1;
    
    return {
      remaining,
      resetTime: this.getNextRefillTime(),
      isLimited,
      retryAfter: isLimited ? this.getWaitTime() : 0,
      totalRequests: this.config.maxRequests - remaining,
    };
  }

  reset(): void {
    this.tokens = this.config.maxRequests;
    this.lastRefill = Date.now();
  }

  getWaitTime(): number {
    this.refillTokens();
    if (this.tokens >= 1) return 0;
    return Math.ceil((1 - this.tokens) / this.refillRate * 1000);
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.config.maxRequests, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private getNextRefillTime(): number {
    if (this.tokens >= this.config.maxRequests) {
      return Date.now() + this.config.windowMs;
    }
    return Date.now() + this.getWaitTime();
  }
}