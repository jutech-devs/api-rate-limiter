# Examples & Use Cases

Real-world examples and common usage patterns for the API Rate Limiter SDK.

## Basic Examples

### 1. Simple Button Rate Limiting

Prevent users from spamming a button:

```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';

function SubmitButton() {
  const { makeRequest, state, canMakeRequest } = useRateLimiter({
    maxRequests: 3,
    windowMs: 10000, // 10 seconds
    strategy: 'sliding-window'
  });

  const handleSubmit = async () => {
    try {
      await makeRequest(() => 
        fetch('/api/submit', { method: 'POST' })
      );
      alert('Submitted successfully!');
    } catch (error) {
      alert(`Please wait ${Math.ceil(error.retryAfter / 1000)} seconds`);
    }
  };

  return (
    <div>
      <button 
        onClick={handleSubmit} 
        disabled={!canMakeRequest()}
      >
        Submit ({state.remaining} left)
      </button>
      {state.isLimited && (
        <p>Rate limited. Try again in {Math.ceil(state.retryAfter / 1000)}s</p>
      )}
    </div>
  );
}
```

### 2. API Data Fetching

Rate limit API calls with loading states:

```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';
import { useState } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 10,
    windowMs: 60000
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await makeRequest(() =>
        fetch('/api/data').then(res => res.json())
      );
      setData(result);
    } catch (error) {
      console.error('Failed to fetch:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      <p>Requests remaining: {state.remaining}</p>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

## Advanced Examples

### 3. Auto-Retry with Exponential Backoff

Automatically retry failed requests:

```tsx
import { useRateLimitedAPI } from '@jutech-devs/api-rate-limiter';

function RobustAPIClient() {
  const { makeAPIRequest, state } = useRateLimitedAPI({
    maxRequests: 5,
    windowMs: 30000
  });

  const fetchWithRetry = async () => {
    try {
      const data = await makeAPIRequest(
        () => fetch('/api/unreliable').then(res => {
          if (!res.ok) throw new Error('API Error');
          return res.json();
        }),
        {
          maxRetries: 5,
          retryDelay: 1000,
          exponentialBackoff: true
        }
      );
      console.log('Success:', data);
    } catch (error) {
      console.error('Failed after retries:', error);
    }
  };

  return (
    <div>
      <button onClick={fetchWithRetry}>
        Fetch with Auto-Retry
      </button>
      <p>Status: {state.isLimited ? 'Rate Limited' : 'Available'}</p>
    </div>
  );
}
```

### 4. Batch Processing

Process multiple items with rate limiting:

```tsx
import { useBatchRateLimiter } from '@jutech-devs/api-rate-limiter';

function BatchProcessor() {
  const [items, setItems] = useState([]);
  const [results, setResults] = useState([]);
  
  const { addToQueue, queueLength, state } = useBatchRateLimiter({
    maxRequests: 3,
    windowMs: 5000
  });

  const processItems = async () => {
    const itemsToProcess = ['item1', 'item2', 'item3', 'item4', 'item5'];
    
    const promises = itemsToProcess.map(item =>
      addToQueue(() => 
        fetch(`/api/process/${item}`)
          .then(res => res.json())
          .then(data => ({ item, data }))
      )
    );

    try {
      const results = await Promise.all(promises);
      setResults(results);
    } catch (error) {
      console.error('Batch processing failed:', error);
    }
  };

  return (
    <div>
      <button onClick={processItems}>
        Process Batch ({queueLength} queued)
      </button>
      <p>Rate limit: {state.remaining} remaining</p>
      <div>
        {results.map((result, i) => (
          <div key={i}>{result.item}: {JSON.stringify(result.data)}</div>
        ))}
      </div>
    </div>
  );
}
```

### 5. Multiple API Management

Handle different APIs with separate rate limits:

```tsx
import { useMultiRateLimiter } from '@jutech-devs/api-rate-limiter';

function MultiAPIClient() {
  const { makeRequest, getAllStates } = useMultiRateLimiter({
    github: { maxRequests: 60, windowMs: 3600000 },    // GitHub: 60/hour
    twitter: { maxRequests: 300, windowMs: 900000 },   // Twitter: 300/15min
    internal: { maxRequests: 1000, windowMs: 60000 }   // Internal: 1000/min
  });

  const fetchGitHub = () => makeRequest('github', () =>
    fetch('/api/github/user').then(res => res.json())
  );

  const fetchTwitter = () => makeRequest('twitter', () =>
    fetch('/api/twitter/tweets').then(res => res.json())
  );

  const fetchInternal = () => makeRequest('internal', () =>
    fetch('/api/internal/data').then(res => res.json())
  );

  const states = getAllStates();

  return (
    <div>
      <div>
        <button onClick={fetchGitHub}>
          GitHub API (Remaining: {states.github?.remaining})
        </button>
      </div>
      <div>
        <button onClick={fetchTwitter}>
          Twitter API (Remaining: {states.twitter?.remaining})
        </button>
      </div>
      <div>
        <button onClick={fetchInternal}>
          Internal API (Remaining: {states.internal?.remaining})
        </button>
      </div>
    </div>
  );
}
```

## Real-World Use Cases

### 6. Search with Debouncing + Rate Limiting

Combine debouncing with rate limiting for search:

```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';
import { useState, useEffect, useMemo } from 'react';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    strategy: 'token-bucket'
  });

  // Debounce search query
  const debouncedQuery = useMemo(() => {
    const timer = setTimeout(() => query, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (query.length > 2) {
      makeRequest(() =>
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
      )
      .then(setResults)
      .catch(console.error);
    }
  }, [debouncedQuery, makeRequest]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <p>Search quota: {state.remaining} remaining</p>
      <ul>
        {results.map((result, i) => (
          <li key={i}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 7. File Upload with Progress

Rate limit file uploads:

```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';

function FileUploader() {
  const [progress, setProgress] = useState(0);
  
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 3,
    windowMs: 60000,
    strategy: 'fixed-window'
  }, {
    onRateLimit: (retryAfter) => {
      alert(`Upload rate limited. Wait ${Math.ceil(retryAfter / 1000)}s`);
    }
  });

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await makeRequest(() => 
        fetch('/api/upload', {
          method: 'POST',
          body: formData
        }).then(res => {
          if (!res.ok) throw new Error('Upload failed');
          return res.json();
        })
      );
      alert('Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => uploadFile(e.target.files[0])}
        disabled={!state.remaining}
      />
      <p>Uploads remaining: {state.remaining}/3</p>
      {state.isLimited && (
        <p>Upload limit reached. Resets at {new Date(state.resetTime).toLocaleTimeString()}</p>
      )}
    </div>
  );
}
```

### 8. WebSocket Rate Limiting

Rate limit WebSocket messages:

```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';
import { useEffect, useRef } from 'react';

function ChatComponent() {
  const wsRef = useRef(null);
  const [message, setMessage] = useState('');
  
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 10,
    windowMs: 30000, // 10 messages per 30 seconds
    strategy: 'sliding-window'
  });

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:8080');
    return () => wsRef.current?.close();
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      await makeRequest(async () => {
        wsRef.current.send(JSON.stringify({ 
          type: 'message', 
          content: message 
        }));
        return Promise.resolve();
      });
      setMessage('');
    } catch (error) {
      alert('Message rate limited!');
    }
  };

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="Type message..."
      />
      <button onClick={sendMessage} disabled={!state.remaining}>
        Send ({state.remaining} left)
      </button>
    </div>
  );
}
```

## Vanilla JavaScript Examples

### 9. Node.js API Client

```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

class APIClient {
  constructor() {
    this.limiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60000,
      strategy: 'token-bucket'
    }, {
      onRateLimit: (retryAfter) => {
        console.log(`Rate limited. Retry after ${retryAfter}ms`);
      }
    });
  }

  async get(url) {
    return this.limiter.makeRequest(() =>
      fetch(url).then(res => res.json())
    );
  }

  async post(url, data) {
    return this.limiter.makeRequest(() =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json())
    );
  }

  getStatus() {
    return this.limiter.getState();
  }
}

// Usage
const client = new APIClient();

async function example() {
  try {
    const data = await client.get('/api/users');
    console.log('Users:', data);
    
    const status = client.getStatus();
    console.log(`${status.remaining} requests remaining`);
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}
```

### 10. Background Job Processing

```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

class JobProcessor {
  constructor() {
    this.limiter = new RateLimiter({
      maxRequests: 50,
      windowMs: 60000,
      strategy: 'fixed-window'
    });
    
    this.queue = [];
    this.processing = false;
  }

  addJob(job) {
    this.queue.push(job);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      
      try {
        await this.limiter.makeRequest(() => this.executeJob(job));
        console.log(`Job ${job.id} completed`);
      } catch (error) {
        console.log(`Job ${job.id} rate limited, requeueing...`);
        this.queue.unshift(job); // Put back at front
        
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, this.limiter.getWaitTime())
        );
      }
    }
    
    this.processing = false;
  }

  async executeJob(job) {
    // Simulate job execution
    return new Promise(resolve => {
      setTimeout(() => resolve(`Job ${job.id} result`), 100);
    });
  }
}

// Usage
const processor = new JobProcessor();

for (let i = 0; i < 100; i++) {
  processor.addJob({ id: i, data: `job-${i}` });
}
```

## Testing Examples

### 11. Unit Testing Rate Limiter

```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

describe('RateLimiter', () => {
  test('should allow requests within limit', async () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000
    });

    // Should allow 3 requests
    for (let i = 0; i < 3; i++) {
      const result = await limiter.makeRequest(() => 
        Promise.resolve(`request-${i}`)
      );
      expect(result).toBe(`request-${i}`);
    }
  });

  test('should reject requests over limit', async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000
    });

    // Use up the limit
    await limiter.makeRequest(() => Promise.resolve('ok'));
    await limiter.makeRequest(() => Promise.resolve('ok'));

    // This should fail
    await expect(
      limiter.makeRequest(() => Promise.resolve('fail'))
    ).rejects.toThrow('Rate limit exceeded');
  });
});
```



Examples & Use Cases — Deep Explanation & Engineering Insight
How to Read These Examples (Important)

Every example answers three hidden questions:

What user behavior are we controlling?

What failure are we preventing?

Why this rate-limiting strategy fits best?

If you understand those three, you can design your own use cases confidently.

🔹 BASIC EXAMPLES
1️⃣ Simple Button Rate Limiting
Problem Being Solved

Users can:

Double-click

Rage-click

Script button clicks

This causes:

Duplicate submissions

Database inconsistency

Costly API calls

Why sliding-window?
strategy: 'sliding-window'


Because:

You want exact timing

No burst abuse at boundaries

Every click matters

Example abuse prevented:

2 clicks at 9.9s
1 click at 10.1s


❌ Fixed window would allow
✅ Sliding window blocks

UX Pattern Used (Best Practice)
disabled={!canMakeRequest()}


This is important:

You’re preventing the error, not reacting to it

The user understands why they can’t click

Engineering Insight 💡

Button rate limiting should almost always be sliding-window
because clicks are user-driven, unpredictable, and abuse-prone.

2️⃣ API Data Fetching
Problem Being Solved

Repeated fetch clicks

Slow networks causing retries

UI triggering duplicate requests

Key Design Choice
setLoading(true)


You’re combining:

UI state protection (loading)

Logical protection (rate limiter)

This is ideal — rate limiting is a second line of defense, not the first.

What Happens When Rate Limited?

No fetch is executed

No bandwidth wasted

UI stays responsive

Engineering Insight 💡

Rate limiting should wrap the API call, not the UI event.

You did that correctly.

🔹 ADVANCED EXAMPLES
3️⃣ Auto-Retry with Exponential Backoff
Problem Being Solved

APIs fail because of:

Temporary overload

Network instability

Server throttling

Retrying immediately is dangerous.

Why Exponential Backoff?
retryDelay: 1000,
exponentialBackoff: true


Retry timeline:

1s → 2s → 4s → 8s → 16s


This:

Reduces pressure on server

Matches real API expectations

Prevents retry storms

Why Rate Limiting + Retry Together?

Without limiter:
❌ Infinite retries

Without retry:
❌ One failure kills UX

Together:
✅ Controlled persistence

Engineering Insight 💡

Retry logic without rate limiting is a DDoS bug waiting to happen.

4️⃣ Batch Processing
Problem Being Solved

User performs a bulk action:

Upload many files

Process many items

Run batch jobs

API limit:

3 requests per 5 seconds

Why Queue Instead of Reject?
addToQueue(() => ...)


Instead of:
❌ “Rate limited” errors

You get:
✅ Order preservation
✅ Automatic pacing
✅ Predictable execution

Important Detail
Promise.all(promises)


Even though requests are queued, the caller still gets promises.

This is excellent API design.

Engineering Insight 💡

Queuing is superior to rejecting when work must eventually complete.

5️⃣ Multiple API Management
Problem Being Solved

Different APIs = different rules.

GitHub:

Strict

Hourly limits

Twitter:

Short windows

Larger volumes

Internal:

Relaxed

High throughput

Why Separate Limiters?
useMultiRateLimiter({
  github: {...},
  twitter: {...}
})


This prevents:

One API exhausting another’s quota

Shared counters causing chaos

Real-World Pattern

This mirrors API Gateway design.

Each API:

Own limits

Own strategy

Own state

Engineering Insight 💡

Never share a rate limiter across unrelated APIs.

🔹 REAL-WORLD USE CASES
6️⃣ Search + Debounce + Rate Limiting
Problem Being Solved

Typing triggers:

Too many requests

Wasted backend resources

Layered Defense (Very Professional)

Debounce → controls typing noise

Rate limiter → controls abuse

Token bucket → allows burst typing

Why token-bucket?

Typing behavior:

type → pause → type → pause


Token bucket:

Absorbs bursts

Refills naturally

Feels smooth

Engineering Insight 💡

Debounce handles events
Rate limiting handles intent

You want both.

7️⃣ File Upload Rate Limiting
Problem Being Solved

Uploads are:

Heavy

Expensive

Server-intensive

Why fixed-window?

Uploads:

Are slow

Rarely burst rapidly

Easier to explain to users

3 uploads per minute


This matches user expectations.

Callback Usage (Nice Touch)
onRateLimit: (retryAfter) => alert(...)


This:

Centralizes behavior

Avoids scattered error handling

Engineering Insight 💡

Fixed window is ideal when limits are human-readable.

8️⃣ WebSocket Rate Limiting
Problem Being Solved

Chat spam:

Message flooding

Server overload

Abuse

Why Sliding Window?

Messages are:

High frequency

Easily scripted

Abuse-prone

Sliding window ensures:

No burst loopholes

Fair message pacing

Subtle but Important Detail
await makeRequest(async () => {
  ws.send(...)
});


You’re rate limiting message intent, not network state.

That’s correct.

Engineering Insight 💡

WebSocket ≠ exempt from rate limiting
Messages are still requests.

🔹 VANILLA JAVASCRIPT
9️⃣ Node.js API Client
Problem Being Solved

SDK or service making external calls:

Needs safety

Needs retries

No UI

Why Token Bucket?

Bursts allowed

Sustained rate controlled

Efficient for background usage

Encapsulation Done Right
class APIClient {
  limiter
  get()
  post()
}


This:

Makes rate limiting invisible to callers

Enforces discipline centrally

Engineering Insight 💡

Rate limiting belongs inside clients, not at call sites.

🔟 Background Job Processing
Problem Being Solved

Job queues can:

Flood APIs

Get stuck

Retry too fast

Strategy Choice
strategy: 'fixed-window'


Because:

Jobs are predictable

Throughput > precision

Simpler retry math

Requeue Pattern (Very Important)
this.queue.unshift(job);


This preserves job order and avoids starvation.

Engineering Insight 💡

Background systems should wait patiently, not fail loudly.

🧪 TESTING EXAMPLES
1️⃣1️⃣ Unit Testing
What You’re Testing

Allow behavior

Reject behavior

This is correct scope.

Best Practice Highlight
.rejects.toThrow('Rate limit exceeded')


You’re testing:

Behavior

Not internal state

This keeps tests stable.

Engineering Insight 💡

Never test timestamps or counters directly — test outcomes.

🧠 FINAL MENTAL MODEL (VERY IMPORTANT)
Think of the SDK as:

Guard → RateLimiter

Rules → strategies

Signals → RateLimitError

UX helpers → hooks

Traffic system → queues & retries