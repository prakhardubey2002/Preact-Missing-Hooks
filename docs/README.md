# Preact Missing Hooks — Demo & Usage

This folder contains a **live demo** of all hooks from `preact-missing-hooks`. Each hook is shown with a short flow description, example code, and an interactive “Live” panel.

## Running the demo

### Option 1: Local build + static server (recommended)

From the project root:

```bash
npm run build
npx serve -l 5000
```

Then open **http://localhost:5000/docs/** in your browser. The demo will load the built package from `../dist/index.module.js`.

### Option 2: Demo script

From the project root you can use the existing demo script:

```bash
npm run demo
```

Then open **http://localhost:5000/docs/** (or the port shown).

### Option 3: Unpkg (no build)

Open `docs/index.html` in a browser that supports ES modules and import maps. The demo will load Preact and `preact-missing-hooks` from unpkg. Some features (e.g. `useWasmCompute` with a local WASM file) may be limited when opened as a file.

---

## What the demo includes

| Hook                       | What you can try                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **useTransition**          | Deferred state update; button shows “Pending…” then count.                                                                                                                                            |
| **useMutationObserver**    | Add a node in the observed area; see mutation count.                                                                                                                                                  |
| **useEventBus**            | Emit “greet” and see the message in another part of the UI.                                                                                                                                           |
| **useWrappedChildren**     | Children buttons get injected styles.                                                                                                                                                                 |
| **usePreferredTheme**      | Shows light / dark / no-preference from system.                                                                                                                                                       |
| **useNetworkState**        | Online/offline and connection type.                                                                                                                                                                   |
| **useClipboard**           | Copy and paste; see “Copied!” and pasted text.                                                                                                                                                        |
| **useRageClick**           | Click the area 3+ times quickly; rage click count.                                                                                                                                                    |
| **useThreadedWorker**      | Run a task; see loading and result.                                                                                                                                                                   |
| **useIndexedDB**           | Insert, bulk insert, query, update, delete, clear.                                                                                                                                                    |
| **useWebRTCIP**            | Detect IP via WebRTC (may take a few seconds).                                                                                                                                                        |
| **useWasmCompute**         | Run WASM in a worker (needs `add.wasm` in docs).                                                                                                                                                      |
| **useWorkerNotifications** | Run/fail tasks and queue updates; toasts show events.                                                                                                                                                 |
| **useRefPrint**            | Bind a ref to a section and click “Print / Save as PDF”; only that section is printed via `@media print`.                                                                                             |
| **useRBAC**                | Login as Admin / Editor / Viewer (localStorage or sessionStorage); see roles and capabilities; conditional UI by `can(...)`.                                                                          |
| **useLLMMetadata**         | Change “route” with buttons; see injected script info in the Live panel and `<script data-llm="true">` in the document head. Safe with `null`/`undefined` config (minimal payload with `route: "/"`). |

---

## Demo usage patterns

### Minimal Preact example

```js
import { h, render } from "preact";
import { useState } from "preact/hooks";
import { useClipboard, usePreferredTheme } from "preact-missing-hooks";

function App() {
  const { copy, copied } = useClipboard();
  const theme = usePreferredTheme();
  return h(
    "div",
    {},
    h("button", { onClick: () => copy("Hi") }, copied ? "Copied!" : "Copy"),
    h("span", {}, " Theme: " + theme)
  );
}
render(h(App), document.getElementById("root"));
```

### With React

```jsx
import { useTransition, useLLMMetadata } from "preact-missing-hooks/react";
import { useLocation } from "react-router-dom";

function App() {
  const { pathname } = useLocation();
  useLLMMetadata({ route: pathname, mode: "auto-extract", tags: ["my-app"] });
  const [startTransition, isPending] = useTransition();
  // ...
}
```

### useRefPrint example

Print only a specific section via the native print dialog (user can save as PDF):

```js
import { h, render } from "preact";
import { useRef } from "preact/hooks";
import { useRefPrint } from "preact-missing-hooks";

function Report() {
  const printRef = useRef(null);
  const { print } = useRefPrint(printRef, {
    documentTitle: "My Report",
    downloadAsPdf: true,
  });
  return h(
    "div",
    {},
    h(
      "div",
      { ref: printRef, style: { padding: "1rem", background: "#f5f5f5" } },
      "Only this section is printed when you click the button."
    ),
    h("button", { onClick: print }, "Print / Save as PDF")
  );
}
render(h(Report), document.getElementById("root"));
```

### useRBAC example

Frontend-only role-based access: define roles with conditions, assign capabilities per role, and read the current user from localStorage (or sessionStorage / API):

```js
import { h, render } from "preact";
import { useRBAC } from "preact-missing-hooks";

const roleDefinitions = [
  { role: "admin", condition: (u) => u && u.role === "admin" },
  {
    role: "editor",
    condition: (u) => u && (u.role === "editor" || u.role === "admin"),
  },
  { role: "viewer", condition: (u) => u && u.id != null },
];
const roleCapabilities = {
  admin: ["*"],
  editor: ["posts:edit", "posts:create", "posts:read"],
  viewer: ["posts:read"],
};

function App() {
  const { user, roles, can, setUserInStorage } = useRBAC({
    userSource: { type: "localStorage", key: "app-user" },
    roleDefinitions,
    roleCapabilities,
  });

  if (!user) {
    return h(
      "div",
      {},
      h(
        "button",
        {
          onClick: () =>
            setUserInStorage(
              { id: 1, role: "admin" },
              "localStorage",
              "app-user"
            ),
        },
        "Login as Admin"
      ),
      h(
        "button",
        {
          onClick: () =>
            setUserInStorage(
              { id: 2, role: "viewer" },
              "localStorage",
              "app-user"
            ),
        },
        "Login as Viewer"
      )
    );
  }
  return h(
    "div",
    {},
    h("p", {}, "Roles: " + roles.join(", ")),
    can("posts:edit") && h("button", {}, "Edit post"),
    can("*") && h("button", {}, "Admin panel"),
    h(
      "button",
      { onClick: () => setUserInStorage(null, "localStorage", "app-user") },
      "Logout"
    )
  );
}
render(h(App), document.getElementById("root"));
```

### useLLMMetadata in the demo

The **useLLMMetadata** Live panel simulates route changes. Click “Route: /”, “Route: /blog”, or “Route: /docs”. Each change:

1. Removes any existing `<script data-llm="true">`.
2. Injects a new script with `type="application/llm+json"` containing `route`, `title`, `description`, `tags`, and `generatedAt`.

Inspect the page’s `<head>` in DevTools to see the script. The Live panel shows a short summary of the injected payload. The hook never throws: passing `null` or `undefined` as config is safe and yields a minimal payload with `route: "/"` and `generatedAt`.

---

## File layout

- **index.html** — Page shell, styles, and import map; mounts the app into `#root`.
- **main.js** — Imports the package and Preact, defines demo components and the `HOOKS` list, renders the app.

To add a new hook to the demo:

1. Import it in `main.js` from the package.
2. Implement a `DemoXxx` component that uses the hook.
3. Add an entry to the `HOOKS` array with `name`, `flow`, `summary`, `code`, and `Live: DemoXxx`.
