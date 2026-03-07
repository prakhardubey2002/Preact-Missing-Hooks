/** @jsx h */
import { h } from 'preact'
import { render, waitFor } from '@testing-library/preact'
import { usePoll } from '../src/usePoll'

const isReact = !!(globalThis as unknown as { __VITEST_REACT__?: boolean }).__VITEST_REACT__

describe('usePoll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it.skipIf(isReact)('returns data and done when pollFn returns done: true with data', async () => {
    const pollFn = vi.fn()
      .mockResolvedValueOnce({ done: false })
      .mockResolvedValueOnce({ done: true, data: { ok: true } })
    function TestComponent() {
      const { data, done, pollCount } = usePoll(pollFn, { intervalMs: 100, immediate: true })
      return (
        <div>
          <span data-testid="done">{String(done)}</span>
          <span data-testid="count">{pollCount}</span>
          <span data-testid="data">{data ? JSON.stringify(data) : 'null'}</span>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    await vi.runAllTimersAsync()
    await waitFor(() => {
      expect(getByTestId('done').textContent).toBe('true')
      expect(getByTestId('data').textContent).toBe('{"ok":true}')
    })
    expect(pollFn).toHaveBeenCalled()
  })

  it.skipIf(isReact)('stops polling when done: true', async () => {
    const pollFn = vi.fn().mockResolvedValue({ done: false })
    function TestComponent() {
      const { done, pollCount } = usePoll(pollFn, { intervalMs: 50, immediate: true })
      return (
        <div>
          <span data-testid="done">{String(done)}</span>
          <span data-testid="count">{pollCount}</span>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    await vi.advanceTimersByTimeAsync(150)
    const countBefore = Number(getByTestId('count').textContent)
    pollFn.mockResolvedValue({ done: true })
    await vi.advanceTimersByTimeAsync(100)
    await waitFor(() => {
      expect(getByTestId('done').textContent).toBe('true')
    })
    const countAfter = Number(getByTestId('count').textContent)
    expect(countAfter).toBeGreaterThanOrEqual(countBefore + 1)
    const callsAfterDone = pollFn.mock.calls.length
    await vi.advanceTimersByTimeAsync(200)
    expect(pollFn.mock.calls.length).toBe(callsAfterDone)
  })

  it.skipIf(isReact)('sets error and stops when pollFn throws', async () => {
    const err = new Error('poll failed')
    const pollFn = vi.fn().mockRejectedValue(err)
    function TestComponent() {
      const { error, done } = usePoll(pollFn, { intervalMs: 100, immediate: true })
      return (
        <div>
          <span data-testid="done">{String(done)}</span>
          <span data-testid="error">{error?.message ?? 'none'}</span>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    await vi.advanceTimersByTimeAsync(0)
    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('poll failed')
    })
  })

  it('does not start when enabled: false', async () => {
    const pollFn = vi.fn().mockResolvedValue({ done: false })
    function TestComponent() {
      const { pollCount } = usePoll(pollFn, { intervalMs: 100, immediate: true, enabled: false })
      return <span data-testid="count">{pollCount}</span>
    }
    const { getByTestId } = render(<TestComponent />)
    await vi.advanceTimersByTimeAsync(500)
    expect(getByTestId('count').textContent).toBe('0')
    expect(pollFn).not.toHaveBeenCalled()
  })

  it('exposes start and stop', () => {
    const pollFn = vi.fn().mockResolvedValue({ done: false })
    let startFn: () => void
    let stopFn: () => void
    function TestComponent() {
      const result = usePoll(pollFn, { intervalMs: 1000, immediate: false, enabled: false })
      startFn = result.start
      stopFn = result.stop
      return <span data-testid="count">{result.pollCount}</span>
    }
    render(<TestComponent />)
    expect(typeof startFn!).toBe('function')
    expect(typeof stopFn!).toBe('function')
  })
})
