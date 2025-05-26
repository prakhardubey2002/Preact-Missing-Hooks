# Preact Missing Hooks

A lightweight, extendable collection of missing React-like hooks for Preact, starting with `useTransition`.

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

* `useDebounce`
* `useThrottle`
* `useIdleCallback`

---

## 📤 Publishing

Build before publishing:

```bash
npm run build
```

Then:

```bash
npm publish --access public
```

---

## 📝 License

ISC © [Prakhar Dubey](https://github.com/your-profile)

---

## 📬 Contributing

Feel free to open issues or submit PRs to suggest or contribute additional hooks!

---

## 📎 Related

* [React useTransition Docs](https://react.dev/reference/react/useTransition)
* [Preact Documentation](https://preactjs.com/guide/v10/getting-started/)
