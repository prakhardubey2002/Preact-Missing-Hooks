/** @jsx h */
import { h } from 'preact';
import { render, waitFor } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { useWasmCompute } from '@/useWasmCompute';

describe('useWasmCompute', () => {
  const originalWindow = global.window;
  const originalWorker = global.Worker;
  const originalWebAssembly = global.WebAssembly;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    (global as unknown as { window: typeof originalWindow }).window = originalWindow;
    (global as unknown as { Worker: typeof originalWorker }).Worker = originalWorker;
    (global as unknown as { WebAssembly: typeof originalWebAssembly }).WebAssembly = originalWebAssembly;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('returns error when window is undefined (SSR)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    (global as unknown as { window: undefined }).window = undefined;

    function TestComponent() {
      const { error, loading, ready } = useWasmCompute({ wasmUrl: '/test.wasm' });
      return (
        <div>
          <span data-testid="error">{error ?? 'none'}</span>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="ready">{String(ready)}</span>
        </div>
      );
    }

    render(<TestComponent />, { container });
    for (let i = 0; i < 50; i++) {
      const loadingEl = container.querySelector('[data-testid="loading"]');
      if (loadingEl?.textContent === 'false') break;
      await new Promise((r) => setTimeout(r, 10));
    }
    const errorEl = container.querySelector('[data-testid="error"]');
    const readyEl = container.querySelector('[data-testid="ready"]');
    expect(errorEl?.textContent).toContain('SSR');
    expect(readyEl?.textContent).toBe('false');
  });

  it('returns error when Worker is not supported', async () => {
    (global as unknown as { Worker: undefined }).Worker = undefined;

    function TestComponent() {
      const { error, loading, ready } = useWasmCompute({ wasmUrl: '/test.wasm' });
      return (
        <div>
          <span data-testid="error">{error ?? 'none'}</span>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="ready">{String(ready)}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('error').textContent).toContain('Worker');
    expect(getByTestId('ready').textContent).toBe('false');
  });

  it('returns error when WebAssembly is not supported', async () => {
    (global as unknown as { Worker: unknown }).Worker = vi.fn();
    (global as unknown as { WebAssembly: undefined }).WebAssembly = undefined;

    function TestComponent() {
      const { error, loading, ready } = useWasmCompute({ wasmUrl: '/test.wasm' });
      return (
        <div>
          <span data-testid="error">{error ?? 'none'}</span>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="ready">{String(ready)}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('error').textContent).toContain('WebAssembly');
    expect(getByTestId('ready').textContent).toBe('false');
  });

  it('initializes worker and becomes ready when worker posts ready', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    let messageHandler: ((e: MessageEvent) => void) | null = null;
    const postMessageCalls: unknown[] = [];

    (global as unknown as { Worker: unknown }).Worker = vi.fn().mockImplementation(() => ({
      addEventListener: (_: string, handler: (e: MessageEvent) => void) => {
        messageHandler = handler;
      },
      removeEventListener: vi.fn(),
      postMessage: (data: unknown) => postMessageCalls.push(data),
      terminate: vi.fn(),
    }));

    function TestComponent() {
      const state = useWasmCompute({ wasmUrl: '/add.wasm', exportName: 'add' });
      return (
        <div>
          <span data-testid="ready">{String(state.ready)}</span>
          <span data-testid="loading">{String(state.loading)}</span>
          <span data-testid="result">{state.result ?? 'none'}</span>
          <span data-testid="error">{state.error ?? 'none'}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);

    expect(postMessageCalls.length).toBe(1);
    expect(postMessageCalls[0]).toEqual({
      type: 'init',
      wasmUrl: '/add.wasm',
      exportName: 'add',
      importObject: {},
    });

    expect(getByTestId('ready').textContent).toBe('false');
    expect(getByTestId('loading').textContent).toBe('true');

    messageHandler!({ data: { type: 'ready' } } as MessageEvent);
    await waitFor(() => expect(getByTestId('ready').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('error').textContent).toBe('none');
  });

  it('compute() posts compute message and updates result when worker responds', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    let messageHandler: ((e: MessageEvent) => void) | null = null;
    const postMessageCalls: unknown[] = [];

    (global as unknown as { Worker: unknown }).Worker = vi.fn().mockImplementation(() => ({
      addEventListener: (_: string, handler: (e: MessageEvent) => void) => {
        messageHandler = handler;
      },
      removeEventListener: vi.fn(),
      postMessage: (data: unknown) => postMessageCalls.push(data),
      terminate: vi.fn(),
    }));

    let computeFn: (input: number) => Promise<number> = () => Promise.resolve(0);

    function TestComponent() {
      const state = useWasmCompute<number, number>({ wasmUrl: '/add.wasm' });
      computeFn = state.compute;
      return (
        <div>
          <span data-testid="result">{state.result ?? 'none'}</span>
          <span data-testid="loading">{String(state.loading)}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    messageHandler!({ data: { type: 'ready' } } as MessageEvent);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));

    const resultPromise = computeFn(7);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('true'));
    expect(postMessageCalls.some((m: unknown) => (m as { type?: string }).type === 'compute' && (m as { input?: number }).input === 7)).toBe(true);

    messageHandler!({ data: { type: 'result', result: 42 } } as MessageEvent);
    await expect(resultPromise).resolves.toBe(42);
    await waitFor(() => expect(getByTestId('result').textContent).toBe('42'));
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
  });

  it('sets error and rejects compute promise when worker posts error', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    let messageHandler: ((e: MessageEvent) => void) | null = null;

    (global as unknown as { Worker: unknown }).Worker = vi.fn().mockImplementation(() => ({
      addEventListener: (_: string, handler: (e: MessageEvent) => void) => {
        messageHandler = handler;
      },
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
    }));

    let computeFn: (input: number) => Promise<number> = () => Promise.resolve(0);

    function TestComponent() {
      const state = useWasmCompute<number, number>({ wasmUrl: '/bad.wasm' });
      computeFn = state.compute;
      return (
        <div>
          <span data-testid="error">{state.error ?? 'none'}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    messageHandler!({ data: { type: 'ready' } } as MessageEvent);
    await waitFor(() => expect(getByTestId('error').textContent).toBe('none'));

    const resultPromise = computeFn(1);
    messageHandler!({ data: { type: 'error', error: 'Export "compute" is not a function' } } as MessageEvent);
    await expect(resultPromise).rejects.toThrow('Export "compute" is not a function');
    await waitFor(() => expect(getByTestId('error').textContent).toContain('not a function'));
  });

  it('compute() rejects when WASM is not ready yet', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    (global as unknown as { Worker: unknown }).Worker = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
    }));

    let computeFn: (input: number) => Promise<number> = () => Promise.resolve(0);

    function TestComponent() {
      const state = useWasmCompute<number, number>({ wasmUrl: '/add.wasm' });
      computeFn = state.compute;
      return <div data-testid="ready">{String(state.ready)}</div>;
    }

    render(<TestComponent />);
    await expect(computeFn(1)).rejects.toThrow('WASM not ready');
  });
});
