// Core classes
export { RateLimiter, RateLimitError } from './core/rate-limiter';
export { PerUserRateLimiter } from './core/per-user-rate-limiter';
export type { 
  RateLimiterConfig, 
  RateLimiterState, 
  RateLimiterStrategy, 
  RateLimiterCallbacks 
} from './core/types';
export type { PerUserRateLimiterConfig } from './core/per-user-rate-limiter';

// Strategies
export { SlidingWindowStrategy } from './strategies/sliding-window';
export { FixedWindowStrategy } from './strategies/fixed-window';
export { TokenBucketStrategy } from './strategies/token-bucket';

// React Hooks
export { useRateLimiter } from './hooks/use-rate-limiter';
export { usePerUserRateLimiter } from './hooks/use-per-user-rate-limiter';
export { 
  useRateLimitedAPI, 
  useBatchRateLimiter, 
  useMultiRateLimiter 
} from './hooks/use-advanced-rate-limiter';