# Real-time Sync with Cloudflare Durable Objects

## Overview

OpenCode uses Cloudflare Durable Objects to implement real-time synchronization for AI agent sessions. This architecture enables live collaboration, session sharing, and persistent state across multiple clients.

## Architecture

### Core Components

```
Real-time Sync
├── Durable Object (State Machine)
│   ├── Session State
│   ├── Message History
│   ├── Participant Management
│   └── Event Broadcasting
├── WebSocket Gateway
│   ├── Connection Management
│   ├── Message Routing
│   └── Reconnection Logic
├── Persistence Layer
│   ├── R2 Storage (Object Storage)
│   ├── Periodic Snapshots
│   └── State Restoration
└── API Endpoints
    ├── Share Creation
    ├── Sync Endpoint
    └── Poll/WebSocket
```

### Key Files

- `packages/function/src/api.ts` - Core API and sync logic
- SST configuration for Durable Objects deployment

## Implementation Details

### 1. Durable Object Definition

```typescript
// From packages/function/src/api.ts
export class SessionDurableObject implements DurableObject {
  private state: DurableObjectState
  private env: Env
  private sessions: Map<string, WebSocket>
  private messages: Message[]

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.sessions = new Map()
    this.messages = []

    // Restore from storage
    this.state.blockConcurrencyWhile(async () => {
      const saved = await this.state.storage.get('messages')
      this.messages = saved || []
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    switch (path) {
      case '/websocket':
        return this.handleWebSocket(request)
      case '/sync':
        return this.handleSync(request)
      case '/poll':
        return this.handlePoll(request)
      default:
        return new Response('Not Found', { status: 404 })
    }
  }
}
```

### 2. WebSocket Connection

```typescript
async handleWebSocket(request: Request): Promise<Response> {
  const pair = new WebSocketPair()
  const [client, server] = Object.values(pair)

  const sessionId = crypto.randomUUID()
  this.sessions.set(sessionId, server)

  server.accept()

  // Send current state to new connection
  server.send(JSON.stringify({
    type: 'init',
    messages: this.messages
  }))

  // Handle incoming messages
  server.addEventListener('message', async (event) => {
    const message = JSON.parse(event.data as string)
    await this.handleMessage(sessionId, message)
  })

  // Handle disconnection
  server.addEventListener('close', async () => {
    this.sessions.delete(sessionId)
    await this.broadcast({
      type: 'participant_left',
      sessionId
    })
  })

  return new Response(null, { status: 101, webSocket: client })
}
```

### 3. Message Broadcasting

```typescript
private async broadcast(message: any): Promise<void> {
  const payload = JSON.stringify(message)

  // Send to all connected participants
  for (const [id, ws] of this.sessions) {
    try {
      ws.send(payload)
    } catch (error) {
      // Remove dead connections
      this.sessions.delete(id)
    }
  }

  // Persist message to Durable Object storage
  await this.persistMessage(message)
}

private async persistMessage(message: any): Promise<void> {
  this.messages.push(message)

  // Keep last 1000 messages
  if (this.messages.length > 1000) {
    this.messages = this.messages.slice(-1000)
  }

  await this.state.storage.put('messages', this.messages)

  // Periodically flush to R2 for long-term storage
  if (this.messages.length % 100 === 0) {
    await this.flushToR2()
  }
}
```

### 4. State Persistence

```typescript
private async flushToR2(): Promise<void> {
  const key = `session/${this.state.id}/snapshot.json`
  const snapshot = JSON.stringify({
    messages: this.messages,
    timestamp: Date.now(),
    participants: Array.from(this.sessions.keys())
  })

  await this.env.R2.put(key, snapshot)
}

async restoreFromR2(): Promise<void> {
  const key = `session/${this.state.id}/snapshot.json`
  const snapshot = await this.env.R2.get(key)

  if (snapshot) {
    const data = await snapshot.json()
    this.messages = data.messages || []
    // Restore participants state
  }
}
```

### 5. Share Creation API

```typescript
// API endpoint to create shareable session
export async function handleShareCreate(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json()
  const sessionId = crypto.randomUUID()

  // Create Durable Object stub
  const id = env.SESSION_DO.idFromName(sessionId)
  const stub = env.SESSION_DO.get(id)

  // Generate share URL and secret
  const shareUrl = `https://opencode.ai/share/${sessionId}`
  const secret = crypto.randomUUID()

  // Store metadata in KV
  await env.KV.put(`share:${sessionId}`, JSON.stringify({
    secret,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  }))

  return Response.json({
    shareUrl,
    secret,
    sessionId
  })
}
```

### 6. Sync Endpoint (HTTP)

```typescript
export async function handleSync(
  request: Request,
  env: Env
): Promise<Response> {
  const { sessionId, secret, message } = await request.json()

  // Verify secret
  const shareData = await env.KV.get(`share:${sessionId}`)
  if (!shareData) {
    return Response.json({ error: 'Invalid session' }, { status: 404 })
  }

  const data = JSON.parse(shareData)
  if (data.secret !== secret) {
    return Response.json({ error: 'Invalid secret' }, { status: 403 })
  }

  // Forward to Durable Object
  const id = env.SESSION_DO.idFromName(sessionId)
  const stub = env.SESSION_DO.get(id)

  await stub.fetch(new Request('https://internal/sync', {
    method: 'POST',
    body: JSON.stringify(message)
  }))

  return Response.json({ success: true })
}
```

### 7. Polling Endpoint (Fallback)

```typescript
export async function handlePoll(
  request: Request,
  env: Env
): Promise<Response> {
  const { sessionId, since } = await request.json()

  const id = env.SESSION_DO.idFromName(sessionId)
  const stub = env.SESSION_DO.get(id)

  const response = await stub.fetch(
    new Request(`https://internal/poll?since=${since}`)
  )

  return response
}
```

## SST Configuration

```typescript
// From sst.config.ts
export default {
  config(input) {
    return {
      ...input,
      app: "opencode",
      home: "us-east-1",
    }
  },
  stacks(app) {
    app.stack(function ({ stack }) {
      // Durable Object for session state
      const sessionDO = new DurableObject(stack, "SessionDO")

      // R2 for long-term storage
      const r2 = new Bucket(stack, "SessionStorage")

      // KV for metadata
      const kv = new Bucket(stack, "SessionKV")

      // Worker with WebSocket support
      const api = new Worker(stack, "API", {
        handler: "packages/function/src/api.ts",
        link: [sessionDO, r2, kv],
        permissions: [
          {
            actions: ["secrets:*"],
            effect: "allow"
          }
        ]
      })

      // Domain for sharing
      new Domain(stack, "API", {
        worker: api,
        domain: "opencode.ai"
      })
    })
  }
}
```

## Message Protocol

### Message Types

```typescript
type SyncMessage =
  | { type: 'init'; messages: Message[] }
  | { type: 'message'; role: 'user' | 'assistant'; content: string }
  | { type: 'tool_call'; tool: string; arguments: any }
  | { type: 'tool_result'; tool: string; result: any }
  | { type: 'participant_joined'; sessionId: string }
  | { type: 'participant_left'; sessionId: string }
  | { type: 'status'; status: 'thinking' | 'idle' }
```

### Message Format

```typescript
interface Message {
  id: string
  timestamp: number
  type: 'user' | 'assistant' | 'system' | 'tool'
  role: string
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  metadata?: Record<string, any>
}

interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

interface ToolResult {
  toolCallId: string
  output: string
  error?: string
}
```

## Performance Optimization

### Message Batching

```typescript
class MessageBatcher {
  private batch: Message[] = []
  private timer: NodeJS.Timeout | null = null

  add(message: Message): void {
    this.batch.push(message)

    if (this.timer) {
      clearTimeout(this.timer)
    }

    // Send batch after 100ms or 10 messages
    if (this.batch.length >= 10) {
      this.flush()
    } else {
      this.timer = setTimeout(() => this.flush(), 100)
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return

    await this.broadcast({
      type: 'batch',
      messages: this.batch
    })

    this.batch = []
    this.timer = null
  }
}
```

### Compression

```typescript
async compressMessage(message: any): Promise<string> {
  const json = JSON.stringify(message)
  const compressed = await this.compress(json)
  return compressed
}

async compress(data: string): Promise<string> {
  // Use CompressionStream API
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  await writer.write(new TextEncoder().encode(data))
  await writer.close()

  const compressed = await stream.readable.getReader().read()
  return btoa(String.fromCharCode(...new Uint8Array(compressed.value)))
}
```

## Security Considerations

### Secret Validation

```typescript
async validateSession(sessionId: string, secret: string): Promise<boolean> {
  const shareData = await env.KV.get(`share:${sessionId}`)
  if (!shareData) return false

  const data = JSON.parse(shareData)

  // Check secret
  if (data.secret !== secret) return false

  // Check expiration
  if (Date.now() > data.expiresAt) return false

  return true
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>()

  async check(sessionId: string): Promise<boolean> {
    const now = Date.now()
    const requests = this.requests.get(sessionId) || []

    // Remove requests older than 1 minute
    const recent = requests.filter(t => now - t < 60000)

    if (recent.length > 100) {
      return false // Rate limited
    }

    recent.push(now)
    this.requests.set(sessionId, recent)
    return true
  }
}
```

## Benefits for SuperCoin

### Current Limitations

SuperCoin has:
- No real-time collaboration
- No session sharing
- In-memory only session state
- No multi-device sync

### Opportunities

1. **Live Collaboration**: Multiple users work on same session simultaneously
2. **Session Sharing**: Share sessions via URL
3. **Cross-Device Sync**: Continue session on different device
4. **Persistent State**: Survive CLI restarts
5. **Replay**: Watch previous agent sessions

### Implementation Path

1. **Phase 1**: Research stateful server options (Durable Objects, Supabase Realtime, etc.)
2. **Phase 2**: Design message protocol for session sync
3. **Phase 3**: Implement basic session storage (SQLite or cloud)
4. **Phase 4**: Add session export/import functionality
5. **Phase 5**: Implement real-time WebSocket sync
6. **Phase 6**: Add session sharing capabilities
7. **Phase 7**: Implement multi-device sync

### Alternative Solutions

Since Cloudflare Durable Objects require Cloudflare Workers deployment, SuperCoin could use:

1. **Supabase Realtime**: Open source, easy setup
2. **Firebase Realtime Database**: Free tier available
3. **Pusher**: Managed WebSocket service
4. **Local SQLite**: Simple, offline-first
5. **Self-hosted WebSocket Server**: Node.js + ws

## Technical Specifications

### Performance Metrics

- **WebSocket Connection**: <100ms
- **Message Delivery**: <50ms (same region)
- **State Persistence**: 100-500ms
- **Reconnection Time**: 1-3s (with exponential backoff)

### Memory Footprint

- **Durable Object**: ~10-50MB (depends on session size)
- **Per Connection**: ~1-5MB
- **Message History**: ~1KB per message

### Scaling Capabilities

- **Max Concurrent Connections**: 100-1000 (per DO)
- **Message Throughput**: 10K+ messages/second
- **Storage**: Unlimited (via R2)

## Testing Strategy

### Unit Tests

```typescript
describe('SessionDurableObject', () => {
  it('should handle WebSocket connection', async () => {
    const request = new Request('ws://localhost/websocket')
    const response = await do.fetch(request)
    expect(response.status).toBe(101)
  })

  it('should broadcast messages', async () => {
    const ws1 = connectToWS(sessionId)
    const ws2 = connectToWS(sessionId)

    const messagePromise = waitForMessage(ws2)
    ws1.send({ type: 'message', content: 'Hello' })

    const message = await messagePromise
    expect(message.content).toBe('Hello')
  })
})
```

### Integration Tests

```typescript
describe('Real-time Sync', () => {
  it('should sync multiple clients', async () => {
    const clients = [connectToWS(sessionId), connectToWS(sessionId), connectToWS(sessionId)]

    clients[0].send({ type: 'message', content: 'Test' })

    await Promise.all(clients.map(c =>
      c.waitForMessage(m => m.content === 'Test')
    ))

    expect(clients.every(c => c.lastMessage.content === 'Test')).toBe(true)
  })
})
```

## References

- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [SST Ion](https://ion.sst.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)

---

**Status**: ✅ Benchmarked from opencode v0.1.x
**Complexity**: Very High (requires Cloudflare deployment)
**Priority**: Medium (nice-to-have for collaboration)
**Estimated Effort**: 4-6 weeks for full implementation
**Alternative**: SQLite + local WebSocket server (2-3 weeks)
