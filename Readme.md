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

A lightweight, extendable collection of React-like hooks for Preact, including utilities for transitions, DOM mutation observation, global event buses, theme detection, network status, clipboard access, and rage-click detection (e.g. for Sentry).

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
- Fully TypeScript compatible
- Bundled with Microbundle
- Zero dependencies (except `preact`)

---

## Installation

```bash
npm install preact-missing-hooks
```

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
