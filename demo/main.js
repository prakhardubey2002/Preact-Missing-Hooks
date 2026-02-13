import { h, render } from 'https://esm.sh/preact@10';
import { useState, useEffect, useRef } from 'https://esm.sh/preact@10/hooks';
import {
  useTransition,
  useMutationObserver,
  useEventBus,
  useWrappedChildren,
  usePreferredTheme,
  useNetworkState,
  useClipboard,
  useRageClick,
  useThreadedWorker,
  useIndexedDB,
  useWebRTCIP,
  useWasmCompute,
} from 'https://unpkg.com/preact-missing-hooks/dist/index.module.js';

// ——— Hook demo components ———

function DemoTransition() {
  const [startTransition, isPending] = useTransition();
  const [count, setCount] = useState(0);
  return h('div', {},
    h('button', { onClick: () => startTransition(() => setCount((c) => c + 1)) }, 'Increment'),
    ' ',
    isPending ? h('span', { class: 'badge amber' }, 'Pending…') : null,
    h('span', { style: { marginLeft: '0.5rem' } }, 'Count: ' + count)
  );
}

function DemoMutationObserver() {
  const ref = useRef(null);
  const [log, setLog] = useState([]);
  useMutationObserver(ref, (mutations) => {
    setLog((prev) => [...prev.slice(-2), mutations.length + ' mutation(s)']);
  }, { childList: true, subtree: true });
  return h('div', {},
    h('div', { ref, style: { padding: '0.5rem', background: 'var(--surface2)', borderRadius: '6px', marginBottom: '0.5rem' } },
      h('span', {}, 'Watch this area → '),
      h('button', { onClick: () => { const el = ref.current; if (el) { const s = document.createElement('span'); s.textContent = ' +new'; el.appendChild(s); } } }, 'Add node')
    ),
    h('div', { class: 'status' }, log.length ? log.join(' · ') : 'No mutations yet')
  );
}

function DemoEventBus() {
  const { emit, on } = useEventBus();
  const [msg, setMsg] = useState('');
  useEffect(() => {
    return on('greet', setMsg);
  }, [on]);
  return h('div', {},
    h('button', { onClick: () => emit('greet', 'Hello from bus!') }, 'Emit greet'),
    msg ? h('span', { style: { marginLeft: '0.5rem' }, class: 'badge green' }, msg) : null
  );
}

function DemoWrappedChildren() {
  const children = [h('button', {}, 'A'), h('button', {}, 'B')];
  const wrapped = useWrappedChildren(children, { style: { marginRight: '0.25rem' } });
  return h('div', {}, wrapped);
}

function DemoPreferredTheme() {
  const theme = usePreferredTheme();
  return h('div', {}, h('span', { class: 'badge ' + (theme === 'dark' ? 'green' : 'amber') }, theme));
}

function DemoNetworkState() {
  const state = useNetworkState();
  return h('div', { class: 'status' },
    state.online ? h('span', { class: 'badge green' }, 'Online') : h('span', { class: 'badge', style: { background: 'var(--red)', color: '#fff' } }, 'Offline'),
    state.effectiveType ? ' ' + state.effectiveType : ''
  );
}

function DemoClipboard() {
  const { copy, paste, copied, error } = useClipboard();
  const [pasted, setPasted] = useState('');
  return h('div', {},
    h('button', { onClick: () => copy('Hello from useClipboard!') }, copied ? 'Copied!' : 'Copy'),
    ' ',
    h('button', { onClick: () => paste().then(setPasted) }, 'Paste'),
    pasted ? h('div', { style: { marginTop: '0.5rem', fontSize: '0.85rem' } }, 'Pasted: ' + pasted) : null,
    error ? h('div', { style: { color: 'var(--red)', fontSize: '0.8rem' } }, error.message) : null
  );
}

function DemoRageClick() {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  useRageClick(ref, { onRageClick: () => setCount((c) => c + 1), threshold: 3 });
  return h('div', {},
    h('div', { ref, style: { padding: '1rem', background: 'var(--surface2)', borderRadius: '6px', cursor: 'pointer', userSelect: 'none' } }, 'Click here 3+ times fast (rage click)'),
    count ? h('div', { class: 'badge amber', style: { marginTop: '0.5rem' } }, 'Rage clicks: ' + count) : null
  );
}

function DemoThreadedWorker() {
  const { run, loading, result } = useThreadedWorker(
    (x) => new Promise((r) => setTimeout(() => r('Result: ' + x), 500)),
    { mode: 'sequential' }
  );
  return h('div', {},
    h('button', { onClick: () => run('task'), disabled: loading }, loading ? 'Running…' : 'Run task'),
    result ? h('span', { style: { marginLeft: '0.5rem' }, class: 'badge green' }, result) : null
  );
}

function DemoIndexedDB() {
  const { db, isReady, error } = useIndexedDB({ name: 'demo-db', version: 1, tables: { items: { keyPath: 'id' } } });
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(null);

  const refresh = () => {
    if (!db) return;
    db.table('items').query(() => true).then(setItems);
    db.table('items').count().then(setCount);
  };

  useEffect(() => {
    if (!db || !isReady) return;
    refresh();
  }, [db, isReady]);

  const insert = () => db && db.table('items').insert({ id: Date.now(), label: 'Item ' + (items.length + 1), created: Date.now() }).then(refresh);
  const bulkInsert = () => db && db.table('items').bulkInsert([
    { id: Date.now() + 1, label: 'Bulk A', created: Date.now() },
    { id: Date.now() + 2, label: 'Bulk B', created: Date.now() },
  ]).then(refresh);
  const update = (id, label) => db && db.table('items').update(id, { label }).then(refresh);
  const remove = (id) => db && db.table('items').delete(id).then(refresh);
  const clear = () => db && db.table('items').clear().then(refresh);

  if (error) return h('div', { style: { color: 'var(--red)' } }, error.message);
  if (!isReady) return h('div', { class: 'status' }, 'Opening DB…');

  return h('div', {},
    h('div', { class: 'idb-actions' }, [
      h('button', { onClick: insert }, 'Insert'),
      h('button', { onClick: bulkInsert }, 'Bulk insert'),
      h('button', { onClick: refresh }, 'Query all'),
      h('button', { onClick: clear }, 'Clear'),
    ]),
    h('div', { class: 'idb-count' }, 'Count: ' + (count ?? '—')),
    h('div', { class: 'idb-table-viz' },
      items.length === 0
        ? h('div', { style: { color: 'var(--textMuted)', padding: '0.5rem' } }, 'No rows. Use Insert or Bulk insert.')
        : items.map((row) =>
          h('div', { key: row.id, class: 'idb-row' }, [
            h('span', {}, row.label || 'id:' + row.id),
            h('div', { class: 'idb-row-actions' }, [
              h('button', { onClick: () => update(row.id, (row.label || '') + '✓') }, 'Update'),
              h('button', { onClick: () => remove(row.id) }, 'Delete'),
            ])
          ])
        )
    )
  );
}

function DemoWebRTCIP() {
  const { ips, loading, error } = useWebRTCIP({ timeout: 4000 });
  if (loading) return h('div', { class: 'status' }, 'Detecting IP…');
  if (error) return h('div', { style: { color: 'var(--red)', fontSize: '0.85rem' } }, error);
  return h('div', {}, ips.length ? h('span', { class: 'badge green' }, ips.join(', ')) : 'No IPs');
}

function DemoWasmCompute() {
  const { compute, result, loading, error, ready } = useWasmCompute({
    wasmUrl: new URL('./add.wasm', import.meta.url).href,
    exportName: 'compute',
  });
  const flowSteps = [
    { id: 'component', label: 'Component' },
    { id: 'hook', label: 'useWasmCompute()' },
    { id: 'worker', label: 'Web Worker' },
    { id: 'wasm', label: 'WASM' },
    { id: 'result', label: 'result' },
  ];
  const activeId = result != null ? 'result' : ready ? (loading ? 'wasm' : 'wasm') : 'worker';

  if (error) return h('div', { style: { color: 'var(--red)' } }, error);
  return h('div', {},
    h('div', { class: 'wasm-flow' },
      flowSteps.map((s, i) => [
        i > 0 && h('span', { class: 'wasm-flow-arrow' }, '→'),
        h('span', { class: 'wasm-flow-node' + (s.id === activeId ? ' active' : '') }, s.label),
      ]).flat()
    ),
    !ready && h('div', { class: 'status' }, 'Loading WASM in worker…'),
    ready && h('div', { style: { marginBottom: '0.5rem' } }, [
      h('button', { onClick: () => compute(41), disabled: loading }, loading ? 'Computing…' : 'compute(41)'),
      h('button', { onClick: () => compute(100), disabled: loading }, 'compute(100)'),
      h('button', { onClick: () => compute(0), disabled: loading }, 'compute(0)'),
    ]),
    result != null && h('div', { class: 'badge green', style: { marginTop: '0.5rem' } }, 'Result: ' + result)
  );
}

// ——— Page data: heading, flow, summary, code, LiveComponent ———

const HOOKS = [
  {
    name: 'useTransition',
    flow: 'Component → useTransition() → startTransition(cb) → deferred state update',
    summary: 'Defers state updates so the UI stays responsive. Returns [startTransition, isPending].',
    code: `const [startTransition, isPending] = useTransition();\nstartTransition(() => setCount(c => c + 1));`,
    Live: DemoTransition,
  },
  {
    name: 'useMutationObserver',
    flow: 'Component → ref + useMutationObserver(ref, callback, options) → DOM changes trigger callback',
    summary: 'Observes DOM mutations (childList, attributes, etc.) on the element attached to ref.',
    code: `const ref = useRef(null);\nuseMutationObserver(ref, (mutations) => { ... }, { childList: true });`,
    Live: DemoMutationObserver,
  },
  {
    name: 'useEventBus',
    flow: 'Components → useEventBus() → emit(name, ...args) / on(name, fn) → cross-component events',
    summary: 'Publish/subscribe event bus so components can talk without prop drilling.',
    code: `const { emit, on } = useEventBus();\non('greet', setMsg);\nemit('greet', 'Hello');`,
    Live: DemoEventBus,
  },
  {
    name: 'useWrappedChildren',
    flow: 'Parent → useWrappedChildren(children, props) → children with merged props',
    summary: 'Injects props into every child (e.g. style, className) with preserve or override strategy.',
    code: `const wrapped = useWrappedChildren(children, { style: { marginRight: 8 } });`,
    Live: DemoWrappedChildren,
  },
  {
    name: 'usePreferredTheme',
    flow: 'Component → usePreferredTheme() → matchMedia(prefers-color-scheme) → theme',
    summary: 'Returns the user’s preferred color scheme: light, dark, or no-preference.',
    code: `const theme = usePreferredTheme(); // 'light' | 'dark' | 'no-preference'`,
    Live: DemoPreferredTheme,
  },
  {
    name: 'useNetworkState',
    flow: 'Component → useNetworkState() → online + connection (effectiveType, etc.)',
    summary: 'Tracks online/offline and connection type (when the Network Information API is available).',
    code: `const state = useNetworkState();\n// state.online, state.effectiveType, ...`,
    Live: DemoNetworkState,
  },
  {
    name: 'useClipboard',
    flow: 'Component → useClipboard() → copy(text) / paste() → Clipboard API',
    summary: 'Copy and paste text with the Clipboard API; returns copied and error state.',
    code: `const { copy, copied, paste } = useClipboard();\ncopy('Hello');`,
    Live: DemoClipboard,
  },
  {
    name: 'useRageClick',
    flow: 'ref + useRageClick(ref, { onRageClick }) → N fast clicks in same spot → callback',
    summary: 'Detects rage clicks (e.g. for Sentry) when the user clicks repeatedly in the same area.',
    code: `useRageClick(ref, { onRageClick: (p) => report(p.count), threshold: 5 });`,
    Live: DemoRageClick,
  },
  {
    name: 'useThreadedWorker',
    flow: 'useThreadedWorker(fn, { mode }) → run(data) → queue → fn runs → result',
    summary: 'Runs async work in a queue; sequential or parallel mode with optional priority.',
    code: `const { run, loading, result } = useThreadedWorker(fn, { mode: 'sequential' });\nrun(data);`,
    Live: DemoThreadedWorker,
  },
  {
    name: 'useIndexedDB',
    flow: 'useIndexedDB({ name, version, tables }) → db.table(name).insert/query/...',
    summary: 'IndexedDB with tables, insert, update, delete, query, count, and transactions.',
    code: `const { db, isReady } = useIndexedDB({ name: 'my-db', tables: { items: { keyPath: 'id' } } });\ndb.table('items').insert({ id: 1 });`,
    Live: DemoIndexedDB,
  },
  {
    name: 'useWebRTCIP',
    flow: 'useWebRTCIP() → STUN + ICE candidates → extract IPv4 → ips[]',
    summary: 'Tries to detect client IP via WebRTC; use as a hint and fall back to an IP API if needed.',
    code: `const { ips, loading, error } = useWebRTCIP({ timeout: 3000 });`,
    Live: DemoWebRTCIP,
  },
  {
    name: 'useWasmCompute',
    flow: 'Component → useWasmCompute({ wasmUrl }) → Web Worker → WASM → compute(input) → result',
    summary: 'Runs WebAssembly in a worker; returns compute(input), result, loading, ready.',
    code: `const { compute, result, ready } = useWasmCompute({ wasmUrl: '/add.wasm' });\ncompute(41); // → 42`,
    Live: DemoWasmCompute,
  },
];

function App() {
  return h('div', {},
    HOOKS.map((hook) =>
      h('section', { key: hook.name, class: 'hook-section' }, [
        h('h2', {}, hook.name),
        h('div', { class: 'flow' }, hook.flow),
        h('p', { class: 'summary' }, hook.summary),
        h('div', { class: 'cards' }, [
          h('div', { class: 'card' }, [
            h('div', { class: 'card-title' }, 'Example'),
            h('pre', { class: 'card-code' }, hook.code),
          ]),
          h('div', { class: 'card' }, [
            h('div', { class: 'card-title' }, 'Live'),
            h('div', { class: 'card-live' }, h(hook.Live)),
          ]),
        ]),
      ])
    )
  );
}

render(h(App), document.getElementById('root'));
