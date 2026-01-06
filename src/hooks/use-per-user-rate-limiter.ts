import { useState, useRef, useCallback, useEffect } from 'react';
import { PerUserRateLimiter, PerUserRateLimiterConfig } from '../core/per-user-rate-limiter';
import { RateLimiterState, RateLimiterCallbacks } from '../core/types';

export interface UsePerUserRateLimiterReturn {
  makeRequest: <T>(userId: string, requestFn: () => Promise<T>) => Promise<T>;
  canMakeRequest: (userId: string) => boolean;
  getState: (userId: string) => RateLimiterState;
  getAllStates: () => Record<string, RateLimiterState>;
  reset: (userId?: string) => void;
  activeUserCount: number;
}

export function usePerUserRateLimiter(
  config: PerUserRateLimiterConfig = {},
  callbacks: RateLimiterCallbacks = {}
): UsePerUserRateLimiterReturn {
  const rateLimiterRef = useRef<PerUserRateLimiter>();
  const [activeUserCount, setActiveUserCount] = useState(0);

  // Initialize per-user rate limiter
  if (!rateLimiterRef.current) {
    rateLimiterRef.current = new PerUserRateLimiter(config, callbacks);
  }

  const makeRequest = useCallback(async <T>(
    userId: string, 
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const result = await rateLimiterRef.current!.makeRequest(userId, requestFn);
    setActiveUserCount(rateLimiterRef.current!.getActiveUserCount());
    return result;
  }, []);

  const canMakeRequest = useCallback((userId: string): boolean => {
    return rateLimiterRef.current!.canMakeRequest(userId);
  }, []);

  const getState = useCallback((userId: string): RateLimiterState => {
    return rateLimiterRef.current!.getState(userId);
  }, []);

  const getAllStates = useCallback((): Record<string, RateLimiterState> => {
    return rateLimiterRef.current!.getAllStates();
  }, []);

  const reset = useCallback((userId?: string): void => {
    rateLimiterRef.current!.reset(userId);
    setActiveUserCount(rateLimiterRef.current!.getActiveUserCount());
  }, []);

  // Update active user count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (rateLimiterRef.current) {
        setActiveUserCount(rateLimiterRef.current.getActiveUserCount());
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rateLimiterRef.current) {
        rateLimiterRef.current.destroy();
      }
    };
  }, []);

  return {
    makeRequest,
    canMakeRequest,
    getState,
    getAllStates,
    reset,
    activeUserCount,
  };
}