# Preact Missing Hooks

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
