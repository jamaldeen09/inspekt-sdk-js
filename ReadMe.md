# inspekt-sdk-js

Official JavaScript/TypeScript SDK for [Inspekt](LINK_COMING_SOON) drop-in middleware that silently monitors your API responses and surfaces AI-powered diagnostics directly in your terminal.

No dashboards to open. No manual debugging. Just run your server and Inspekt tells you what's wrong and why.

**Supports:** Express · NestJS · Fastify

---

## How It Works

Inspekt hooks into your server's response lifecycle. When an error occurs (4xx or 5xx) **This action occurs by default you can always change it**, the SDK securely transmits the request and response metadata to the Inspekt API. Our engine analyzes the context in real-time and streams a structured diagnosis directly back to your terminal.

Your users never feel it. You never miss an error.

---

## Installation

```bash
npm install inspekt-sdk-js
```

**Note**: For NestJS or Fastify support, ensure you have @nestjs/common or fastify installed in your project.
---

## Quick Start

Get your API key from your [Inspekt Dashboard](LINK_COMING_SOON).

### Express

```typescript
import express from 'express';
import { Inspekt } from "inspekt-sdk-js"
import inspektExpress from "insekt-sdk-js/adapters/express.js"

const app = express();

const inspekt = new Inspekt({
    apiKey: 'ins_live_your_key_here',
    analysisMode: 'errors', // only analyze 4xx and 5xx responses
});

// Add as global middleware — place it early
app.use(inspektExpress(inspekt));

app.get('/users/:id', (req, res) => {
    res.status(404).json({ error: 'User not found' });
});

app.listen(3000);
```

### NestJS

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Inspekt } from "inspekt-sdk-js"
import InspektInterceptor  from "insekt-sdk-js/adapters/nest.js"

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const inspekt = new Inspekt({
        apiKey: 'ins_live_your_key_here',
        analysisMode: 'errors',
    });

    // Apply globally as an interceptor
    app.useGlobalInterceptors(new InspektInterceptor(inspekt));

    await app.listen(3000);
}
bootstrap();
```

### Fastify

```typescript
import Fastify from 'fastify';
import { Inspekt } from "inspekt-sdk-js"
import inspektFastify  from "insekt-sdk-js/adapters/fastify.js"

const fastify = Fastify();

const inspekt = new Inspekt({
    apiKey: 'ins_live_your_key_here',
    analysisMode: 'errors',
});

// Register as a Fastify plugin
fastify.register(inspektFastify(inspekt));

fastify.get('/orders/:id', async (request, reply) => {
    reply.status(500).send({ error: 'Database connection failed' });
});

fastify.listen({ port: 3000 });
```

---

## Configuration

```typescript
const inspekt = new Inspekt({
    apiKey: 'ins_live_your_key_here', // Required
    analysisMode: 'errors',           // Optional — default: 'errors'
    redactKeys: ['x-internal-token'], // Optional — keys to redact
    env: 'production',                // Optional — default: NODE_ENV
    terminalOutput: true,             // Optional — default: true
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | **Required.** Your Inspekt API key. Must start with `ins_live_` |
| `analysisMode` | `'errors' \| 'always' \| 'never'` | `'errors'` | Controls when AI analysis runs. `errors` = 4xx/5xx only. `always` = every request (expensive). `never` = disable analysis |
| `redactKeys` | `string[]` | `['authorization']` | Header/body keys to redact before sending to AI. Sensitive keys are replaced with `[REDACTED]` |
| `env` | `string` | `process.env.NODE_ENV` | Environment label shown in logs e.g. `'production'`, `'staging'` |
| `terminalOutput` | `boolean` | `true` | Toggle terminal output on or off |

---

## Terminal Output

When Inspekt detects an error worth analyzing, it logs a structured diagnosis directly to your terminal:

```
 POST /api/payments  14:23:01

INSPEKT ───────────────────────────────────────── WARNING

POST to /api/payments returned 402 Payment Required — Stripe rejected the charge.
402 · Payment Required

Diagnosis
  The card was declined due to insufficient funds. Stripe returned a structured
  error object in the body with a decline_code of insufficient_funds.

Issues
  · Card declined at payment processor level
  · No retry logic detected in response headers

Security & Headers
  · MISSING Content-Security-Policy
  · MISSING X-Frame-Options

Fixes
  · Surface the decline_code to the user with a friendly message
  · Implement retry logic with exponential backoff for soft declines

─────────────────────────────────────────────────────────
```

Severity is color-coded:
- 🟢 `OK` — green
- 🟡 `WARNING` — yellow
- 🔴 `CRITICAL` — red

---

## Analysis Modes

```typescript
// Only analyze failed requests (recommended for production)
analysisMode: 'errors'

// Analyze every single request — useful for deep debugging sessions
analysisMode: 'always'

// Disable AI analysis but keep the SDK in place for future use
analysisMode: 'never'
```

---

## Sensitive Data Redaction

Inspekt automatically redacts `authorization`, `cookie`, and `set-cookie` headers before sending anything to the AI engine. You can extend this list:

```typescript
const inspekt = new Inspekt({
    apiKey: 'ins_live_your_key_here',
    redactKeys: [
        'x-api-secret',
        'x-internal-token',
        'stripe-signature',
    ],
});
```

Redacted values appear as `[REDACTED]` in the AI analysis — your secrets never leave your server.

---

## API Key Format

All Inspekt API keys follow this format:

```
ins_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Keys that don't match this format will throw immediately on initialization — no silent failures.

```typescript
// Throws: [Inspekt] Invalid API Key format. Keys should start with "ins_live_"
const inspekt = new Inspekt({ apiKey: 'wrong_key' });
```

Get your key at [inspekt.app](LINK_COMING_SOON).

---

## Error States

| Console Message | Cause |
|----------------|-------|
| `[Inspekt] API Key is missing` | No key provided in constructor |
| `[Inspekt] Invalid API Key format` | Key doesn't start with `ins_live_` |
| `[Inspekt] API Key seems too short/long` | Key length doesn't match expected format |
| `[Inspekt] Connection Timeout` | Inspekt API unreachable — check status.inspekt.app |
| `[Inspekt] Analysis skipped` | Server accepted request but returned no analysis e.g. out of credits |
| `[Inspekt] Analysis Failed` | API returned an error — message includes status code |

---

## Roadmap

- [x] Express support
- [x] NestJS support
- [x] Fastify support
- [ ] Dashboard log viewer
- [ ] Python SDK (`inspekt-py`)
- [ ] Webhook alerts for critical errors

---

## License

MIT © [Olatunji Jamaldeen](https://github.com/jamaldeen09/inspekt-sdk-js)