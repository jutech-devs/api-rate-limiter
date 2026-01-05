# Quick Start Guide

Get up and running with `@jutech-devs/api-rate-limiter` in under 5 minutes.

## Installation

```bash
npm install @jutech-devs/api-rate-limiter
```

## Basic Usage

### 1. Simple Rate Limiting

```tsx
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';

function MyComponent() {
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  });

  const handleClick = async () => {
    try {
      const data = await makeRequest(() => 
        fetch('/api/data').then(res => res.json())
      );
      console.log(data);
    } catch (error) {
      console.log('Rate limited!');
    }
  };

  return (
    <div>
      <button onClick={handleClick}>
        Make Request ({state.remaining} left)
      </button>
    </div>
  );
}
```

### 2. Vanilla JavaScript

```javascript
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000
});

async function apiCall() {
  try {
    return await limiter.makeRequest(() => 
      fetch('/api/endpoint').then(res => res.json())
    );
  } catch (error) {
    console.log(`Wait ${error.retryAfter}ms`);
  }
}
```

## Next Steps

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Strategies Guide](./STRATEGIES.md) - Rate limiting algorithms
- [Examples](./EXAMPLES.md) - Real-world usage examples

Quick Start Guide — Explained in Depth

This guide shows how to protect API calls on the client side using
@jutech-devs/api-rate-limiter.

⚠️ Important context
This library does NOT block requests on the server.
It controls how often your app tries to call an API.

Think of it as a traffic controller inside your app, not a firewall.

1️⃣ Installation
npm install @jutech-devs/api-rate-limiter

What this does

Adds the rate limiter to your project

Works in:

React / Next.js

Vanilla JavaScript

Any frontend or Node environment

2️⃣ Basic Usage — React Example
Code (given)
import { useRateLimiter } from '@jutech-devs/api-rate-limiter';

function MyComponent() {
  const { makeRequest, state } = useRateLimiter({
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  });

  const handleClick = async () => {
    try {
      const data = await makeRequest(() => 
        fetch('/api/data').then(res => res.json())
      );
      console.log(data);
    } catch (error) {
      console.log('Rate limited!');
    }
  };

  return (
    <div>
      <button onClick={handleClick}>
        Make Request ({state.remaining} left)
      </button>
    </div>
  );
}

🧠 What useRateLimiter Really Does
const { makeRequest, state } = useRateLimiter(...)


This hook creates a local rate-limiting controller with:

makeRequest(fn) → wraps your API call

state → real-time info about limits

Internally:

Tracks timestamps or counters (based on strategy)

Decides:

“Can this request go through right now?”

🔢 Configuration Explained
{
  maxRequests: 10,
  windowMs: 60000
}


This means:

Only 10 requests are allowed every 60 seconds

Timeline example
Time	Action	Result
0s	Click button	✅
5s	Click button	✅
…	…	…
40s	10th click	✅
41s	11th click	❌ Rate limited
60s	Window refresh	✅
🧪 makeRequest() — The Key Concept
await makeRequest(() =>
  fetch('/api/data').then(res => res.json())
);

Why wrap the request?

Because the rate limiter needs to:

Check if request is allowed

Execute the function only if allowed

Reject if limit exceeded

Think of it like this:
if (canMakeRequest()) {
  return apiCall();
} else {
  throw RateLimitError;
}

❌ When Rate Limit Is Hit
catch (error) {
  console.log('Rate limited!');
}


The API call is never executed

No network request is sent

You stay in control of UX

You can:

Disable button

Show toast

Retry later

📊 state Object (Very Important)
state.remaining


This tells you:

“How many requests are still allowed in this window?”

Typical state fields

(Exact fields may vary by version)

Field	Meaning
remaining	Requests left
limit	Max allowed
resetTime	When limit resets
isLimited	Boolean
UX example
<button disabled={state.remaining === 0}>
  Retry in {state.retryAfter}s
</button>

3️⃣ Vanilla JavaScript Example (No React)
Code
import { RateLimiter } from '@jutech-devs/api-rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000
});

async function apiCall() {
  try {
    return await limiter.makeRequest(() => 
      fetch('/api/endpoint').then(res => res.json())
    );
  } catch (error) {
    console.log(`Wait ${error.retryAfter}ms`);
  }
}

🧠 What Changed from React?
React	Vanilla
useRateLimiter()	new RateLimiter()
Auto state updates	Manual control
UI-friendly	Logic-only
Use Vanilla when:

Writing SDKs

Node.js scripts

Background jobs

Non-React apps

⏱ error.retryAfter
error.retryAfter


This tells you exactly how long to wait before retrying.

Example retry logic
catch (err) {
  setTimeout(apiCall, err.retryAfter);
}


This is huge for automation and background tasks.

🎯 Real-World Scenarios
1️⃣ Prevent Button Spamming (Frontend)
Submit form → clicked 20 times


✔ Only first 5 go through
✔ Others are blocked locally
✔ Server stays safe

2️⃣ Protect Expensive APIs
AI / ML / payment / reports


✔ User can’t spam
✔ Cost is controlled
✔ UX stays smooth

3️⃣ Offline / Slow Networks (Mobile)
User taps retry repeatedly


✔ Bursts are absorbed
✔ No API flooding

⚠️ Important Limitation (Must Understand)

❌ This does NOT replace server-side rate limiting

Why?

User can refresh browser

User can open another device

State resets per client

Best practice:

✅ Use this library + server rate limiting

🚀 Next Logical Steps (Recommended)

Choose a strategy

sliding-window → security

token-bucket → UX

fixed-window → performance

Add server protection

Redis / Upstash

API Gateway

Edge middleware

Create per-endpoint rules

/login → strict

/search → relaxed

🧠 Final Mental Model

This library is a smart traffic light inside your app

Green → request allowed

Yellow → wait

Red → blocked (no API call)