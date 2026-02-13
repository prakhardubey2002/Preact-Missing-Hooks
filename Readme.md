# Preact Missing Hooks

<p align="left">
  <a href="https://www.npmjs.com/package/preact-missing-hooks">
    <img src="https://img.shields.io/npm/v/preact-missing-hooks?color=crimson&label=npm%20version" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/preact-missing-hooks">
    <img src="https://img.shields.io/npm/dt/preact-missing-hooks?label=total%20downloads" alt="total downloads" />
  </a>

  <a href="https://github.com/prakhardubey2002/preact-missing-hooks/actions/workflows/test-hooks.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/prakhardubey2002/preact-missing-hooks/test-hooks.yml?branch=main&label=build%20status" alt="Build Status" />
  </a>
</p>

If this package helps you, please consider dropping a star on the [GitHub repo](https://github.com/prakhardubey2002/Preact-Missing-Hooks).

A lightweight, extendable collection of React-like hooks for Preact, including utilities for transitions, DOM mutation observation, global event buses, theme detection, network status, clipboard access, rage-click detection (e.g. for Sentry), a priority task queue (sequential or parallel), a production-ready **IndexedDB** hook with tables, transactions, and a full CRUD API, and **WebRTC-based IP detection** (`useWebRTCIP`) for frontend-only IP hints.

---

## Features

- **`useTransition`** — Defers state updates to yield a smoother UI experience.
- **`useMutationObserver`** — Reactively observes DOM changes with a familiar hook API.
- **`useEventBus`** — A simple publish/subscribe system, eliminating props drilling or overuse of context.
- **`useWrappedChildren`** — Injects props into child components with flexible merging strategies.
- **`usePreferredTheme`** — Detects the user's preferred color scheme (light/dark) from system preferences.
- **`useNetworkState`** — Tracks online/offline status and connection details (type, downlink, RTT, save-data).
- **`useClipboard`** — Copy and paste text with the Clipboard API, with copied/error state.
- **`useRageClick`** — Detects rage clicks (repeated rapid clicks in the same spot). Use with Sentry or similar to detect and fix rage-click issues and lower rage-click-related support.
- **`useThreadedWorker`** — Run async work in a queue with **sequential** (single worker, priority-ordered) or **parallel** (worker pool) mode. Optional priority (1 = highest); FIFO within same priority.
- **`useIndexedDB`** — IndexedDB abstraction with database/table init, insert, update, delete, exists, query (cursor + filter), upsert, bulk insert, clear, count, and full transaction support. Singleton connection, Promise-based API, optional `onSuccess`/`onError` callbacks.
- **`useWebRTCIP`** — Detects client IP addresses using WebRTC ICE candidates and a STUN server (frontend-only). **Not highly reliable**; use as a first-priority hint and fall back to a public IP API (e.g. [ipapi.co](https://ipapi.co), [ipify](https://www.ipify.org), [ip-api.com](https://ip-api.com)) when it fails or returns empty.
- **`useWasmCompute`** — Runs WebAssembly computation off the main thread via a Web Worker. Validates environment (browser, Worker, WebAssembly) and returns `compute(input)`, `result`, `loading`, `error`, `ready`.
- **`useWorkerNotifications`** — Listens to a Worker's messages and maintains state: running tasks, completed/failed counts, event history, average task duration, throughput per second, and queue size. Worker posts `task_start` / `task_end` / `task_fail` / `queue_size`; returns `progress` (default view of all active worker data) plus individual stats.
- Fully TypeScript compatible
- Bundled with Microbundle
- Zero dependencies (except `preact`)

---

## Installation

```bash
npm install preact-missing-hooks
```

---

## Import options

- **Main package** — Import from the package root:
  ```ts
  import { useThreadedWorker, useClipboard } from 'preact-missing-hooks'
  ```
- **Subpath exports (tree-shakeable)** — Import a single hook:
  ```ts
  import { useThreadedWorker } from 'preact-missing-hooks/useThreadedWorker'
  import { useClipboard } from 'preact-missing-hooks/useClipboard'
  import { useWebRTCIP } from 'preact-missing-hooks/useWebRTCIP'
  import { useWasmCompute } from 'preact-missing-hooks/useWasmCompute'
  import { useWorkerNotifications } from 'preact-missing-hooks/useWorkerNotifications'
  ```
  All hooks are available: `useTransition`, `useMutationObserver`, `useEventBus`, `useWrappedChildren`, `usePreferredTheme`, `useNetworkState`, `useClipboard`, `useRageClick`, `useThreadedWorker`, `useIndexedDB`, `useWebRTCIP`, `useWasmCompute`, `useWorkerNotifications`.

---

## Usage Examples

### `useTransition`

```tsx
import { useTransition } from 'preact-missing-hooks'

function ExampleTransition() {
  const [startTransition, isPending] = useTransition()

  const handleClick = () => {
    startTransition(() => {
      // perform an expensive update here
    })
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Loading...' : 'Click Me'}
    </button>
  )
}
```

---

### `useMutationObserver`

```tsx
import { useRef } from 'preact/hooks'
import { useMutationObserver } from 'preact-missing-hooks'

function ExampleMutation() {
  const ref = useRef<HTMLDivElement>(null)

  useMutationObserver(
    ref,
    (mutations) => {
      console.log('Detected mutations:', mutations)
    },
    { childList: true, subtree: true },
  )

  return <div ref={ref}>Observe this content</div>
}
```

---

### `useEventBus`

```tsx
// types.ts
export type Events = {
  notify: (message: string) => void
}

// Sender.tsx
import { useEventBus } from 'preact-missing-hooks'
import type { Events } from './types'

function Sender() {
  const { emit } = useEventBus<Events>()
  return <button onClick={() => emit('notify', 'Hello World!')}>Send</button>
}

// Receiver.tsx
import { useEventBus } from 'preact-missing-hooks'
import { useState, useEffect } from 'preact/hooks'
import type { Events } from './types'

function Receiver() {
  const [msg, setMsg] = useState<string>('')
  const { on } = useEventBus<Events>()

  useEffect(() => {
    const unsubscribe = on('notify', setMsg)
    return unsubscribe
  }, [])

  return <div>Message: {msg}</div>
}
```

---

### `useWrappedChildren`

```tsx
import { useWrappedChildren } from 'preact-missing-hooks'

function ParentComponent({ children }) {
  // Inject common props into all children
  const injectProps = {
    className: 'enhanced-child',
    onClick: () => console.log('Child clicked!'),
    style: { border: '1px solid #ccc' },
  }

  const wrappedChildren = useWrappedChildren(children, injectProps)

  return <div className="parent">{wrappedChildren}</div>
}

// Usage with preserve strategy (default - existing props are preserved)
function PreserveExample() {
  return (
    <ParentComponent>
      <button className="btn">Existing class preserved</button>
      <span style={{ color: 'red' }}>Both styles applied</span>
    </ParentComponent>
  )
}

// Usage with override strategy (injected props override existing ones)
function OverrideExample() {
  const injectProps = { className: 'new-class' }
  const children = (
    <button className="old-class">Class will be overridden</button>
  )

  const wrappedChildren = useWrappedChildren(children, injectProps, 'override')

  return <div>{wrappedChildren}</div>
}
```

---

### `usePreferredTheme`

```tsx
import { usePreferredTheme } from 'preact-missing-hooks'

function ThemeAwareComponent() {
  const theme = usePreferredTheme() // 'light' | 'dark' | 'no-preference'

  return <div data-theme={theme}>Your system prefers: {theme}</div>
}
```

---

### `useNetworkState`

```tsx
import { useNetworkState } from 'preact-missing-hooks'

function NetworkStatus() {
  const { online, effectiveType, saveData } = useNetworkState()

  return (
    <div>
      Status: {online ? 'Online' : 'Offline'}
      {effectiveType && ` (${effectiveType})`}
      {saveData && ' — Reduced data mode enabled'}
    </div>
  )
}
```

---

### `useClipboard`

```tsx
import { useState } from 'preact/hooks'
import { useClipboard } from 'preact-missing-hooks'

function CopyButton() {
  const { copy, copied, error } = useClipboard({ resetDelay: 2000 })

  return (
    <button onClick={() => copy('Hello, World!')}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function PasteInput() {
  const [text, setText] = useState('')
  const { paste } = useClipboard()

  const handlePaste = async () => {
    const content = await paste()
    setText(content)
  }

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={handlePaste}>Paste</button>
    </div>
  )
}
```

---

### `useRageClick`

Detects rage clicks (multiple rapid clicks in the same area), e.g. when the UI is unresponsive. Report them to [Sentry](https://docs.sentry.io/product/issues/issue-details/replay-issues/rage-clicks/) or your error tracker to surface rage-click issues and lower rage-click-related support.

```tsx
import { useRef } from 'preact/hooks'
import { useRageClick } from 'preact-missing-hooks'

function SubmitButton() {
  const ref = useRef<HTMLButtonElement>(null)

  useRageClick(ref, {
    onRageClick: ({ count, event }) => {
      // Report to Sentry (or your error tracker) to create rage-click issues
      Sentry.captureMessage('Rage click detected', {
        level: 'warning',
        extra: { count, target: event.target, tag: 'rage_click' },
      })
    },
    threshold: 5, // min clicks (default 5, Sentry-style)
    timeWindow: 1000, // ms (default 1000)
    distanceThreshold: 30, // px (default 30)
  })

  return <button ref={ref}>Submit</button>
}
```

---

### `useThreadedWorker`

Runs async work in a queue with **sequential** (one task at a time, by priority) or **parallel** (worker pool) execution. Lower priority number = higher priority; same priority is FIFO.

```tsx
import { useThreadedWorker } from 'preact-missing-hooks'

// Sequential: one task at a time, sorted by priority
const sequential = useThreadedWorker(fetchUser, { mode: 'sequential' })

// Parallel: up to N tasks at once
const parallel = useThreadedWorker(processItem, {
  mode: 'parallel',
  concurrency: 4,
})

// API (same for both modes)
const {
  run, // (data, { priority?: number }) => Promise<TResult>
  loading, // true while any task is queued or running
  result, // last successful result
  error, // last error
  queueSize, // tasks queued + running
  clearQueue, // clear pending tasks (running continue)
  terminate, // clear queue and reject new run()
} = sequential

// Run with priority (1 = highest)
await run({ userId: 1 }, { priority: 1 })
await run({ userId: 2 }, { priority: 3 })
```

---

### `useIndexedDB`

Production-ready IndexedDB hook: database initialization, table creation (with keyPath, autoIncrement, indexes), singleton connection, and a full table API. All operations are Promise-based and support optional `onSuccess`/`onError` callbacks.

**Config:** `name`, `version`, and `tables` (each table: `keyPath`, `autoIncrement?`, `indexes?`).

**Table API:** `insert`, `update`, `delete`, `exists`, `query(filterFn)`, `upsert`, `bulkInsert`, `clear`, `count`.

**Database API:** `db.table(name)`, `db.hasTable(name)`, `db.transaction(storeNames, mode, callback, options?)`.

```tsx
import { useIndexedDB } from 'preact-missing-hooks'

function App() {
  const { db, isReady, error } = useIndexedDB({
    name: 'my-app-db',
    version: 1,
    tables: {
      users: { keyPath: 'id', autoIncrement: true, indexes: ['email'] },
      settings: { keyPath: 'key' },
    },
  })

  if (error) return <div>Failed to open database</div>
  if (!isReady || !db) return <div>Loading...</div>

  const users = db.table('users')

  // All operations return Promises and accept optional { onSuccess, onError }
  await users.insert({ email: 'a@b.com', name: 'Alice' })
  await users.update(1, { name: 'Alice Smith' })
  const found = await users.query((u) => u.email.startsWith('a@'))
  const n = await users.count()
  await users.delete(1)
  await users.upsert({ id: 2, email: 'b@b.com' })
  await users.bulkInsert([{ email: 'c@b.com' }, { email: 'd@b.com' }])
  await users.clear()

  // Full transaction support
  await db.transaction(['users', 'settings'], 'readwrite', async (tx) => {
    await tx.table('users').insert({ email: 'e@b.com' })
    await tx.table('settings').upsert({ key: 'theme', value: 'dark' })
  })

  return <div>DB ready. Tables: {db.hasTable('users') ? 'users' : ''}</div>
}
```

---

### `useWebRTCIP`

Detects client IP addresses using WebRTC ICE candidates and a STUN server (**frontend-only**, no backend). **Not highly reliable** — use as a **first-priority** hint; if it fails or returns empty, fall back to a public IP API (e.g. [ipapi.co](https://ipapi.co), [ipify](https://www.ipify.org), [ip-api.com](https://ip-api.com)).

Returns `{ ips: string[], loading: boolean, error: string | null }`. Options: `stunServers`, `timeout` (ms), `onDetect(ip)`.

```tsx
import { useWebRTCIP } from 'preact-missing-hooks'
import { useState, useEffect } from 'preact/hooks'

function ClientIP() {
  const { ips, loading, error } = useWebRTCIP({
    timeout: 4000,
    onDetect: (ip) => {
      /* optional: e.g. analytics */
    },
  })
  const [fallbackIP, setFallbackIP] = useState<string | null>(null)

  // Fallback to public IP API when WebRTC fails or returns empty
  useEffect(() => {
    if (loading || ips.length > 0) return
    if (error) {
      fetch('https://api.ipify.org?format=json')
        .then((r) => r.json())
        .then((d) => setFallbackIP(d.ip))
        .catch(() => {})
    }
  }, [loading, ips.length, error])

  if (loading) return <p>Detecting IP…</p>
  if (ips.length > 0) return <p>IPs (WebRTC): {ips.join(', ')}</p>
  if (fallbackIP) return <p>IP (fallback API): {fallbackIP}</p>
  if (error) return <p>WebRTC failed. Try fallback API.</p>
  return null
}
```

---

### `useWasmCompute`

Runs WebAssembly computation in a Web Worker so the main thread stays responsive. Flow: **Preact Component → useWasmCompute() → Web Worker → WASM Module → return result.** The hook checks that the environment supports `window`, `Worker`, and `WebAssembly`; in SSR or unsupported environments it sets `error` and leaves `ready` false.

Returns `{ compute, result, loading, error, ready }`. Options: `wasmUrl` (required), `exportName` (default `'compute'`), optional `workerUrl` (custom worker script), optional `importObject` (must be serializable for the default worker).

```tsx
import { useWasmCompute } from 'preact-missing-hooks'

function AddWithWasm() {
  const { compute, result, loading, error, ready } = useWasmCompute<
    number,
    number
  >({
    wasmUrl: '/add.wasm',
    exportName: 'add',
  })

  const handleClick = () => {
    if (ready) compute(2).then(() => {})
  }

  if (error) return <p>WASM unavailable: {error}</p>
  if (!ready) return <p>Loading WASM…</p>
  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        Add 2
      </button>
      {result != null && <p>Result: {result}</p>}
    </div>
  )
}
```

---

### `useWorkerNotifications`

Listens to a Worker's `message` events and maintains state and derived stats. Your worker should `postMessage` with: `{ type: 'task_start', taskId? }`, `{ type: 'task_end', taskId?, duration? }`, `{ type: 'task_fail', taskId?, error? }`, and optionally `{ type: 'queue_size', size }`.

Returns `runningTasks`, `completedCount`, `failedCount`, `eventHistory`, `averageDurationMs`, `throughputPerSecond`, `currentQueueSize`, and **`progress`** — a single object with all active worker data (running, completed, failed, totalProcessed, avg duration, throughput/s, queue). Options: `maxHistory` (default 100), `throughputWindowMs` (default 1000).

```tsx
import { useWorkerNotifications } from 'preact-missing-hooks'

function WorkerDashboard({ worker }) {
  const { progress, eventHistory } = useWorkerNotifications(worker, {
    maxHistory: 50,
  })

  return (
    <div>
      <p>
        Running: {progress.runningTasks.length} | Done:{' '}
        {progress.completedCount} | Failed: {progress.failedCount}
      </p>
      <p>
        Avg: {progress.averageDurationMs.toFixed(0)}ms | Throughput:{' '}
        {progress.throughputPerSecond.toFixed(2)}/s | Queue:{' '}
        {progress.currentQueueSize}
      </p>
      <small>Events: {eventHistory.length}</small>
    </div>
  )
}
```

---

## Built With

- [Preact](https://preactjs.com)
- [Microbundle](https://github.com/developit/microbundle)
- [TypeScript](https://www.typescriptlang.org)
- [Vitest](https://vitest.dev) for testing

---

## License

MIT © [Prakhar Dubey](https://github.com/prakhardubey2002)

---

## Contributing

Contributions are welcome! Please open issues or submit PRs with new hooks or improvements.
