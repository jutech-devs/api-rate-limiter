import { RateLimiter, RateLimitError } from './rate-limiter';
import { RateLimiterConfig, RateLimiterState, RateLimiterCallbacks } from './types';

export interface PerUserRateLimiterConfig extends Partial<RateLimiterConfig> {
  cleanupInterval?: number; // How often to cleanup inactive users (ms)
  maxInactiveTime?: number; // How long to keep inactive users (ms)
}

export class PerUserRateLimiter {
  private limiters = new Map<string, { limiter: RateLimiter; lastUsed: number }>();
  private config: PerUserRateLimiterConfig;
  private callbacks: RateLimiterCallbacks;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: PerUserRateLimiterConfig = {}, callbacks: RateLimiterCallbacks = {}) {
    this.config = {
      maxRequests: 100,
      windowMs: 60000,
      strategy: 'sliding-window',
      cleanupInterval: 60000, // 1 minute
      maxInactiveTime: 3600000, // 1 hour
      ...config,
    };
    this.callbacks = callbacks;
    
    // Start cleanup timer
    if (this.config.cleanupInterval && this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupInterval);
    }
  }

  getLimiter(userId: string): RateLimiter {
    const now = Date.now();
    
    if (!this.limiters.has(userId)) {
      this.limiters.set(userId, {
        limiter: new RateLimiter(this.config, this.callbacks),
        lastUsed: now
      });
    }
    
    // Update last used time
    const entry = this.limiters.get(userId)!;
    entry.lastUsed = now;
    
    return entry.limiter;
  }

  async makeRequest<T>(userId: string, requestFn: () => Promise<T>): Promise<T> {
    const limiter = this.getLimiter(userId);
    return limiter.makeRequest(requestFn);
  }

  canMakeRequest(userId: string): boolean {
    const limiter = this.getLimiter(userId);
    return limiter.canMakeRequest();
  }

  getState(userId: string): RateLimiterState {
    const limiter = this.getLimiter(userId);
    return limiter.getState();
  }

  getAllStates(): Record<string, RateLimiterState> {
    const states: Record<string, RateLimiterState> = {};
    for (const [userId, { limiter }] of this.limiters) {
      states[userId] = limiter.getState();
    }
    return states;
  }

  reset(userId?: string): void {
    if (userId) {
      const entry = this.limiters.get(userId);
      if (entry) {
        entry.limiter.reset();
      }
    } else {
      // Reset all users
      for (const { limiter } of this.limiters.values()) {
        limiter.reset();
      }
    }
  }

  getActiveUserCount(): number {
    return this.limiters.size;
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = this.config.maxInactiveTime || 3600000;
    
    for (const [userId, { lastUsed }] of this.limiters) {
      if (now - lastUsed > maxAge) {
        this.limiters.delete(userId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.limiters.clear();
  }
}

export { RateLimitError };