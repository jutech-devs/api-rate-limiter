# Troubleshooting Guide

Common issues and solutions when using `@jutech-devs/api-rate-limiter`.

## Installation Issues

### Problem: Module not found
```
Error: Cannot resolve module '@jutech-devs/api-rate-limiter'
```

**Solutions:**
1. Verify installation:
   ```bash
   npm list @jutech-devs/api-rate-limiter
   ```

2. Reinstall the package:
   ```bash
   npm uninstall @jutech-devs/api-rate-limiter
   npm install @jutech-devs/api-rate-limiter
   ```

3. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

### Problem: TypeScript errors
```
TS2307: Cannot find module '@jutech-devs/api-rate-limiter'
```

**Solutions:**
1. Check TypeScript configuration:
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "esModuleInterop": true
     }
   }
   ```

2. Restart TypeScript server in your IDE

## React Hook Issues

### Problem: Hook rules violation
```
Error: Invalid hook call. Hooks can only be called inside function components.
```

**Solution:**
Ensure hooks are used inside React components:
```tsx
// ❌ Wrong - outside component
const limiter = useRateLimiter({ maxRequests: 10, windowMs: 60000 });

function MyComponent() {
  return <div>Component</div>;
}

// ✅ Correct - inside component
function MyComponent() {
  const limiter = useRateLimiter({ maxRequests: 10, windowMs: 60000 });
  return <div>Component</div>;
}
```

### Problem: State not updating
```
// State remains stale after requests
const { state } = useRateLimiter(config);
console.log(state.remaining); // Always shows initial value
```

**Solutions:**
1. Ensure you're calling `makeRequest`:
   ```tsx
   // ❌ Wrong - bypassing rate limiter
   const response = await fetch('/api/data');
   
   // ✅ Correct - using rate limiter
   const response = await makeRequest(() => fetch('/api/data'));
   ```

2. Check if component is re-rendering:
   ```tsx
   const { state, makeRequest } = useRateLimiter(config);
   
   useEffect(() => {
     console.log('State updated:', state);
   }, [state]);
   ```

### Problem: Memory leaks with intervals
```
Warning: Can't perform a React state update on an unmounted component
```

**Solution:**
The hook automatically cleans up intervals, but if you see this warning:
```tsx
function MyComponent() {
  const { state } = useRateLimiter(config);
  
  // Ensure component is properly unmounted
  useEffect(() => {
    return () => {
      // Cleanup is automatic, but you can add custom cleanup here
    };
  }, []);
}
```

## Rate Limiting Logic Issues

### Problem: Requests not being rate limited
```
// Making 1000 requests but none are blocked
for (let i = 0; i < 1000; i++) {
  await makeRequest(() => fetch('/api/data'));
}
```

**Solutions:**
1. Check configuration:
   ```tsx
   const { makeRequest } = useRateLimiter({
     maxRequests: 10,    // ✅ Set appropriate limit
     windowMs: 60000,    // ✅ Set appropriate window
     strategy: 'sliding-window' // ✅ Choose strategy
   });
   ```

2. Verify error handling:
   ```tsx
   try {
     await makeRequest(() => fetch('/api/data'));
   } catch (error) {
     if (error instanceof RateLimitError) {
       console.log('Rate limited!', error.retryAfter);
     }
   }
   ```

### Problem: Rate limiting too aggressive
```
// Getting rate limited immediately
const { makeRequest } = useRateLimiter({
  maxRequests: 1,
  windowMs: 1000
});

await makeRequest(() => fetch('/api/1')); // Works
await makeRequest(() => fetch('/api/2')); // Rate limited immediately
```

**Solutions:**
1. Increase limits:
   ```tsx
   const { makeRequest } = useRateLimiter({
     maxRequests: 10,     // Increase limit
     windowMs: 60000,     // Increase window
     strategy: 'token-bucket' // Allow bursts
   });
   ```

2. Use token bucket for burst allowance:
   ```tsx
   const { makeRequest } = useRateLimiter({
     maxRequests: 10,
     windowMs: 60000,
     strategy: 'token-bucket' // Allows initial burst
   });
   ```

### Problem: Inconsistent rate limiting
```
// Sometimes allows more requests than expected
```

**Solutions:**
1. Use sliding window for accuracy:
   ```tsx
   const { makeRequest } = useRateLimiter({
     maxRequests: 10,
     windowMs: 60000,
     strategy: 'sliding-window' // Most accurate
   });
   ```

2. Avoid fixed window for strict limits:
   ```tsx
   // ❌ Can allow 2x requests at boundaries
   strategy: 'fixed-window'
   
   // ✅ Prevents boundary issues
   strategy: 'sliding-window'
   ```

## Performance Issues

### Problem: High memory usage
```
// Memory keeps growing with sliding window
```

**Solutions:**
1. Use fixed window for high-volume:
   ```tsx
   const { makeRequest } = useRateLimiter({
     maxRequests: 1000,
     windowMs: 60000,
     strategy: 'fixed-window' // O(1) memory
   });
   ```

2. Reduce window size:
   ```tsx
   const { makeRequest } = useRateLimiter({
     maxRequests: 100,
     windowMs: 10000, // Shorter window = less memory
     strategy: 'sliding-window'
   });
   ```

### Problem: Slow performance
```
// Requests taking too long to process
```

**Solutions:**
1. Use token bucket or fixed window:
   ```tsx
   const { makeRequest } = useRateLimiter({
     maxRequests: 100,
     windowMs: 60000,
     strategy: 'token-bucket' // O(1) operations
   });
   ```

2. Optimize request function:
   ```tsx
   // ❌ Slow - complex logic in request
   await makeRequest(async () => {
     const data = await heavyComputation();
     return fetch('/api/data', { body: data });
   });
   
   // ✅ Fast - minimal logic in request
   const data = await heavyComputation();
   await makeRequest(() => fetch('/api/data', { body: data }));
   ```

## Configuration Issues

### Problem: Wrong strategy for use case
```
// Using sliding window for high-volume API
const limiter = useRateLimiter({
  maxRequests: 10000,
  windowMs: 60000,
  strategy: 'sliding-window' // Too memory intensive
});
```

**Solution:**
Choose appropriate strategy:
```tsx
// High volume - use fixed window
const highVolume = useRateLimiter({
  maxRequests: 10000,
  windowMs: 60000,
  strategy: 'fixed-window'
});

// User actions - use sliding window
const userActions = useRateLimiter({
  maxRequests: 10,
  windowMs: 60000,
  strategy: 'sliding-window'
});

// Burst traffic - use token bucket
const burstTraffic = useRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'token-bucket'
});
```

### Problem: Callbacks not firing
```
const { makeRequest } = useRateLimiter(config, {
  onRateLimit: (retryAfter) => {
    console.log('Rate limited!'); // Never called
  }
});
```

**Solutions:**
1. Ensure callbacks are in second parameter:
   ```tsx
   // ❌ Wrong - callbacks in config
   const { makeRequest } = useRateLimiter({
     maxRequests: 10,
     windowMs: 60000,
     onRateLimit: () => console.log('Limited') // Wrong place
   });
   
   // ✅ Correct - callbacks in second parameter
   const { makeRequest } = useRateLimiter(
     { maxRequests: 10, windowMs: 60000 },
     { onRateLimit: () => console.log('Limited') }
   );
   ```

2. Check if rate limiting is actually happening:
   ```tsx
   const { makeRequest } = useRateLimiter(config, {
     onRateLimit: (retryAfter) => {
       console.log('Rate limited!', retryAfter);
     },
     onRequest: (remaining) => {
       console.log('Request made, remaining:', remaining);
     }
   });
   ```

## Advanced Issues

### Problem: Multiple instances interfering
```
// Two components with separate rate limiters affecting each other
```

**Solution:**
Use different keys or multi-limiter:
```tsx
// ❌ Problem - shared state
function ComponentA() {
  const limiter = useRateLimiter(config);
}

function ComponentB() {
  const limiter = useRateLimiter(config); // Same instance
}

// ✅ Solution - separate instances or multi-limiter
function App() {
  const { makeRequest } = useMultiRateLimiter({
    componentA: { maxRequests: 10, windowMs: 60000 },
    componentB: { maxRequests: 5, windowMs: 30000 }
  });
  
  return (
    <>
      <ComponentA makeRequest={(fn) => makeRequest('componentA', fn)} />
      <ComponentB makeRequest={(fn) => makeRequest('componentB', fn)} />
    </>
  );
}
```

### Problem: Server-side rendering issues
```
// Hydration mismatch with SSR
```

**Solution:**
Initialize state properly:
```tsx
function MyComponent() {
  const [mounted, setMounted] = useState(false);
  const { state, makeRequest } = useRateLimiter(config);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div>Loading...</div>;
  }
  
  return (
    <button onClick={() => makeRequest(() => fetch('/api'))}>
      Requests: {state.remaining}
    </button>
  );
}
```

## Debugging Tips

### Enable Debug Logging
```tsx
const { makeRequest, state } = useRateLimiter(config, {
  onRequest: (remaining) => {
    console.log(`Request made. Remaining: ${remaining}`);
  },
  onRateLimit: (retryAfter) => {
    console.log(`Rate limited. Retry after: ${retryAfter}ms`);
  },
  onReset: () => {
    console.log('Rate limiter reset');
  }
});

// Log state changes
useEffect(() => {
  console.log('State updated:', state);
}, [state]);
```

### Check Rate Limiter State
```tsx
const { state, getWaitTime, canMakeRequest } = useRateLimiter(config);

console.log({
  remaining: state.remaining,
  isLimited: state.isLimited,
  resetTime: new Date(state.resetTime),
  waitTime: getWaitTime(),
  canMake: canMakeRequest()
});
```

### Test Rate Limiting
```tsx
// Test component for debugging
function RateLimiterTest() {
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 3,
    windowMs: 10000
  });
  
  const testRequest = async () => {
    try {
      await makeRequest(() => Promise.resolve('success'));
      console.log('Request successful');
    } catch (error) {
      console.log('Request failed:', error.message);
    }
  };
  
  return (
    <div>
      <button onClick={testRequest}>Test Request</button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}
```

## Getting Help

If you're still experiencing issues:

1. **Check the examples** in [EXAMPLES.md](./EXAMPLES.md)
2. **Review the API reference** in [API_REFERENCE.md](./API_REFERENCE.md)
3. **Create a minimal reproduction** of your issue
4. **Open an issue** on GitHub with:
   - Your configuration
   - Expected behavior
   - Actual behavior
   - Minimal code example