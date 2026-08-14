/** @jsx h */
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { render, fireEvent, waitFor } from '@testing-library/preact'
import { useDebounce } from '../src/useDebounce'

const isReact = !!(globalThis as unknown as { __VITEST_REACT__?: boolean }).__VITEST_REACT__

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    function TestComponent() {
      const debounced = useDebounce('hello', 300)
      return <span data-testid="value">{debounced}</span>
    }
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('value').textContent).toBe('hello')
  })

  it.skipIf(isReact)('updates the value after the delay', async () => {
    function TestComponent() {
      const [value, setValue] = useState('a')
      const debounced = useDebounce(value, 200)
      return (
        <div>
          <button onClick={() => setValue('b')}>Change</button>
          <span data-testid="raw">{value}</span>
          <span data-testid="debounced">{debounced}</span>
        </div>
      )
    }
    const { getByText, getByTestId } = render(<TestComponent />)
    fireEvent.click(getByText('Change'))
    expect(getByTestId('raw').textContent).toBe('b')
    expect(getByTestId('debounced').textContent).toBe('a')

    await vi.advanceTimersByTimeAsync(200)
    await waitFor(() => {
      expect(getByTestId('debounced').textContent).toBe('b')
    })
  })

  it.skipIf(isReact)('resets the timer when the value changes again before the delay', async () => {
    function TestComponent() {
      const [value, setValue] = useState(1)
      const debounced = useDebounce(value, 300)
      return (
        <div>
          <button onClick={() => setValue((n) => n + 1)}>Inc</button>
          <span data-testid="debounced">{debounced}</span>
        </div>
      )
    }
    const { getByText, getByTestId } = render(<TestComponent />)
    fireEvent.click(getByText('Inc'))
    await vi.advanceTimersByTimeAsync(200)
    fireEvent.click(getByText('Inc'))
    await vi.advanceTimersByTimeAsync(200)
    expect(getByTestId('debounced').textContent).toBe('1')

    await vi.advanceTimersByTimeAsync(100)
    await waitFor(() => {
      expect(getByTestId('debounced').textContent).toBe('3')
    })
  })

  it.skipIf(isReact)('debounces function calls until the delay elapses', async () => {
    const fn = vi.fn()
    function TestComponent() {
      const debounced = useDebounce(fn, 150)
      return <button onClick={() => debounced('x')}>Run</button>
    }
    const { getByText } = render(<TestComponent />)
    fireEvent.click(getByText('Run'))
    fireEvent.click(getByText('Run'))
    fireEvent.click(getByText('Run'))
    expect(fn).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(150)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('x')
  })

  it.skipIf(isReact)('cancel prevents a pending function call', async () => {
    const fn = vi.fn()
    function TestComponent() {
      const debounced = useDebounce(fn, 200)
      return (
        <div>
          <button onClick={() => debounced()}>Run</button>
          <button onClick={() => debounced.cancel()}>Cancel</button>
        </div>
      )
    }
    const { getByText } = render(<TestComponent />)
    fireEvent.click(getByText('Run'))
    fireEvent.click(getByText('Cancel'))
    await vi.advanceTimersByTimeAsync(300)
    expect(fn).not.toHaveBeenCalled()
  })

  it.skipIf(isReact)('flush immediately invokes a pending function call', async () => {
    const fn = vi.fn()
    function TestComponent() {
      const debounced = useDebounce(fn, 500)
      return (
        <div>
          <button onClick={() => debounced('now')}>Run</button>
          <button onClick={() => debounced.flush()}>Flush</button>
        </div>
      )
    }
    const { getByText } = render(<TestComponent />)
    fireEvent.click(getByText('Run'))
    fireEvent.click(getByText('Flush'))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('now')
    await vi.advanceTimersByTimeAsync(500)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
