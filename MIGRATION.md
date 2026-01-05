# Migration Guide

Guide for migrating from other rate limiting libraries to `@jutech-devs/api-rate-limiter`.

## From express-rate-limit

### Before (express-rate-limit)
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

### After (Our SDK - Server Side)

⚠️ **Critical:** The example below is GLOBAL rate limiting (all users share the same limit). For production, use per-user limiting:

```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

// ❌ WRONG: Global limiter (for demo only)
const globalLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
  strategy: 'sliding-window'
});

// ✅ CORRECT: Per-user limiting
const limiters = new Map();

function getLimiter(key) {
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiter({
      maxRequests: 100,
      windowMs: 15 * 60 * 1000,
      strategy: 'sliding-window'
    }));
  }
  return limiters.get(key);
}

app.use('/api/', async (req, res, next) => {
  const key = req.ip; // or req.user?.id
  const limiter = getLimiter(key);
  
  try {
    await limiter.makeRequest(() => Promise.resolve());
    next();
  } catch (error) {
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

### After (Our SDK - Client Side)
```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';

function APIComponent() {
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000
  });

  const callAPI = () => makeRequest(() => 
    fetch('/api/data').then(res => res.json())
  );

  return (
    <button onClick={callAPI} disabled={state.isLimited}>
      Call API ({state.remaining} left)
    </button>
  );
}
```

## From bottleneck

⚠️ **Important Conceptual Difference:**
- **Bottleneck** is a scheduler/concurrency limiter with job queueing
- **This SDK** focuses on time-based rate limiting, not strict concurrency control
- For strict concurrency control, combine with a queue library

### Before (bottleneck)
```javascript
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
  maxConcurrent: 1,    // Only 1 request at a time
  minTime: 333         // 333ms between requests (≈3 req/sec)
});

const result = await limiter.schedule(() => fetch('/api/data'));
```

### After (Our SDK - Approximate Equivalent)
```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

// Note: This is time-based limiting, not concurrency limiting
const limiter = new RateLimiter({
  maxRequests: 3,
  windowMs: 1000,
  strategy: 'token-bucket'
});

const result = await limiter.makeRequest(() => fetch('/api/data'));
```

**Migration Note:** If you need strict concurrency control (maxConcurrent), consider keeping bottleneck or using p-limit alongside this SDK.

## From p-limit

⚠️ **Important Conceptual Difference:**
- **p-limit** controls concurrent promises (not time-based)
- **useBatchRateLimiter** provides time-based throttling with queueing

### Before (p-limit)
```javascript
const pLimit = require('p-limit');

const limit = pLimit(1); // Max 1 concurrent promise

const promises = [
  limit(() => fetch('/api/1')),
  limit(() => fetch('/api/2')),
  limit(() => fetch('/api/3'))
];

await Promise.all(promises); // Executes sequentially
```

### After (Our SDK)
```tsx
import { useBatchRateLimiter } from '@jutech-devs/api-rate-limiter';

function BatchComponent() {
  const { addToQueue } = useBatchRateLimiter({
    maxRequests: 1,
    windowMs: 1000 // 1 request per second
  });

  const processBatch = async () => {
    const promises = [
      addToQueue(() => fetch('/api/1')),
      addToQueue(() => fetch('/api/2')),
      addToQueue(() => fetch('/api/3'))
    ];

    await Promise.all(promises); // Executes with time-based throttling
  };

  return <button onClick={processBatch}>Process Batch</button>;
}
```

**Migration Note:** If you need strict concurrency limiting without time constraints, consider keeping p-limit.

## From axios-rate-limit

### Before (axios-rate-limit)
```javascript
const rateLimit = require('axios-rate-limit');
const axios = require('axios');

const http = rateLimit(axios.create(), { 
  maxRequests: 2, 
  perMilliseconds: 1000 
});

const response = await http.get('/api/data');
```

### After (Our SDK)
```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 2,
  windowMs: 1000
});

const response = await limiter.makeRequest(() => 
  fetch('/api/data').then(res => res.json())
);
```

## From React Query with Custom Rate Limiting

### Before (Custom Implementation)
```tsx
import { useQuery } from 'react-query';

const rateLimitCache = new Map();

function useRateLimitedQuery(key, fn, options = {}) {
  const now = Date.now();
  const lastCall = rateLimitCache.get(key) || 0;
  const canCall = now - lastCall > 1000; // 1 second

  return useQuery(
    key,
    async () => {
      if (!canCall) {
        throw new Error('Rate limited');
      }
      rateLimitCache.set(key, now);
      return fn();
    },
    options
  );
}
```

### After (Our SDK)
```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';
import { useQuery } from 'react-query';

// ⚠️ Note: useRateLimiter must be called inside a React component or hook
function useRateLimitedQuery(key, fn, options = {}) {
  const { makeRequest, canMakeRequest } = useRateLimiter({
    maxRequests: 1,
    windowMs: 1000
  });

  return useQuery(
    key,
    () => makeRequest(fn),
    {
      ...options,
      enabled: canMakeRequest() && options.enabled !== false
    }
  );
}
```

## Migration Checklist

### 1. Install the Package
```bash
npm uninstall express-rate-limit bottleneck p-limit axios-rate-limit
npm install @jutech-devs/api-rate-limiter
```

### 2. Update Imports
```javascript
// Old
const rateLimit = require('express-rate-limit');
const Bottleneck = require('bottleneck');

// New
import { RateLimiter, useRateLimiter } from '@jutech-devs/api-rate-limiter';
```

### 3. Convert Configuration

| Old Library | Old Config | New Config |
|-------------|------------|------------|
| express-rate-limit | `max: 100, windowMs: 60000` | `maxRequests: 100, windowMs: 60000` |
| bottleneck | `maxConcurrent: 1, minTime: 1000` | `maxRequests: 1, windowMs: 1000` |
| p-limit | `limit(5)` | `maxRequests: 5, windowMs: 1000` |

### 4. Update Error Handling
```javascript
// Old (various patterns)
try {
  await limiter.schedule(() => fetch('/api'));
} catch (error) {
  if (error.message.includes('rate')) {
    // Handle rate limit
  }
}

// New (consistent)
try {
  await limiter.makeRequest(() => fetch('/api'));
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry after: ${error.retryAfter}ms`);
  }
}
```

### 5. Add React Integration (if applicable)
```tsx
// Old (manual state management)
const [rateLimited, setRateLimited] = useState(false);
const [remaining, setRemaining] = useState(100);

// New (built-in state)
const { state, makeRequest } = useRateLimiter({
  maxRequests: 100,
  windowMs: 60000
});
// state.isLimited, state.remaining available automatically
```

## Common Migration Patterns

### Pattern 1: Server Middleware
```javascript
// Old (per-IP limiting)
app.use(rateLimit({ max: 100, windowMs: 60000 }));

// New (⚠️ WRONG - global limiting)
const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
app.use(async (req, res, next) => {
  try {
    await limiter.makeRequest(() => Promise.resolve());
    next();
  } catch (error) {
    res.status(429).json({ error: 'Rate limited' });
  }
});

// ✅ CORRECT - per-IP limiting
const limiters = new Map();
function getLimiter(key) {
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiter({ maxRequests: 100, windowMs: 60000 }));
  }
  return limiters.get(key);
}

app.use(async (req, res, next) => {
  const limiter = getLimiter(req.ip);
  try {
    await limiter.makeRequest(() => Promise.resolve());
    next();
  } catch (error) {
    res.status(429).json({ error: 'Rate limited' });
  }
});
```

### Pattern 2: API Client
```javascript
// Old
const client = rateLimit(axios.create(), { maxRequests: 10, perMilliseconds: 1000 });

// New
class APIClient {
  constructor() {
    this.limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });
  }
  
  async request(config) {
    return this.limiter.makeRequest(() => axios(config));
  }
}
```

### Pattern 3: Background Jobs
```javascript
// Old
const limiter = new Bottleneck({ maxConcurrent: 5, minTime: 200 });

// New
const limiter = new RateLimiter({ 
  maxRequests: 5, 
  windowMs: 1000,
  strategy: 'token-bucket'
});
```

## Benefits After Migration

### ✅ Unified API
- Single library for client and server
- Consistent error handling
- Same configuration format

### ✅ Better React Integration
- Built-in hooks
- Automatic state management
- Real-time updates

### ✅ More Strategies
- Choose the best algorithm for your use case
- Switch strategies without code changes
- Better performance characteristics

### ✅ Enhanced Features
- Automatic retry logic
- Batch processing
- Multi-API support
- TypeScript support

### ✅ Better Developer Experience
- Comprehensive documentation
- Real-world examples
- Active maintenance

## ⚠️ Important Migration Notes

### When NOT to Migrate
- You need **distributed rate limiting** (Redis-based, multi-server)
- You need **strict concurrency control** (keep p-limit, bottleneck)
- You need **request prioritization** (use priority queue libraries)
- You need **database connection pooling** (use dedicated pool libraries)

### Critical Differences
1. **Server-side usage requires per-user implementation** (see CRITICAL_PATTERNS.md)
2. **Bottleneck ≠ Rate limiting** (concurrency vs time-based limiting)
3. **p-limit ≠ Rate limiting** (concurrent promises vs time-based throttling)
4. **React hooks must be called inside components** (not in utility functions)

### Additional Resources
- [CRITICAL_PATTERNS.md](./CRITICAL_PATTERNS.md) - Essential usage patterns
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common migration issues
- [PERFORMANCE.md](./PERFORMANCE.md) - Optimization after migration