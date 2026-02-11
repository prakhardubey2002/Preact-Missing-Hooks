/** @jsx h */
import { h } from 'preact'
import { render, waitFor } from '@testing-library/preact'
import '@testing-library/jest-dom'
import { useThreadedWorker } from '@/useThreadedWorker'

/** Worker that resolves after delay with the input value (for order/concurrency tests). */
function delayedWorker<T>(delayMs: number) {
  return (data: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(data), delayMs))
}

describe('useThreadedWorker', () => {
  describe('sequential mode', () => {
    it('runs one task at a time and returns result', async () => {
      const worker = vi.fn().mockResolvedValue('done')
      let api: ReturnType<typeof useThreadedWorker<string, string>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'sequential' })
        return (
          <div>
            <span data-testid="loading">{String(api!.loading)}</span>
            <span data-testid="result">{api!.result ?? ''}</span>
            <span data-testid="queueSize">{api!.queueSize}</span>
          </div>
        )
      }

      render(<TestComponent />)
      expect(api!.loading).toBe(false)
      expect(api!.result).toBeUndefined()
      expect(api!.queueSize).toBe(0)

      const p = api!.run('a')
      await waitFor(() => expect(api!.loading).toBe(true))
      await waitFor(() => expect(api!.queueSize).toBe(1))

      await waitFor(() => expect(worker).toHaveBeenCalledWith('a'))
      await p
      await waitFor(() => {
        expect(api!.result).toBe('done')
        expect(api!.loading).toBe(false)
        expect(api!.queueSize).toBe(0)
      })
    })

    it('processes tasks in priority order (lower number first)', async () => {
      const order: number[] = []
      const worker = (data: { id: number }) =>
        new Promise<number>((resolve) => {
          order.push(data.id)
          setTimeout(() => resolve(data.id), 10)
        })

      let api: ReturnType<typeof useThreadedWorker<{ id: number }, number>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'sequential' })
        return <div data-testid="queueSize">{api!.queueSize}</div>
      }

      render(<TestComponent />)
      // Enqueue all in one tick; processNext runs in microtask so queue is sorted by priority.
      // Submission order: 100(p2), 200(p1), 300(p3). Execution order must be 200, 100, 300.
      api!.run({ id: 100 }, { priority: 2 })
      api!.run({ id: 200 }, { priority: 1 })
      api!.run({ id: 300 }, { priority: 3 })

      await waitFor(() => expect(order).toHaveLength(3))
      expect(order).toEqual([200, 100, 300]) // priority 1, then 2, then 3
    })

    it('FIFO within same priority', async () => {
      const order: number[] = []
      const worker = (data: number) =>
        new Promise<number>((resolve) => {
          order.push(data)
          setTimeout(() => resolve(data), 5)
        })

      let api: ReturnType<typeof useThreadedWorker<number, number>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'sequential' })
        return null
      }

      render(<TestComponent />)
      api!.run(1, { priority: 1 })
      api!.run(2, { priority: 1 })
      api!.run(3, { priority: 1 })

      await waitFor(() => expect(order).toEqual([1, 2, 3]))
    })

    it('run() returns a Promise that resolves with worker result', async () => {
      const worker = (x: number) => Promise.resolve(x * 2)
      let api: ReturnType<typeof useThreadedWorker<number, number>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'sequential' })
        return null
      }

      render(<TestComponent />)
      const result = await api!.run(21)
      expect(result).toBe(42)
    })

    it('sets error when worker rejects', async () => {
      const err = new Error('worker failed')
      const worker = () => Promise.reject(err)
      let api: ReturnType<typeof useThreadedWorker<void, void>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'sequential' })
        return (
          <div>
            <span data-testid="error">{(api!.error as Error)?.message ?? ''}</span>
          </div>
        )
      }

      render(<TestComponent />)
      api!.run(undefined).catch(() => { })
      await waitFor(() => expect(api!.error).toBe(err))
      expect((api!.error as Error).message).toBe('worker failed')
    })

    it('clearQueue rejects pending tasks and leaves running task to finish', async () => {
      const worker = delayedWorker<string>(100)
      let api: ReturnType<typeof useThreadedWorker<string, string>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'sequential' })
        return null
      }

      render(<TestComponent />)
      const first = api!.run('running')
      const pending1 = api!.run('pending1')
      const pending2 = api!.run('pending2')
      await waitFor(() => expect(api!.queueSize).toBeGreaterThanOrEqual(2))

      api!.clearQueue()
      await expect(pending1.catch((e: Error) => e.message)).resolves.toBe(
        'Task cleared from queue'
      )
      await expect(pending2.catch((e: Error) => e.message)).resolves.toBe(
        'Task cleared from queue'
      )
      await expect(first).resolves.toBe('running')
    })

    it('terminate clears queue and rejects new run()', async () => {
      const worker = (x: string) => Promise.resolve(x)
      let api: ReturnType<typeof useThreadedWorker<string, string>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'sequential' })
        return null
      }

      render(<TestComponent />)
      api!.terminate()
      await expect(api!.run('x').catch((e: Error) => e.message)).resolves.toBe(
        'Worker is terminated'
      )
    })
  })

  describe('parallel mode', () => {
    it('runs up to concurrency tasks at once', async () => {
      let concurrent = 0
      let maxSeen = 0
      const worker = async (id: number) => {
        concurrent += 1
        maxSeen = Math.max(maxSeen, concurrent)
        await new Promise((r) => setTimeout(r, 30))
        concurrent -= 1
        return id
      }

      let api: ReturnType<typeof useThreadedWorker<number, number>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'parallel', concurrency: 3 })
        return <span data-testid="queueSize">{api!.queueSize}</span>
      }

      render(<TestComponent />)
      api!.run(1)
      api!.run(2)
      api!.run(3)
      api!.run(4)
      api!.run(5)

      await waitFor(() => expect(maxSeen).toBe(3))
      expect(api!.queueSize).toBeGreaterThanOrEqual(0)
      await waitFor(() => expect(api!.loading).toBe(false))
      expect(api!.result).toBe(5) // last to finish in typical scheduling
    })

    it('processes all tasks in parallel and drains queue', async () => {
      const worker = (data: { id: number }) =>
        new Promise<number>((resolve) => setTimeout(() => resolve(data.id), 20))

      let api: ReturnType<typeof useThreadedWorker<{ id: number }, number>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'parallel', concurrency: 2 })
        return null
      }

      render(<TestComponent />)
      const [r1, r2, r3] = await Promise.all([
        api!.run({ id: 1 }, { priority: 2 }),
        api!.run({ id: 2 }, { priority: 1 }),
        api!.run({ id: 3 }, { priority: 1 }),
      ])
      expect([r1, r2, r3].sort((a, b) => a - b)).toEqual([1, 2, 3])
      await waitFor(() => {
        expect(api!.queueSize).toBe(0)
        expect(api!.loading).toBe(false)
      })
    })

    it('queueSize reflects pending + running', async () => {
      const worker = delayedWorker<number>(40)
      let api: ReturnType<typeof useThreadedWorker<number, number>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'parallel', concurrency: 2 })
        return <span data-testid="queueSize">{api!.queueSize}</span>
      }

      render(<TestComponent />)
      api!.run(1)
      api!.run(2)
      api!.run(3)
      await waitFor(() => expect(api!.queueSize).toBe(3))
      await waitFor(() => expect(api!.queueSize).toBeLessThanOrEqual(2))
      await waitFor(() => expect(api!.queueSize).toBe(0))
    })

    it('run() Promise resolves with correct result in parallel', async () => {
      const worker = (x: number) => Promise.resolve(x * 10)
      let api: ReturnType<typeof useThreadedWorker<number, number>>

      function TestComponent() {
        api = useThreadedWorker(worker, { mode: 'parallel', concurrency: 2 })
        return null
      }

      render(<TestComponent />)
      const [a, b, c] = await Promise.all([
        api!.run(1),
        api!.run(2),
        api!.run(3),
      ])
      expect(a).toBe(10)
      expect(b).toBe(20)
      expect(c).toBe(30)
    })
  })
})
