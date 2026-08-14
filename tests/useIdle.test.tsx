/** @jsx h */
import { h } from 'preact'
import { render, fireEvent, waitFor } from '@testing-library/preact'
import { useIdle } from '../src/useIdle'

const isReact = !!(globalThis as unknown as { __VITEST_REACT__?: boolean }).__VITEST_REACT__

describe('useIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts as not idle by default', () => {
    function TestComponent() {
      const { idle } = useIdle(1000)
      return <span data-testid="idle">{String(idle)}</span>
    }
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('idle').textContent).toBe('false')
  })

  it('respects initialState: true', () => {
    function TestComponent() {
      const { idle } = useIdle(1000, { initialState: true })
      return <span data-testid="idle">{String(idle)}</span>
    }
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('idle').textContent).toBe('true')
  })

  it.skipIf(isReact)('becomes idle after the timeout with no activity', async () => {
    function TestComponent() {
      const { idle } = useIdle(500)
      return <span data-testid="idle">{String(idle)}</span>
    }
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('idle').textContent).toBe('false')

    await vi.advanceTimersByTimeAsync(500)
    await waitFor(() => {
      expect(getByTestId('idle').textContent).toBe('true')
    })
  })

  it.skipIf(isReact)('activity before timeout keeps the user active', async () => {
    function TestComponent() {
      const { idle } = useIdle(400)
      return <span data-testid="idle">{String(idle)}</span>
    }
    const { getByTestId } = render(<TestComponent />)

    await vi.advanceTimersByTimeAsync(300)
    window.dispatchEvent(new Event('mousemove'))
    await vi.advanceTimersByTimeAsync(300)
    expect(getByTestId('idle').textContent).toBe('false')

    await vi.advanceTimersByTimeAsync(100)
    await waitFor(() => {
      expect(getByTestId('idle').textContent).toBe('true')
    })
  })

  it.skipIf(isReact)('activity after idle returns to active', async () => {
    function TestComponent() {
      const { idle } = useIdle(200)
      return <span data-testid="idle">{String(idle)}</span>
    }
    const { getByTestId } = render(<TestComponent />)

    await vi.advanceTimersByTimeAsync(200)
    await waitFor(() => {
      expect(getByTestId('idle').textContent).toBe('true')
    })

    window.dispatchEvent(new Event('keydown'))
    await waitFor(() => {
      expect(getByTestId('idle').textContent).toBe('false')
    })
  })

  it.skipIf(isReact)('reset() marks the user as active and restarts the timer', async () => {
    function TestComponent() {
      const { idle, reset } = useIdle(200)
      return (
        <div>
          <span data-testid="idle">{String(idle)}</span>
          <button onClick={reset}>Reset</button>
        </div>
      )
    }
    const { getByTestId, getByText } = render(<TestComponent />)

    await vi.advanceTimersByTimeAsync(200)
    await waitFor(() => {
      expect(getByTestId('idle').textContent).toBe('true')
    })

    fireEvent.click(getByText('Reset'))
    expect(getByTestId('idle').textContent).toBe('false')

    await vi.advanceTimersByTimeAsync(200)
    await waitFor(() => {
      expect(getByTestId('idle').textContent).toBe('true')
    })
  })

  it('exposes lastActive as a number', () => {
    function TestComponent() {
      const { lastActive } = useIdle(1000)
      return <span data-testid="ts">{lastActive}</span>
    }
    const { getByTestId } = render(<TestComponent />)
    expect(Number(getByTestId('ts').textContent)).toBeGreaterThan(0)
  })
})
