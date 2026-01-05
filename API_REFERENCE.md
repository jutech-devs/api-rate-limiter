# API Reference

Complete API documentation for `@jutech-devs/api-rate-limiter`.

## Core Classes

### RateLimiter

Main rate limiting class for vanilla JavaScript usage.

```typescript
class RateLimiter {
  constructor(config: Partial<RateLimiterConfig>, callbacks?: RateLimiterCallbacks)
  
  makeRequest<T>(requestFn: () => Promise<T>): Promise<T>
  canMakeRequest(): boolean
  getState(): RateLimiterState
  reset(): void
  getWaitTime(): number
  updateConfig(newConfig: Partial<RateLimiterConfig>): void
}
```

#### Methods

- **`makeRequest(requestFn)`** - Execute a request with rate limiting
- **`canMakeRequest()`** - Check if request can be made
- **`getState()`** - Get current rate limiter state
- **`reset()`** - Reset the rate limiter
- **`getWaitTime()`** - Get milliseconds to wait before next request
- **`updateConfig(config)`** - Update configuration

### RateLimitError

Custom error thrown when rate limit is exceeded.

```typescript
class RateLimitError extends Error {
  retryAfter: number; // Milliseconds to wait
}
```

## React Hooks

### useRateLimiter

Basic rate limiting hook.

```typescript
function useRateLimiter(
  config: Partial<RateLimiterConfig>,
  callbacks?: RateLimiterCallbacks
): UseRateLimiterReturn
```

**Returns:**
```typescript
interface UseRateLimiterReturn {
  state: RateLimiterState;
  canMakeRequest: () => boolean;
  makeRequest: <T>(requestFn: () => Promise<T>) => Promise<T>;
  reset: () => void;
  getWaitTime: () => number;
  updateConfig: (config: Partial<RateLimiterConfig>) => void;
}
```

### useRateLimitedAPI

API requests with automatic retry logic.

```typescript
function useRateLimitedAPI(config: Partial<RateLimiterConfig>): {
  makeAPIRequest: <T>(
    requestFn: () => Promise<T>,
    options?: RetryOptions
  ) => Promise<T>;
  cancelRequest: (requestId: string) => void;
  cancelAllRequests: () => void;
  state: RateLimiterState;
  canMakeRequest: () => boolean;
}
```

**Retry Options:**
```typescript
interface RetryOptions {
  maxRetries?: number;        // Default: 3
  retryDelay?: number;        // Default: 1000ms
  exponentialBackoff?: boolean; // Default: true
  requestId?: string;         // Auto-generated if not provided
}
```

### useBatchRateLimiter

Queue and process requests in batches.

```typescript
function useBatchRateLimiter(config: Partial<RateLimiterConfig>): {
  addToQueue: <T>(requestFn: () => Promise<T>) => Promise<T>;
  clearQueue: () => void;
  queueLength: number;
  state: RateLimiterState;
}
```

### useMultiRateLimiter

Manage multiple rate limiters for different APIs.

```typescript
function useMultiRateLimiter(
  configs: Record<string, Partial<RateLimiterConfig>>
): {
  makeRequest: <T>(apiName: string, requestFn: () => Promise<T>) => Promise<T>;
  getState: (apiName: string) => RateLimiterState | undefined;
  getAllStates: () => Record<string, RateLimiterState>;
  limiters: Record<string, UseRateLimiterReturn>;
}
```

## Configuration

### RateLimiterConfig

```typescript
interface RateLimiterConfig {
  maxRequests: number;                    // Max requests per window
  windowMs: number;                       // Window duration in ms
  strategy: 'sliding-window' | 'fixed-window' | 'token-bucket';
  retryAfter?: number;                    // Default retry delay
  skipSuccessfulRequests?: boolean;       // Don't count successful requests
  skipFailedRequests?: boolean;           // Don't count failed requests
}
```

### RateLimiterState

```typescript
interface RateLimiterState {
  remaining: number;      // Requests remaining in window
  resetTime: number;      // When window resets (timestamp)
  isLimited: boolean;     // Currently rate limited
  retryAfter: number;     // Ms to wait before retry
  totalRequests: number;  // Total requests in current window
}
```

### RateLimiterCallbacks

```typescript
interface RateLimiterCallbacks {
  onRateLimit?: (retryAfter: number) => void;
  onReset?: () => void;
  onRequest?: (remaining: number) => void;
}
```

## Strategies

### SlidingWindowStrategy
- Tracks exact request timestamps
- Most accurate rate limiting
- Higher memory usage

### FixedWindowStrategy  
- Simple counter with fixed reset intervals
- Memory efficient
- Allows burst requests at window boundaries

### TokenBucketStrategy
- Allows controlled burst requests
- Tokens refill at constant rate
- Smooth rate limiting

## Error Handling

```typescript
try {
  await makeRequest(() => fetch('/api/data'));
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}ms`);
  } else {
    console.error('Other error:', error);
  }
}
```


API Reference — Deep Explanation & Practical Understanding
Big Picture First 🧠

This library gives you three layers of control:

Core engine → RateLimiter (vanilla JS, logic-only)

React hooks → useRateLimiter, useRateLimitedAPI, etc.

Advanced patterns → batching, retries, multiple APIs

Think of it like this:

RateLimiter (engine)
   ↑
React hooks (UX & lifecycle)
   ↑
Your app (buttons, APIs, workflows)

1️⃣ Core Class: RateLimiter
What it is

The heart of the system.

No React

No UI

Just pure logic

Use it when:

You’re not in React

You want full control

You’re writing libraries, scripts, or services

Constructor
new RateLimiter(config, callbacks?)

config

Controls how limiting works

callbacks (optional)

Hooks into lifecycle events (observability)

makeRequest<T>(requestFn)
makeRequest(() => fetch(...))

What it does internally

Checks current state

If allowed → executes requestFn

If not allowed → throws RateLimitError

Why this pattern matters

It prevents the request from even starting.

❌ No network call
❌ No CPU wasted
❌ No server hit

Real Scenario
// Expensive AI API call
limiter.makeRequest(() => callOpenAI())


✔ Stops accidental loops
✔ Stops button spam
✔ Saves money

canMakeRequest()
if (limiter.canMakeRequest()) {
  // safe to call
}

When to use it

Disable UI buttons

Pre-check without throwing errors

Conditional logic

UI Example
<button disabled={!limiter.canMakeRequest()}>
  Send
</button>

getState()
const state = limiter.getState();


Returns everything the limiter knows right now.

Think of it as:

“Dashboard snapshot”

Useful for:

Debugging

Logs

Analytics

UI rendering

reset()
limiter.reset();

What it does

Clears counters

Clears timestamps

Restarts fresh

When to use

User logs out

App switches account

Manual override

⚠️ Be careful: resetting defeats rate limiting if misused.

getWaitTime()
const ms = limiter.getWaitTime();


Returns:

“How long until next request is allowed?”

This is strategy-aware:

Sliding window → exact timing

Fixed window → until reset

Token bucket → until token refill

updateConfig(newConfig)
limiter.updateConfig({ maxRequests: 200 });

Why this is powerful

You can adapt limits dynamically.

Example
if (user.isPremium) {
  limiter.updateConfig({ maxRequests: 500 });
}

2️⃣ RateLimitError
class RateLimitError extends Error {
  retryAfter: number;
}


This is not a normal error.
It’s a signal.

Why retryAfter matters
catch (err) {
  setTimeout(retry, err.retryAfter);
}


✔ Enables smart retries
✔ Avoids guesswork
✔ Works with automation

This mirrors HTTP 429 Retry-After, which is a very good design choice.

3️⃣ React Hook: useRateLimiter
What it is

A React-friendly wrapper around RateLimiter.

It:

Manages state

Triggers re-renders

Handles lifecycle (mount/unmount)

Returned API
{
  state,
  canMakeRequest,
  makeRequest,
  reset,
  getWaitTime,
  updateConfig
}


👉 Same power as RateLimiter, but React-aware

React Scenario
<button disabled={state.isLimited}>
  Retry in {state.retryAfter / 1000}s
</button>


✔ Clean UX
✔ No manual polling
✔ State-driven UI

4️⃣ useRateLimitedAPI (Automatic Retry)
What problem does this solve?

Manual retry logic is:

Repetitive

Error-prone

Ugly

This hook:
✔ Adds retries
✔ Handles backoff
✔ Tracks request IDs

makeAPIRequest()
makeAPIRequest(requestFn, options?)

RetryOptions Explained
Option	Meaning
maxRetries	How many attempts
retryDelay	Initial delay
exponentialBackoff	Delay doubles each retry
requestId	Cancel/control specific request
Real Scenario: Unstable Network
makeAPIRequest(fetchData, {
  maxRetries: 5,
  exponentialBackoff: true
});


✔ First retry: 1s
✔ Second: 2s
✔ Third: 4s
✔ Prevents API flooding

Cancellation (Very Important)
cancelRequest(requestId);
cancelAllRequests();


Perfect for:

Component unmount

User navigation

Abort stale requests

5️⃣ useBatchRateLimiter
What it does

Instead of rejecting requests, it queues them.

“Wait your turn.”

Example Scenario
User uploads 20 images
API allows only 5/min


Without batching → ❌ errors
With batching → ✅ queued + processed

API
addToQueue(() => uploadFile())


Requests are:

Ordered

Rate-limited

Automatically executed

This is gold for bulk operations.

6️⃣ useMultiRateLimiter
Why this exists

Different APIs ≠ same limits.

Example
const limiters = {
  auth: { maxRequests: 5, windowMs: 60000 },
  api: { maxRequests: 100, windowMs: 60000 },
  uploads: { maxRequests: 10, windowMs: 60000 }
};


Each API:

Has its own limiter

Has its own state

Can use different strategies

Real App Scenario
Endpoint	Strategy
/login	Sliding Window
/search	Token Bucket
/upload	Fixed Window

This is professional-grade design.

7️⃣ Configuration — Explained Clearly
RateLimiterConfig
{
  maxRequests,
  windowMs,
  strategy,
  skipSuccessfulRequests,
  skipFailedRequests
}

Skip flags explained

skipSuccessfulRequests

Useful when success = cached

skipFailedRequests

Useful for login attempts

Example:

// Only count failed logins
skipSuccessfulRequests: true

8️⃣ RateLimiterState

This is your truth source.

Field	Meaning
remaining	How many left
resetTime	Exact reset moment
isLimited	Hard stop
retryAfter	Smart retry
totalRequests	Analytics/debug
9️⃣ Callbacks (Observability Hooks)
onRateLimit(retryAfter)
onReset()
onRequest(remaining)

Use cases

Logging

Telemetry

User notifications

Example:

onRateLimit(ms) {
  toast(`Try again in ${ms / 1000}s`);
}

10️⃣ Error Handling Pattern (Best Practice)
try {
  await makeRequest(...)
} catch (err) {
  if (err instanceof RateLimitError) {
    // expected, controlled
  } else {
    // real error
  }
}


This separation is very important.

🧠 Final Mental Model (Remember This)

RateLimiter → Engine

Hooks → UX integration

Strategies → Behavior

State → Truth

Errors → Signals, not failures