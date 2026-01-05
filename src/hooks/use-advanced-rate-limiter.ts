import { useCallback, useRef, useEffect, useState } from 'react';
import { useRateLimiter, UseRateLimiterReturn } from './use-rate-limiter';
import { RateLimiterConfig, RateLimiterState } from '../core/types';
import { RateLimiter } from '../core/rate-limiter';

// Hook for API requests with automatic retry
export function useRateLimitedAPI(config: Partial<RateLimiterConfig> = {}) {
  const { makeRequest, state, canMakeRequest } = useRateLimiter(config);
  const retryTimeoutsRef = useRef<Map<string, number>>(new Map());

  const makeAPIRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      exponentialBackoff?: boolean;
      requestId?: string;
    } = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      requestId = Math.random().toString(36),
    } = options;

    let attempt = 0;

    const attemptRequest = async (): Promise<T> => {
      try {
        return await makeRequest(requestFn);
      } catch (error) {
        if (error instanceof Error && error.name === 'RateLimitError' && attempt < maxRetries) {
          attempt++;
          const delay = exponentialBackoff 
            ? retryDelay * Math.pow(2, attempt - 1)
            : retryDelay;

          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(async () => {
              retryTimeoutsRef.current.delete(requestId);
              try {
                const result = await attemptRequest();
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, delay);

            retryTimeoutsRef.current.set(requestId, timeoutId);
          });
        }
        throw error;
      }
    };

    return attemptRequest();
  }, [makeRequest]);

  const cancelRequest = useCallback((requestId: string) => {
    const timeoutId = retryTimeoutsRef.current.get(requestId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      retryTimeoutsRef.current.delete(requestId);
    }
  }, []);

  const cancelAllRequests = useCallback(() => {
    retryTimeoutsRef.current.forEach((timeoutId: number) => clearTimeout(timeoutId));
    retryTimeoutsRef.current.clear();
  }, []);

  return {
    makeAPIRequest,
    cancelRequest,
    cancelAllRequests,
    state,
    canMakeRequest,
  };
}

// Hook for batch requests with rate limiting
export function useBatchRateLimiter(config: Partial<RateLimiterConfig> = {}) {
  const { makeRequest, state } = useRateLimiter(config);
  const queueRef = useRef<Array<() => Promise<any>>>([]);
  const processingRef = useRef(false);

  const addToQueue = useCallback(<T>(requestFn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queueRef.current.push(async () => {
        try {
          const result = await makeRequest(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Don't await processQueue to avoid blocking
      processQueue().catch(console.error);
    });
  }, [makeRequest]);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;

    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const request = queueRef.current.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          // Individual request errors are handled by the promise
        }
        
        // Wait a bit before processing next request
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    processingRef.current = false;
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
  }, []);

  return {
    addToQueue,
    clearQueue,
    queueLength: queueRef.current.length,
    state,
  };
}

// Hook for multiple rate limiters (different APIs)
export function useMultiRateLimiter(configs: Record<string, Partial<RateLimiterConfig>>) {
  const limitersRef = useRef<Record<string, RateLimiter>>({});
  const [states, setStates] = useState<Record<string, RateLimiterState>>({});

  // Initialize rate limiters for each API
  useEffect(() => {
    const newLimiters: Record<string, RateLimiter> = {};
    const newStates: Record<string, RateLimiterState> = {};
    
    Object.keys(configs).forEach(apiName => {
      if (!limitersRef.current[apiName]) {
        newLimiters[apiName] = new RateLimiter(configs[apiName]);
        newStates[apiName] = newLimiters[apiName].getState();
      } else {
        newLimiters[apiName] = limitersRef.current[apiName];
        newStates[apiName] = limitersRef.current[apiName].getState();
      }
    });
    
    limitersRef.current = newLimiters;
    setStates(newStates);
  }, [configs]);

  const makeRequest = useCallback(async <T>(
    apiName: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const limiter = limitersRef.current[apiName];
    if (!limiter) {
      throw new Error(`Rate limiter for API '${apiName}' not found`);
    }
    
    try {
      const result = await limiter.makeRequest(requestFn);
      setStates(prev => ({
        ...prev,
        [apiName]: limiter.getState()
      }));
      return result;
    } catch (error) {
      setStates(prev => ({
        ...prev,
        [apiName]: limiter.getState()
      }));
      throw error;
    }
  }, []);

  const getState = useCallback((apiName: string) => {
    return states[apiName];
  }, [states]);

  const getAllStates = useCallback(() => {
    return states;
  }, [states]);

  return {
    makeRequest,
    getState,
    getAllStates,
    limiters: limitersRef.current,
  };
}