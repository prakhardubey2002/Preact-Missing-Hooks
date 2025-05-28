# Preact Missing Hooks

<p align="left">
  <a href="https://www.npmjs.com/package/preact-missing-hooks">
    <img src="https://img.shields.io/npm/v/preact-missing-hooks?color=crimson&label=npm%20version" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/preact-missing-hooks">
    <img src="https://img.shields.io/npm/dm/preact-missing-hooks?label=monthly%20downloads" alt="npm downloads" />
  </a>

  <a href="https://github.com/prakhardubey2002/preact-missing-hooks/actions/workflows/test-hooks.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/prakhardubey2002/preact-missing-hooks/test-hooks.yml?branch=main&label=build%20status" alt="Build Status" />
  </a>
</p>

A lightweight, extendable collection of React-like hooks for Preact, including utilities for transitions, DOM mutation observation, and global event buses.

---

## ✨ Features

* **🔄 `useTransition`** — Defers state updates to yield a smoother UI experience.
* **🔍 `useMutationObserver`** — Reactively observes DOM changes with a familiar hook API.
* **📡 `useEventBus`** — A simple publish/subscribe system, eliminating props drilling or overuse of context.
* ✅ Fully TypeScript compatible
* 📦 Bundled with Microbundle
* ⚡ Zero dependencies (except `preact`)

---

## 📦 Installation

```bash
npm install preact-missing-hooks
```

Ensure `preact` is installed in your project:

```bash
npm install preact
```

---

## 🔧 Usage Examples

### `useTransition`

```tsx
import { useTransition } from 'preact-missing-hooks';

function ExampleTransition() {
  const [startTransition, isPending] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      // perform an expensive update here
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Loading...' : 'Click Me'}
    </button>
  );
}
```

---

### `useMutationObserver`

```tsx
import { useRef } from 'preact/hooks';
import { useMutationObserver } from 'preact-missing-hooks';

function ExampleMutation() {
  const ref = useRef<HTMLDivElement>(null);

  useMutationObserver(ref, (mutations) => {
    console.log('Detected mutations:', mutations);
  }, { childList: true, subtree: true });

  return <div ref={ref}>Observe this content</div>;
}
```

---

### `useEventBus`

```tsx
// types.ts
export type Events = {
  notify: (message: string) => void;
};

// Sender.tsx
import { useEventBus } from 'preact-missing-hooks';
import type { Events } from './types';

function Sender() {
  const { emit } = useEventBus<Events>();
  return <button onClick={() => emit('notify', 'Hello World!')}>Send</button>;
}

// Receiver.tsx
import { useEventBus } from 'preact-missing-hooks';
import { useState, useEffect } from 'preact/hooks';
import type { Events } from './types';

function Receiver() {
  const [msg, setMsg] = useState<string>('');
  const { on } = useEventBus<Events>();

  useEffect(() => {
    const unsubscribe = on('notify', setMsg);
    return unsubscribe;
  }, []);

  return <div>Message: {msg}</div>;
}
```

---


## 🛠 Built With

* [Preact](https://preactjs.com)
* [Microbundle](https://github.com/developit/microbundle)
* [TypeScript](https://www.typescriptlang.org)
* [Vitest](https://vitest.dev) for testing

---

## 📝 License

MIT © [Prakhar Dubey](https://github.com/prakhardubey2002)

---

## 📬 Contributing

Contributions are welcome! Please open issues or submit PRs with new hooks or improvements.
