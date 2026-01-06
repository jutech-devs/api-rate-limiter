# Professional Per-User Rate Limiting

Professional implementation examples using the built-in per-user rate limiter.

## 🏢 Server-Side Implementation

### Express.js Middleware
```javascript
import { PerUserRateLimiter } from '@jutech-devs/api-rate-limiter';

// Create per-user rate limiter
const rateLimiter = new PerUserRateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  strategy: 'sliding-window',
  cleanupInterval: 60000, // Cleanup every minute
  maxInactiveTime: 3600000 // Remove inactive users after 1 hour
});

// Middleware function
function createRateLimitMiddleware() {
  return async (req, res, next) => {
    const userId = req.user?.id || req.ip || 'anonymous';
    
    try {
      await rateLimiter.makeRequest(userId, () => Promise.resolve());
      
      // Add rate limit headers
      const state = rateLimiter.getState(userId);
      res.set({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': state.remaining.toString(),
        'X-RateLimit-Reset': new Date(state.resetTime).toISOString()
      });
      
      next();
    } catch (error) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(error.retryAfter / 1000),
        limit: 100,
        remaining: 0
      });
    }
  };
}

// Apply to routes
app.use('/api/', createRateLimitMiddleware());
```

### Different Limits Per User Type
```javascript
import { PerUserRateLimiter } from '@jutech-devs/api-rate-limiter';

class TieredRateLimiter {
  constructor() {
    this.freeTier = new PerUserRateLimiter({
      maxRequests: 100,
      windowMs: 3600000 // 1 hour
    });
    
    this.premiumTier = new PerUserRateLimiter({
      maxRequests: 1000,
      windowMs: 3600000 // 1 hour
    });
    
    this.enterpriseTier = new PerUserRateLimiter({
      maxRequests: 10000,
      windowMs: 3600000 // 1 hour
    });
  }
  
  getLimiter(user) {
    if (user.plan === 'enterprise') return this.enterpriseTier;
    if (user.plan === 'premium') return this.premiumTier;
    return this.freeTier;
  }
  
  async makeRequest(user, requestFn) {
    const limiter = this.getLimiter(user);
    return limiter.makeRequest(user.id, requestFn);
  }
}

// Usage
const tieredLimiter = new TieredRateLimiter();

app.use('/api/', async (req, res, next) => {
  try {
    await tieredLimiter.makeRequest(req.user, () => Promise.resolve());
    next();
  } catch (error) {
    res.status(429).json({ error: 'Rate limit exceeded' });
  }
});
```

## ⚛️ React Implementation

### Per-User API Client
```tsx
import { usePerUserRateLimiter } from '@jutech-devs/api-rate-limiter';

function APIProvider({ children }) {
  const { makeRequest, getState, activeUserCount } = usePerUserRateLimiter({
    maxRequests: 60,
    windowMs: 60000, // 1 minute
    strategy: 'token-bucket'
  });

  const apiCall = async (userId, endpoint, options = {}) => {
    return makeRequest(userId, () =>
      fetch(endpoint, options).then(res => res.json())
    );
  };

  const getUserQuota = (userId) => {
    const state = getState(userId);
    return {
      remaining: state.remaining,
      resetTime: state.resetTime,
      isLimited: state.isLimited
    };
  };

  return (
    <APIContext.Provider value={{ apiCall, getUserQuota, activeUserCount }}>
      {children}
    </APIContext.Provider>
  );
}
```

### Multi-User Dashboard
```tsx
import { usePerUserRateLimiter } from '@jutech-devs/api-rate-limiter';

function AdminDashboard() {
  const { getAllStates, reset, activeUserCount } = usePerUserRateLimiter({
    maxRequests: 100,
    windowMs: 3600000
  });

  const [userStates, setUserStates] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setUserStates(getAllStates());
    }, 1000);
    return () => clearInterval(interval);
  }, [getAllStates]);

  const resetUser = (userId) => {
    reset(userId);
    setUserStates(getAllStates());
  };

  return (
    <div>
      <h2>Rate Limit Dashboard</h2>
      <p>Active Users: {activeUserCount}</p>
      
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Remaining</th>
            <th>Status</th>
            <th>Reset Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(userStates).map(([userId, state]) => (
            <tr key={userId}>
              <td>{userId}</td>
              <td>{state.remaining}</td>
              <td>{state.isLimited ? '🔴 Limited' : '🟢 Active'}</td>
              <td>{new Date(state.resetTime).toLocaleTimeString()}</td>
              <td>
                <button onClick={() => resetUser(userId)}>
                  Reset
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 🔧 Advanced Patterns

### API Key Based Limiting
```javascript
import { PerUserRateLimiter } from '@jutech-devs/api-rate-limiter';

class APIKeyRateLimiter {
  constructor() {
    this.limiter = new PerUserRateLimiter({
      maxRequests: 1000,
      windowMs: 3600000,
      strategy: 'sliding-window'
    });
  }

  async validateAndLimit(apiKey, requestFn) {
    // Validate API key
    const keyInfo = await this.validateAPIKey(apiKey);
    if (!keyInfo.valid) {
      throw new Error('Invalid API key');
    }

    // Apply rate limiting per API key
    return this.limiter.makeRequest(apiKey, requestFn);
  }

  async validateAPIKey(apiKey) {
    // Your API key validation logic
    return { valid: true, userId: 'user123', plan: 'premium' };
  }

  getUsage(apiKey) {
    return this.limiter.getState(apiKey);
  }
}

// Express middleware
const apiKeyLimiter = new APIKeyRateLimiter();

app.use('/api/', async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    await apiKeyLimiter.validateAndLimit(apiKey, () => Promise.resolve());
    next();
  } catch (error) {
    if (error.name === 'RateLimitError') {
      res.status(429).json({ error: 'Rate limit exceeded' });
    } else {
      res.status(401).json({ error: error.message });
    }
  }
});
```

### WebSocket Rate Limiting
```javascript
import { PerUserRateLimiter } from '@jutech-devs/api-rate-limiter';
import WebSocket from 'ws';

const wsRateLimiter = new PerUserRateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 10 messages per minute
  strategy: 'sliding-window'
});

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  const userId = getUserIdFromRequest(req);
  
  ws.on('message', async (message) => {
    try {
      await wsRateLimiter.makeRequest(userId, () => Promise.resolve());
      
      // Process message
      const data = JSON.parse(message);
      handleMessage(ws, data);
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Rate limit exceeded',
        retryAfter: error.retryAfter
      }));
    }
  });
});
```

## 📊 Monitoring & Analytics

### Rate Limit Analytics
```javascript
import { PerUserRateLimiter } from '@jutech-devs/api-rate-limiter';

const analyticsLimiter = new PerUserRateLimiter({
  maxRequests: 100,
  windowMs: 3600000
}, {
  onRateLimit: (retryAfter) => {
    // Log rate limit events
    console.log(`Rate limit hit, retry after: ${retryAfter}ms`);
    analytics.track('rate_limit_exceeded', { retryAfter });
  },
  onRequest: (remaining) => {
    // Track usage patterns
    if (remaining < 10) {
      analytics.track('rate_limit_warning', { remaining });
    }
  }
});

// Get analytics data
function getRateLimitAnalytics() {
  const allStates = analyticsLimiter.getAllStates();
  
  return {
    totalUsers: Object.keys(allStates).length,
    limitedUsers: Object.values(allStates).filter(s => s.isLimited).length,
    averageUsage: Object.values(allStates).reduce((sum, s) => 
      sum + (100 - s.remaining), 0) / Object.keys(allStates).length
  };
}
```

## 🚀 Production Deployment

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Environment variables for rate limiting
ENV RATE_LIMIT_MAX_REQUESTS=1000
ENV RATE_LIMIT_WINDOW_MS=3600000
ENV RATE_LIMIT_CLEANUP_INTERVAL=60000

EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Configuration
```javascript
// config.js
export const rateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000,
  strategy: process.env.RATE_LIMIT_STRATEGY || 'sliding-window',
  cleanupInterval: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL) || 60000,
  maxInactiveTime: parseInt(process.env.RATE_LIMIT_MAX_INACTIVE_TIME) || 3600000
};
```

## ✅ Benefits of Built-in Per-User Rate Limiting

1. **Professional Grade**: Production-ready with automatic cleanup
2. **Memory Efficient**: Automatic removal of inactive users
3. **Type Safe**: Full TypeScript support
4. **React Ready**: Built-in hooks for React applications
5. **Monitoring**: Built-in analytics and state tracking
6. **Scalable**: Handles thousands of concurrent users
7. **Configurable**: Flexible cleanup and timeout settings

This implementation provides enterprise-grade per-user rate limiting out of the box.