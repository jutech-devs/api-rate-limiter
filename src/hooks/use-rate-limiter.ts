import { useState, useRef, useCallback, useEffect } from 'react';
import { RateLimiter, RateLimitError } from '../core/rate-limiter';
import { RateLimiterConfig, RateLimiterState, RateLimiterCallbacks } from '../core/types';

export interface UseRateLimiterReturn {
  state: RateLimiterState;
  canMakeRequest: () => boolean;
  makeRequest: <T>(requestFn: () => Promise<T>) => Promise<T>;
  reset: () => void;
  getWaitTime: () => number;
  updateConfig: (config: Partial<RateLimiterConfig>) => void;
}

export function useRateLimiter(
  config: Partial<RateLimiterConfig> = {},
  callbacks: RateLimiterCallbacks = {}
): UseRateLimiterReturn {
  const rateLimiterRef = useRef<RateLimiter>();
  const [state, setState] = useState<RateLimiterState>({
    remaining: config.maxRequests || 100,
    resetTime: Date.now() + (config.windowMs || 60000),
    isLimited: false,
    retryAfter: 0,
    totalRequests: 0,
  });

  // Initialize rate limiter
  if (!rateLimiterRef.current) {
    rateLimiterRef.current = new RateLimiter(config, {
      ...callbacks,
      onRequest: (remaining) => {
        setState(rateLimiterRef.current!.getState());
        callbacks.onRequest?.(remaining);
      },
      onRateLimit: (retryAfter) => {
        setState(rateLimiterRef.current!.getState());
        callbacks.onRateLimit?.(retryAfter);
      },
      onReset: () => {
        setState(rateLimiterRef.current!.getState());
        callbacks.onReset?.();
      },
    });
  }

  const canMakeRequest = useCallback(() => {
    return rateLimiterRef.current!.canMakeRequest();
  }, []);

  const makeRequest = useCallback(async <T>(requestFn: () => Promise<T>): Promise<T> => {
    try {
      const result = await rateLimiterRef.current!.makeRequest(requestFn);
      setState(rateLimiterRef.current!.getState());
      return result;
    } catch (error) {
      setState(rateLimiterRef.current!.getState());
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    rateLimiterRef.current!.reset();
    setState(rateLimiterRef.current!.getState());
  }, []);

  const getWaitTime = useCallback(() => {
    return rateLimiterRef.current!.getWaitTime();
  }, []);

  const updateConfig = useCallback((newConfig: Partial<RateLimiterConfig>) => {
    rateLimiterRef.current!.updateConfig(newConfig);
    setState(rateLimiterRef.current!.getState());
  }, []);

  // Update state periodically for token bucket strategy
  useEffect(() => {
    const interval = setInterval(() => {
      if (rateLimiterRef.current) {
        setState(rateLimiterRef.current.getState());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    state,
    canMakeRequest,
    makeRequest,
    reset,
    getWaitTime,
    updateConfig,
  };
}