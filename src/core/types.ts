export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  strategy: 'sliding-window' | 'fixed-window' | 'token-bucket';
  retryAfter?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimiterState {
  remaining: number;
  resetTime: number;
  isLimited: boolean;
  retryAfter: number;
  totalRequests: number;
}

export interface RateLimiterStrategy {
  canMakeRequest(): boolean;
  consumeRequest(): void;
  getState(): RateLimiterState;
  reset(): void;
  getWaitTime(): number;
}

export interface RateLimiterCallbacks {
  onRateLimit?: (retryAfter: number) => void;
  onReset?: () => void;
  onRequest?: (remaining: number) => void;
}