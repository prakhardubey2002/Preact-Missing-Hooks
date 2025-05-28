# Preact Missing Hooks
<p align="left">
  <!-- 📦 Package Info -->
  <a href="https://www.npmjs.com/package/preact-missing-hooks">
    <img src="https://img.shields.io/npm/v/preact-missing-hooks?color=crimson&label=npm%20version" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/preact-missing-hooks">
    <img src="https://img.shields.io/npm/dm/preact-missing-hooks?label=monthly%20downloads" alt="npm downloads" />
  </a>

  <!-- 🛠️ GitHub Info -->
  <a href="https://github.com/prakhardubey2002/preact-missing-hooks/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/prakhardubey2002/preact-missing-hooks?color=blueviolet" alt="license" />
  </a>
  <a href="https://github.com/prakhardubey2002/preact-missing-hooks/stargazers">
    <img src="https://img.shields.io/github/stars/prakhardubey2002/preact-missing-hooks?style=social" alt="GitHub stars" />
  </a>

  <!-- ✅ Build & CI (Optional) -->
  <a href="https://github.com/prakhardubey2002/preact-missing-hooks/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/prakhardubey2002/preact-missing-hooks/ci.yml?branch=main&label=build" alt="Build Status" />
  </a>

  <!-- 📊 Coverage (Optional if setup) -->
  <a href="https://codecov.io/gh/prakhardubey2002/preact-missing-hooks">
    <img src="https://codecov.io/gh/prakhardubey2002/preact-missing-hooks/branch/main/graph/badge.svg?token=YOUR_TOKEN_HERE" alt="codecov" />
  </a>
</p>
A lightweight, extendable collection of missing React-like hooks for Preact — plus fresh, powerful new ones designed specifically for modern Preact apps..

---

## ✨ Features

* **🔄 `useTransition`**: Mimics React's `useTransition` for deferring state updates.
* ✅ Fully TypeScript compatible
* 📦 Bundled with Microbundle
* 🔌 Easily extensible — more hooks can be added in future
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

## 🔧 Usage

```tsx
import { useTransition } from 'preact-missing-hooks';

const Example = () => {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      // Expensive update here
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Loading...' : 'Click me'}
    </button>
  );
};
```

---

## 🔍 API: `useTransition()`

Returns a tuple:

* `startTransition(fn: () => void)` — schedules a low-priority update
* `isPending: boolean` — `true` while the transition is in progress

---

## 🛠 Built With

* [Preact](https://preactjs.com)
* [Microbundle](https://github.com/developit/microbundle)
* [TypeScript](https://www.typescriptlang.org/)

---

## 🧩 Future Hooks (Planned)

* `useMutationObserver`: For observing changes in DOM mutations.
---


## 📝 License

ISC © [Prakhar Dubey](https://github.com/prakhardubey2002)

---

## 📬 Contributing

Feel free to open issues or submit PRs to suggest or contribute additional hooks!

---

## 📎 Related

* [React useTransition Docs](https://react.dev/reference/react/useTransition)
* [Preact Documentation](https://preactjs.com/guide/v10/getting-started/)
