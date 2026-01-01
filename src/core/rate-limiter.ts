import { RateLimiterConfig, RateLimiterState, RateLimiterStrategy, RateLimiterCallbacks } from './types';
import { SlidingWindowStrategy } from '../strategies/sliding-window';
import { FixedWindowStrategy } from '../strategies/fixed-window';
import { TokenBucketStrategy } from '../strategies/token-bucket';

export class RateLimiter {
  private strategy: RateLimiterStrategy;
  private callbacks: RateLimiterCallbacks;
  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}, callbacks: RateLimiterCallbacks = {}) {
    this.config = {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      strategy: 'sliding-window',
      retryAfter: 1000,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    this.callbacks = callbacks;
    this.strategy = this.createStrategy();
  }

  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    if (!this.canMakeRequest()) {
      const waitTime = this.getWaitTime();
      this.callbacks.onRateLimit?.(waitTime);
      throw new RateLimitError(`Rate limit exceeded. Retry after ${waitTime}ms`, waitTime);
    }

    this.consumeRequest();
    
    try {
      const result = await requestFn();
      
      if (this.config.skipSuccessfulRequests) {
        // Refund the request if configured to skip successful requests
        this.refundRequest();
      }
      
      return result;
    } catch (error) {
      if (this.config.skipFailedRequests) {
        // Refund the request if configured to skip failed requests
        this.refundRequest();
      }
      throw error;
    }
  }

  canMakeRequest(): boolean {
    return this.strategy.canMakeRequest();
  }

  consumeRequest(): void {
    this.strategy.consumeRequest();
    const state = this.getState();
    this.callbacks.onRequest?.(state.remaining);
  }

  getState(): RateLimiterState {
    return this.strategy.getState();
  }

  reset(): void {
    this.strategy.reset();
    this.callbacks.onReset?.();
  }

  getWaitTime(): number {
    return this.strategy.getWaitTime();
  }

  updateConfig(newConfig: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.strategy = this.createStrategy();
  }

  private createStrategy(): RateLimiterStrategy {
    switch (this.config.strategy) {
      case 'fixed-window':
        return new FixedWindowStrategy(this.config);
      case 'token-bucket':
        return new TokenBucketStrategy(this.config);
      case 'sliding-window':
      default:
        return new SlidingWindowStrategy(this.config);
    }
  }

  private refundRequest(): void {
    // This is a simplified refund - in practice, you might need more sophisticated logic
    // For now, we'll just reset and re-add the previous state
    // This is strategy-dependent and might need different implementations
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}