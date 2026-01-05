# Rate Limiting Strategies

Understanding the different rate limiting algorithms and when to use them.

## Overview

The SDK provides three rate limiting strategies, each with different characteristics and use cases.

## Sliding Window Strategy

### How it Works
- Maintains an array of request timestamps
- Removes expired timestamps on each check
- Most accurate representation of request rate

### Characteristics
- ✅ **Accurate**: Prevents rate limit circumvention
- ✅ **Smooth**: No burst allowance at boundaries
- ❌ **Memory**: Stores all request timestamps
- ❌ **Performance**: O(n) cleanup operations

### Best For
- APIs with strict rate limits
- Security-sensitive applications
- When accuracy is more important than performance

### Example
```typescript
const { makeRequest } = useRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'sliding-window'
});
```

### Visual Representation
```
Time:     0    10   20   30   40   50   60   70
Requests: |----|----|----|----|----|----|----|----|
Window:        [----------60s window----------]
```

## Fixed Window Strategy

### How it Works
- Simple counter that resets at fixed intervals
- Tracks window start time and request count
- Resets completely when window expires

### Characteristics
- ✅ **Memory**: O(1) memory usage
- ✅ **Performance**: O(1) operations
- ✅ **Simple**: Easy to understand and debug
- ❌ **Bursts**: Allows 2x rate at boundaries

### Best For
- High-performance applications
- Internal APIs with relaxed limits
- When simplicity is preferred

### Example
```typescript
const { makeRequest } = useRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'fixed-window'
});
```

### Visual Representation
```
Time:     0    30   60   90   120
Requests: 100  100  0    50   0
Window:   [--60s--][--60s--][--60s--]
```

### Burst Problem
At window boundaries, users can make 200 requests in 1 second:
- 100 requests at 59.9s (end of window 1)
- 100 requests at 60.1s (start of window 2)

## Token Bucket Strategy

### How it Works
- Maintains a bucket of tokens
- Tokens refill at constant rate
- Each request consumes one token
- Allows burst up to bucket capacity

### Characteristics
- ✅ **Flexible**: Allows controlled bursts
- ✅ **Smooth**: Natural rate limiting
- ✅ **Efficient**: O(1) operations
- ⚠️ **Complex**: More parameters to tune

### Best For
- APIs that allow burst traffic
- User-facing applications
- When smooth experience is important

### Example
```typescript
const { makeRequest } = useRateLimiter({
  maxRequests: 100,    // Bucket capacity
  windowMs: 60000,     // Refill period
  strategy: 'token-bucket'
});
```

### Visual Representation
```
Tokens:   100 → 90 → 80 → 85 → 90 → 95 → 100
Time:     0s   1s   2s   3s   4s   5s   6s
Refill:        +5   +5   +5   +5   +5
```

## Strategy Comparison

| Feature | Sliding Window | Fixed Window | Token Bucket |
|---------|---------------|--------------|--------------|
| Accuracy | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Memory | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Performance | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Burst Control | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| Simplicity | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## Choosing the Right Strategy

### Use Sliding Window When:
- Strict rate limit compliance required
- Security is paramount
- Memory usage is acceptable
- Request volume is moderate

### Use Fixed Window When:
- High performance required
- Simple implementation preferred
- Burst traffic is acceptable
- Internal APIs with relaxed limits

### Use Token Bucket When:
- User experience is important
- Burst traffic should be allowed
- Smooth rate limiting desired
- API supports burst patterns

## Configuration Examples

### Conservative (Security-focused)
```typescript
{
  maxRequests: 50,
  windowMs: 60000,
  strategy: 'sliding-window',
  skipFailedRequests: true
}
```

### Balanced (General purpose)
```typescript
{
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'token-bucket'
}
```

### Performance (High throughput)
```typescript
{
  maxRequests: 1000,
  windowMs: 60000,
  strategy: 'fixed-window',
  skipSuccessfulRequests: false
}
```

## Advanced Patterns

### Adaptive Strategy
```typescript
function useAdaptiveRateLimiter(baseConfig) {
  const [strategy, setStrategy] = useState('token-bucket');
  
  const config = {
    ...baseConfig,
    strategy
  };
  
  // Switch strategy based on conditions
  useEffect(() => {
    if (errorRate > 0.1) {
      setStrategy('sliding-window'); // More strict
    } else if (performance.slow) {
      setStrategy('fixed-window');   // Faster
    }
  }, [errorRate, performance]);
  
  return useRateLimiter(config);
}
```

### Hybrid Approach
```typescript
// Use different strategies for different endpoints
const limiters = useMultiRateLimiter({
  auth: { 
    maxRequests: 5, 
    windowMs: 60000, 
    strategy: 'sliding-window' 
  },
  api: { 
    maxRequests: 100, 
    windowMs: 60000, 
    strategy: 'token-bucket' 
  },
  uploads: { 
    maxRequests: 10, 
    windowMs: 60000, 
    strategy: 'fixed-window' 
  }
});
```


Rate Limiting — Deep Understanding with Examples & Scenarios
First: What is Rate Limiting really doing?

At its core, rate limiting answers one question:

“Should this request be allowed right now, based on what happened recently?”

Everything else (sliding window, fixed window, token bucket) is just different ways of defining “recently” and “how much is allowed.”

1️⃣ Sliding Window Strategy (Most Accurate, Most Strict)
🧠 Mental Model

Imagine a security guard with a notebook.

Every time you enter, the guard writes down the exact timestamp

Before letting you in again, the guard:

Erases entries older than 60 seconds

Counts how many entries remain

If count ≥ limit → ❌ deny entry

This guard never forgets exact timing.

🔍 How It Works (Step by Step)

Assume:

maxRequests = 5

windowMs = 60 seconds

Request Time (s)	Stored Timestamps	Allowed?
0	[0]	✅
10	[0,10]	✅
20	[0,10,20]	✅
30	[0,10,20,30]	✅
40	[0,10,20,30,40]	✅
50	[0,10,20,30,40]	❌ (limit reached)
61	[10,20,30,40,61]	✅ (0 expired)

Notice:

Requests expire individually

There is no reset moment

🚫 Why It Prevents Abuse

❌ You cannot cheat by waiting for a window boundary
❌ You cannot burst more than allowed
❌ Timing precision matters

This is why it’s called “most accurate”.

⚠️ Cost of Accuracy

Stores every request timestamp

Cleanup requires scanning timestamps → O(n)

High traffic = more memory & CPU

🛡 Real-World Scenarios

Best use cases:

🔐 Authentication APIs
/login → 5 attempts per minute


Why?

Prevent brute force attacks

Evenly distributed attempts are blocked

💳 Payment APIs
/charge-card → 10 per minute


Why?

Prevent double-spending or fraud

✅ When YOU should use Sliding Window

✔ Security-sensitive
✔ External/public APIs
✔ Abuse prevention
✔ Accuracy > performance

2️⃣ Fixed Window Strategy (Fastest, Simplest)
🧠 Mental Model

Imagine a turnstile with a counter:

Every minute, the counter resets to 0

Each entry increments the counter

When it hits the limit → ❌ block

When the clock hits the next minute → 🧹 reset

🔍 How It Works

Assume:

maxRequests = 5

windowMs = 60s

Time	Window	Counter	Allowed?
0s	0–60	1	✅
10s	0–60	2	✅
50s	0–60	5	✅
59s	0–60	6	❌
60s	60–120	1	✅
🚨 The Burst Problem (Very Important)

User can do this:

59.9s → 100 requests
60.1s → 100 requests


➡ 200 requests in ~0.2 seconds

Yet the system thinks everything is fine 😬

⚡ Why It’s Still Useful

Constant memory (O(1))

Constant time (O(1))

Extremely fast

Easy to reason about

🏭 Real-World Scenarios
🧩 Internal Microservices
Service A → Service B


Why?

Trusted environment

Performance matters more than abuse

📊 Metrics Collection
/metrics → 1000/min


Why?

Bursts are acceptable

Data is aggregated anyway

✅ When YOU should use Fixed Window

✔ Internal APIs
✔ Very high throughput
✔ Simple logic
✔ Bursts are acceptable

3️⃣ Token Bucket Strategy (Best User Experience)
🧠 Mental Model

Imagine a water bucket:

Bucket has a maximum size

Water drips in steadily

Each request scoops out 1 cup

If bucket is empty → ❌ wait

This allows bursts, but only up to capacity.

🔍 How It Works

Assume:

Bucket capacity = 10 tokens

Refill rate = 1 token / second

Time	Tokens	Action	Result
0s	10	5 req	Allowed → 5 left
1s	6	refill	+1 → 6
2s	7	refill	+1
3s	7	3 req	Allowed → 4
4s	4	refill	+1
🎯 Why Users Love This

Short bursts feel instant

Long-term rate stays controlled

No sudden “hard resets”

⚠️ Complexity Tradeoff

You must tune:

Bucket size

Refill rate

Bad tuning = either too strict or too lenient

🧑‍💻 Real-World Scenarios
🌐 Public APIs (GitHub, Stripe, OpenAI)
100 requests/min, burst up to 20

📱 Mobile Apps
User taps refresh multiple times


Why?

Bursts feel natural

No sudden blocking

✅ When YOU should use Token Bucket

✔ User-facing apps
✔ Smooth experience needed
✔ Bursts allowed but controlled

🔥 Real-Life Comparison Scenario
API Limit: 100 requests per minute
User sends requests evenly
Strategy	Result
Sliding Window	✅ Always allowed
Fixed Window	✅ Always allowed
Token Bucket	✅ Always allowed
User sends 100 requests in 2 seconds
Strategy	Result
Sliding Window	❌ Blocked
Fixed Window	✅ Allowed
Token Bucket	✅ Allowed (if capacity ≥ 100)
🧠 Decision Cheat Sheet
Situation	Best Strategy
Login / OTP	Sliding Window
Internal services	Fixed Window
Public REST API	Token Bucket
Financial actions	Sliding Window
UI / Mobile	Token Bucket
🔑 Final Takeaway (Important)

Sliding Window = Security Guard with Memory

Fixed Window = Simple Counter

Token Bucket = Water Bucket

If you remember those three mental models, you will never confuse them again.