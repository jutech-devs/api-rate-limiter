# ⚠️ Critical Usage Patterns

**Important technical considerations and correct usage patterns for production applications.**

## 🚨 Server-Side Rate Limiting: Per-User vs Global

### ❌ Common Mistake: Global Rate Limiting
```javascript
// WRONG: This applies to ALL users combined
const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

app.use('/api/', async (req, res, next) => {
  try {
    await limiter.makeRequest(() => Promise.resolve());
    next();
  } catch (error) {
    res.status(429).json({ error: 'Too many requests' });
  }
});
// Problem: User A can exhaust the limit for all users B, C, D...
```

### ✅ Correct: Per-User Rate Limiting
```javascript
const limiters = new Map();

function getLimiter(key) {
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiter({ 
      maxRequests: 100, 
      windowMs: 15 * 60 * 1000 
    }));
  }
  return limiters.get(key);
}

app.use('/api/', async (req, res, next) => {
  const key = req.ip; // or req.user?.id or req.headers['x-api-key']
  const limiter = getLimiter(key);

  try {
    await limiter.makeRequest(() => Promise.resolve());
    next();
  } catch (error) {
    res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: error.retryAfter 
    });
  }
});
```

### 🔧 Production-Ready Per-User Implementation
```javascript
class PerUserRateLimiter {
  constructor(config) {
    this.config = config;
    this.limiters = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  getLimiter(key) {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, {
        limiter: new RateLimiter(this.config),
        lastUsed: Date.now()
      });
    }
    
    this.limiters.get(key).lastUsed = Date.now();
    return this.limiters.get(key).limiter;
  }

  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [key, { lastUsed }] of this.limiters) {
      if (now - lastUsed > maxAge) {
        this.limiters.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.limiters.clear();
  }
}

// Usage
const rateLimiter = new PerUserRateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
});

app.use('/api/', async (req, res, next) => {
  const limiter = rateLimiter.getLimiter(req.ip);
  
  try {
    await limiter.makeRequest(() => Promise.resolve());
    next();
  } catch (error) {
    res.status(429).json({ error: 'Rate limited' });
  }
});
```

## 🎯 Better DX: Token Consumption Patterns

### ❌ Awkward Pattern
```javascript
// This works but feels unintuitive
await limiter.makeRequest(() => Promise.resolve());
```

### ✅ Clearer Alternatives

#### Option 1: Document the Pattern Clearly
```javascript
// Use makeRequest even if you only want to consume a token
await limiter.makeRequest(() => Promise.resolve());

// Or with a meaningful operation
await limiter.makeRequest(() => {
  // Rate limit this operation
  return Promise.resolve();
});
```

#### Option 2: Add Helper Method (Future Enhancement)
```javascript
// Potential future API improvement
await limiter.consume(); // Internally calls makeRequest(() => Promise.resolve())
```

#### Option 3: Semantic Wrapper
```javascript
class EnhancedRateLimiter extends RateLimiter {
  async consume() {
    return this.makeRequest(() => Promise.resolve());
  }
  
  async guard(operation) {
    return this.makeRequest(operation);
  }
}

// Usage
const limiter = new EnhancedRateLimiter(config);
await limiter.consume(); // Just consume a token
await limiter.guard(() => fetch('/api')); // Guard an operation
```

## ⚠️ Library Conceptual Differences

### Bottleneck vs Rate Limiting
```javascript
// Bottleneck handles: concurrency + queueing + spacing
const bottleneck = new Bottleneck({
  maxConcurrent: 1,    // Only 1 request at a time
  minTime: 333         // 333ms between requests
});

// Our SDK handles: time-based rate limiting
const rateLimiter = new RateLimiter({
  maxRequests: 3,      // 3 requests per window
  windowMs: 1000       // 1 second window
});
```

**⚠️ Important Note:**
- **Bottleneck** is a scheduler/concurrency limiter with job queueing
- **This SDK** focuses on time-based rate limiting, not strict concurrency control
- For strict concurrency control, combine with a queue library

### p-limit vs Rate Limiting
```javascript
// p-limit controls concurrent promises (not time-based)
const limit = pLimit(3); // Max 3 concurrent promises

// Our SDK provides time-based throttling + queueing
const { addToQueue } = useBatchRateLimiter({
  maxRequests: 3,
  windowMs: 1000
});
```

**⚠️ Important Note:**
- **p-limit** controls concurrent execution
- **useBatchRateLimiter** provides time-based throttling with queueing

## 🔍 When NOT to Use This SDK

### ❌ Not Suitable For:
- **Distributed rate limiting** (Redis-based, multi-server)
- **Strict concurrency control** (use p-limit, bottleneck)
- **Request prioritization** (use priority queues)
- **Database connection pooling** (use dedicated pool libraries)
- **Circuit breaker patterns** (use circuit breaker libraries)

### ✅ Perfect For:
- Client-side API rate limiting
- React application request throttling
- Single-server rate limiting
- User action throttling (clicks, submissions)
- API quota management
- Burst traffic handling

## 📊 Library Comparison

| Feature | express-rate-limit | bottleneck | p-limit | This SDK |
|---------|-------------------|------------|---------|----------|
| **Client-side** | ❌ | ❌ | ❌ | ✅ |
| **React Hooks** | ❌ | ❌ | ❌ | ✅ |
| **Per-user limiting** | ✅ | ❌ | ❌ | ✅* |
| **Retry Logic** | ❌ | ✅ | ❌ | ✅ |
| **Token Bucket** | ❌ | ✅ | ❌ | ✅ |
| **Concurrency Control** | ❌ | ✅ | ✅ | ❌ |
| **Job Queueing** | ❌ | ✅ | ❌ | ⚠️** |
| **TypeScript** | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **Zero Dependencies** | ❌ | ❌ | ❌ | ✅ |

*Requires manual implementation (see examples above)  
**Basic queueing via useBatchRateLimiter

## 🚨 Common Pitfalls

### 1. Global Rate Limiting
```javascript
❌ const limiter = new RateLimiter(config); // Shared by all users
✅ const limiter = getLimiterForUser(userId); // Per-user instance
```

### 2. Expecting Concurrency Limiting
```javascript
❌ // This SDK doesn't limit concurrent requests
const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });

✅ // Use batch patterns for controlled processing
const { addToQueue } = useBatchRateLimiter(config);
```

### 3. React Hook Misuse
```javascript
❌ // Don't call hooks in utilities
function apiCall() {
  const { makeRequest } = useRateLimiter(config); // Wrong!
}

✅ // Call hooks in components
function MyComponent() {
  const { makeRequest } = useRateLimiter(config); // Correct!
}
```

### 4. Memory Leaks in Server Applications
```javascript
❌ // Limiters never cleaned up
const limiters = new Map();
function getLimiter(key) {
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiter(config));
  }
  return limiters.get(key);
}

✅ // Implement cleanup (see PerUserRateLimiter example above)
```

## 🛠️ Recommended Patterns

### Server-Side Middleware
```javascript
// Express middleware with proper per-user limiting
function createRateLimitMiddleware(config) {
  const rateLimiter = new PerUserRateLimiter(config);
  
  return async (req, res, next) => {
    const key = req.ip || req.user?.id || 'anonymous';
    const limiter = rateLimiter.getLimiter(key);
    
    try {
      await limiter.makeRequest(() => Promise.resolve());
      next();
    } catch (error) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(error.retryAfter / 1000)
      });
    }
  };
}

// Usage
app.use('/api/', createRateLimitMiddleware({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
}));
```

### Client-Side API Wrapper
```javascript
class RateLimitedAPIClient {
  constructor(baseURL, rateLimitConfig) {
    this.baseURL = baseURL;
    this.limiter = new RateLimiter(rateLimitConfig);
  }
  
  async request(endpoint, options = {}) {
    return this.limiter.makeRequest(() =>
      fetch(`${this.baseURL}${endpoint}`, options)
        .then(res => res.json())
    );
  }
}

// Usage
const api = new RateLimitedAPIClient('https://api.example.com', {
  maxRequests: 60,
  windowMs: 60000
});

const data = await api.request('/users/123');
```

### React Component Pattern
```tsx
function APIComponent() {
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 10,
    windowMs: 60000
  });
  
  const handleAction = useCallback(async () => {
    try {
      const result = await makeRequest(() =>
        fetch('/api/action', { method: 'POST' })
          .then(res => res.json())
      );
      // Handle success
    } catch (error) {
      if (error instanceof RateLimitError) {
        // Handle rate limit
        toast.error(`Rate limited. Try again in ${Math.ceil(error.retryAfter / 1000)}s`);
      }
    }
  }, [makeRequest]);
  
  return (
    <button 
      onClick={handleAction}
      disabled={state.isLimited}
    >
      Action ({state.remaining} remaining)
    </button>
  );
}

## 📝 Documentation Notes

**Important:** Always use per-user/per-IP rate limiting in server applications. The examples showing global rate limiting are for demonstration only and should not be used in production.   Action ({state.remaining} remaining)
    </button>
  );
}
```

## 📝 Documentation Notes

**Important:** Always use per-user/per-IP rate limiting in server applications. The examples showing global rate limiting are for demonstration only and should not be used in production.