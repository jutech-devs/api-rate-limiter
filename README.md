# @jutech-devs/api-rate-limiter

Advanced API rate limiting SDK with multiple strategies and React hooks support.

## 🚀 Features

- **Multiple Strategies**: Sliding Window, Fixed Window, Token Bucket
- **React Hooks**: Easy integration with React applications
- **TypeScript**: Full type safety and IntelliSense
- **Flexible Configuration**: Customizable limits and windows
- **Advanced Features**: Retry logic, batch processing, multi-API support
- **Zero Dependencies**: Lightweight and fast

## 📦 Installation

```bash
npm install @jutech-devs/api-rate-limiter
# or
yarn add @jutech-devs/api-rate-limiter
```

## 🎯 Quick Start

### Basic Usage with React Hook

```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';

function APIComponent() {
  const { makeRequest, state, canMakeRequest } = useRateLimiter({
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    strategy: 'sliding-window'
  });

  const fetchData = async () => {
    try {
      const result = await makeRequest(() => 
        fetch('/api/data').then(res => res.json())
      );
      console.log('Data:', result);
    } catch (error) {
      console.error('Rate limited:', error.message);
    }
  };

  return (
    <div>
      <p>Remaining requests: {state.remaining}</p>
      <p>Reset time: {new Date(state.resetTime).toLocaleTimeString()}</p>
      <button onClick={fetchData} disabled={!canMakeRequest()}>
        Fetch Data
      </button>
    </div>
  );
}
```

### Vanilla JavaScript Usage

```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'token-bucket'
});

async function makeAPICall() {
  try {
    const result = await limiter.makeRequest(() => 
      fetch('/api/endpoint').then(res => res.json())
    );
    return result;
  } catch (error) {
    if (error.name === 'RateLimitError') {
      console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
    }
    throw error;
  }
}
```

## 📚 Rate Limiting Strategies

### 1. Sliding Window
Maintains a rolling window of requests. Most accurate but uses more memory.

```tsx
const { makeRequest } = useRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'sliding-window'
});
```

### 2. Fixed Window
Resets the counter at fixed intervals. Memory efficient but can allow bursts.

```tsx
const { makeRequest } = useRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'fixed-window'
});
```

### 3. Token Bucket
Allows burst requests up to bucket capacity. Smooth rate limiting.

```tsx
const { makeRequest } = useRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'token-bucket'
});
```

## 🔧 Advanced Usage

### API Requests with Automatic Retry

```tsx
import { useRateLimitedAPI } from '@jutech-devs/api-rate-limiter';

function APIComponent() {
  const { makeAPIRequest, state } = useRateLimitedAPI({
    maxRequests: 10,
    windowMs: 60000
  });

  const fetchWithRetry = async () => {
    try {
      const result = await makeAPIRequest(
        () => fetch('/api/data').then(res => res.json()),
        {
          maxRetries: 3,
          retryDelay: 1000,
          exponentialBackoff: true
        }
      );
      console.log('Success:', result);
    } catch (error) {
      console.error('Failed after retries:', error);
    }
  };

  return (
    <div>
      <button onClick={fetchWithRetry}>Fetch with Auto-Retry</button>
      <p>Status: {state.isLimited ? 'Rate Limited' : 'Available'}</p>
    </div>
  );
}
```

### Batch Request Processing

```tsx
import { useBatchRateLimiter } from '@jutech-devs/api-rate-limiter';

function BatchProcessor() {
  const { addToQueue, state, queueLength } = useBatchRateLimiter({
    maxRequests: 5,
    windowMs: 10000
  });

  const processBatch = async () => {
    const requests = [
      () => fetch('/api/item/1').then(res => res.json()),
      () => fetch('/api/item/2').then(res => res.json()),
      () => fetch('/api/item/3').then(res => res.json()),
    ];

    const results = await Promise.all(
      requests.map(req => addToQueue(req))
    );
    
    console.log('Batch results:', results);
  };

  return (
    <div>
      <button onClick={processBatch}>Process Batch</button>
      <p>Queue length: {queueLength}</p>
      <p>Remaining: {state.remaining}</p>
    </div>
  );
}
```

### Multiple API Rate Limiters

```tsx
import { useMultiRateLimiter } from '@jutech-devs/api-rate-limiter';

function MultiAPIComponent() {
  const { makeRequest, getAllStates } = useMultiRateLimiter({
    github: { maxRequests: 60, windowMs: 3600000 }, // GitHub API
    twitter: { maxRequests: 300, windowMs: 900000 }, // Twitter API
    internal: { maxRequests: 1000, windowMs: 60000 } // Internal API
  });

  const fetchGitHubData = () => 
    makeRequest('github', () => 
      fetch('/api/github/user').then(res => res.json())
    );

  const fetchTwitterData = () => 
    makeRequest('twitter', () => 
      fetch('/api/twitter/tweets').then(res => res.json())
    );

  const states = getAllStates();

  return (
    <div>
      <button onClick={fetchGitHubData}>
        GitHub API (Remaining: {states.github?.remaining})
      </button>
      <button onClick={fetchTwitterData}>
        Twitter API (Remaining: {states.twitter?.remaining})
      </button>
    </div>
  );
}
```

## ⚙️ Configuration Options

```typescript
interface RateLimiterConfig {
  maxRequests: number;           // Maximum requests per window
  windowMs: number;              // Time window in milliseconds
  strategy: 'sliding-window' | 'fixed-window' | 'token-bucket';
  retryAfter?: number;           // Default retry delay
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
}
```

## 📊 State Information

```typescript
interface RateLimiterState {
  remaining: number;    // Requests remaining in current window
  resetTime: number;    // When the window resets (timestamp)
  isLimited: boolean;   // Whether currently rate limited
  retryAfter: number;   // Milliseconds to wait before retry
  totalRequests: number; // Total requests made in current window
}
```

## 🎣 Available Hooks

### `useRateLimiter(config, callbacks)`
Basic rate limiting hook with full control.

### `useRateLimitedAPI(config)`
API requests with automatic retry logic.

### `useBatchRateLimiter(config)`
Queue and process requests in batches.

### `useMultiRateLimiter(configs)`
Manage multiple rate limiters for different APIs.

## 🔄 Callbacks

```tsx
const { makeRequest } = useRateLimiter(
  { maxRequests: 10, windowMs: 60000 },
  {
    onRateLimit: (retryAfter) => {
      console.log(`Rate limited! Retry after ${retryAfter}ms`);
    },
    onReset: () => {
      console.log('Rate limit window reset');
    },
    onRequest: (remaining) => {
      console.log(`${remaining} requests remaining`);
    }
  }
);
```

## 🚨 Error Handling

```tsx
import { RateLimitError } from '@jutech-devs/api-rate-limiter';

try {
  await makeRequest(() => fetch('/api/data'));
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}ms`);
    // Handle rate limit specifically
  } else {
    console.error('Other error:', error);
  }
}
```

## 🎯 Use Cases

- **API Integration**: Respect third-party API rate limits
- **User Actions**: Prevent spam clicking/submissions
- **Background Jobs**: Throttle automated processes
- **Resource Protection**: Protect your own APIs
- **Batch Processing**: Process large datasets efficiently

## 📈 Performance

- **Memory Efficient**: Optimized data structures
- **CPU Friendly**: Minimal computational overhead
- **Configurable**: Tune for your specific needs
- **Scalable**: Works with high-frequency applications

## 🔧 Requirements

- React 16.8.0+ (for hooks)
- TypeScript 4.0+ (optional but recommended)

## 📄 License

MIT © JuTech Devs

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📞 Support

For support, open an issue on GitHub or contact support@jutech-devs.com