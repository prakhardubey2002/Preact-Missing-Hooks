/** @jsx h */
import { h } from 'preact';
import { render, waitFor } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { useWorkerNotifications } from '@/useWorkerNotifications';

function createMockWorker() {
  let messageHandler: ((e: MessageEvent) => void) | null = null;
  const worker = {
    addEventListener: (_: string, handler: (e: MessageEvent) => void) => {
      messageHandler = handler;
    },
    removeEventListener: vi.fn(),
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
  const trigger = (data: unknown) => {
    messageHandler?.({ data } as MessageEvent);
  };
  return { worker: worker as unknown as Worker, trigger };
}

describe('useWorkerNotifications', () => {
  it('returns initial state when worker is null', () => {
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(null);
      return (
        <div>
          <span data-testid="completed">{result.completedCount}</span>
          <span data-testid="failed">{result.failedCount}</span>
          <span data-testid="running">{result.runningTasks.length}</span>
        </div>
      );
    }
    render(<TestComponent />);
    expect(result).not.toBeNull();
    expect(result!.completedCount).toBe(0);
    expect(result!.failedCount).toBe(0);
    expect(result!.runningTasks).toEqual([]);
    expect(result!.eventHistory).toEqual([]);
    expect(result!.progress.totalProcessed).toBe(0);
  });

  it('tracks task_start and adds to runningTasks', async () => {
    const { worker, trigger } = createMockWorker();
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(worker);
      return (
        <div>
          <span data-testid="running">{result!.runningTasks.join(',')}</span>
        </div>
      );
    }
    render(<TestComponent />);
    trigger({ type: 'task_start', taskId: 't1' });
    await waitFor(() => expect(result!.runningTasks).toContain('t1'));
    trigger({ type: 'task_start', taskId: 't2' });
    await waitFor(() => expect(result!.runningTasks).toContain('t2'));
    expect(result!.runningTasks).toHaveLength(2);
  });

  it('tracks task_end: removes from running, increments completedCount, records duration', async () => {
    const { worker, trigger } = createMockWorker();
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(worker);
      return (
        <div>
          <span data-testid="completed">{result!.completedCount}</span>
          <span data-testid="running">{result!.runningTasks.length}</span>
        </div>
      );
    }
    render(<TestComponent />);
    trigger({ type: 'task_start', taskId: 't1' });
    await waitFor(() => expect(result!.runningTasks).toContain('t1'));
    trigger({ type: 'task_end', taskId: 't1', duration: 50 });
    await waitFor(() => expect(result!.completedCount).toBe(1));
    expect(result!.runningTasks).not.toContain('t1');
    expect(result!.averageDurationMs).toBe(50);
    trigger({ type: 'task_end', taskId: 't2', duration: 150 });
    await waitFor(() => expect(result!.completedCount).toBe(2));
    expect(result!.averageDurationMs).toBe(100);
  });

  it('tracks task_fail: removes from running, increments failedCount', async () => {
    const { worker, trigger } = createMockWorker();
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(worker);
      return (
        <div>
          <span data-testid="failed">{result!.failedCount}</span>
          <span data-testid="running">{result!.runningTasks.length}</span>
        </div>
      );
    }
    render(<TestComponent />);
    trigger({ type: 'task_start', taskId: 't1' });
    await waitFor(() => expect(result!.runningTasks).toContain('t1'));
    trigger({ type: 'task_fail', taskId: 't1', error: 'Something broke' });
    await waitFor(() => expect(result!.failedCount).toBe(1));
    expect(result!.runningTasks).not.toContain('t1');
  });

  it('tracks queue_size and updates currentQueueSize', async () => {
    const { worker, trigger } = createMockWorker();
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(worker);
      return <span data-testid="queue">{result!.currentQueueSize}</span>;
    }
    render(<TestComponent />);
    expect(result!.currentQueueSize).toBe(0);
    trigger({ type: 'queue_size', size: 5 });
    await waitFor(() => expect(result!.currentQueueSize).toBe(5));
    trigger({ type: 'queue_size', size: 2 });
    await waitFor(() => expect(result!.currentQueueSize).toBe(2));
  });

  it('pushes events to eventHistory', async () => {
    const { worker, trigger } = createMockWorker();
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(worker, { maxHistory: 5 });
      return <span data-testid="count">{result!.eventHistory.length}</span>;
    }
    render(<TestComponent />);
    trigger({ type: 'task_start', taskId: 't1' });
    await waitFor(() => expect(result!.eventHistory.length).toBeGreaterThanOrEqual(1));
    expect(result!.eventHistory[result!.eventHistory.length - 1].type).toBe('task_start');
    trigger({ type: 'task_end', taskId: 't1', duration: 10 });
    await waitFor(() => expect(result!.eventHistory.length).toBeGreaterThanOrEqual(2));
  });

  it('progress aggregates running, completed, failed, totalProcessed', async () => {
    const { worker, trigger } = createMockWorker();
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(worker);
      return <div data-testid="progress">{JSON.stringify(result!.progress)}</div>;
    }
    render(<TestComponent />);
    trigger({ type: 'task_start', taskId: 't1' });
    trigger({ type: 'task_end', taskId: 't1', duration: 20 });
    trigger({ type: 'task_start', taskId: 't2' });
    trigger({ type: 'task_fail', taskId: 't2' });
    await waitFor(() => expect(result!.progress.completedCount).toBe(1));
    expect(result!.progress.failedCount).toBe(1);
    expect(result!.progress.totalProcessed).toBe(2);
    expect(result!.progress.runningTasks).toHaveLength(0);
    expect(result!.progress.averageDurationMs).toBe(20);
  });

  it('ignores messages with unknown type', async () => {
    const { worker, trigger } = createMockWorker();
    let result: ReturnType<typeof useWorkerNotifications> | null = null;
    function TestComponent() {
      result = useWorkerNotifications(worker);
      return <span data-testid="completed">{result!.completedCount}</span>;
    }
    render(<TestComponent />);
    trigger({ type: 'custom', foo: 1 });
    trigger({ type: 'task_end', taskId: 't1' });
    await waitFor(() => expect(result!.completedCount).toBe(1));
    expect(result!.eventHistory.length).toBe(1);
  });
});
