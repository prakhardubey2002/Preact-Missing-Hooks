/** @jsx h */
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { render, fireEvent, waitFor } from '@testing-library/preact'
import { useClipboard } from '../src/useClipboard'

const isReact = !!(globalThis as unknown as { __VITEST_REACT__?: boolean }).__VITEST_REACT__

describe('useClipboard', () => {
  const originalNavigator = global.navigator

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    vi.useRealTimers()
  })

  it.skipIf(isReact)('copy succeeds and sets copied to true', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, clipboard: { writeText } },
      writable: true,
    })

    function TestComponent() {
      const { copy, copied } = useClipboard({ resetDelay: 1000 })
      return (
        <div>
          <button onClick={() => copy('test')}>Copy</button>
          <span data-testid="copied">{String(copied)}</span>
        </div>
      )
    }

    const { getByText, getByTestId } = render(<TestComponent />)
    expect(getByTestId('copied').textContent).toBe('false')

    fireEvent.click(getByText('Copy'))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('test')
    })
    await waitFor(() => {
      expect(getByTestId('copied').textContent).toBe('true')
    })

    vi.advanceTimersByTime(1000)
    await waitFor(() => {
      expect(getByTestId('copied').textContent).toBe('false')
    })
  })

  it('copy returns false and sets error when clipboard API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'))
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, clipboard: { writeText } },
      writable: true,
    })

    function TestComponent() {
      const { copy, error } = useClipboard()
      return (
        <div>
          <button onClick={() => copy('test')}>Copy</button>
          <span data-testid="error">{error?.message ?? 'none'}</span>
        </div>
      )
    }

    const { getByText, getByTestId } = render(<TestComponent />)
    fireEvent.click(getByText('Copy'))

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('Permission denied')
    })
  })

  it('paste returns text when clipboard API succeeds', async () => {
    const readText = vi.fn().mockResolvedValue('pasted content')
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, clipboard: { writeText: vi.fn(), readText } },
      writable: true,
    })

    function TestComponent() {
      const [text, setText] = useState('')
      const { paste } = useClipboard()
      const handlePaste = async () => {
        const result = await paste()
        setText(result)
      }
      return (
        <div>
          <button onClick={handlePaste}>Paste</button>
          <span data-testid="text">{text}</span>
        </div>
      )
    }

    const { getByText, getByTestId } = render(<TestComponent />)

    fireEvent.click(getByText('Paste'))
    await waitFor(() => {
      expect(readText).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(getByTestId('text').textContent).toBe('pasted content')
    })
  })

  it.skipIf(isReact)('reset clears copied and error state', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, clipboard: { writeText } },
      writable: true,
    })

    function TestComponent() {
      const { copy, copied, reset } = useClipboard({ resetDelay: 5000 })
      return (
        <div>
          <button onClick={() => copy('test')}>Copy</button>
          <button onClick={reset}>Reset</button>
          <span data-testid="copied">{String(copied)}</span>
        </div>
      )
    }

    const { getByText, getByTestId } = render(<TestComponent />)
    fireEvent.click(getByText('Copy'))
    await waitFor(() => expect(getByTestId('copied').textContent).toBe('true'))
    fireEvent.click(getByText('Reset'))
    expect(getByTestId('copied').textContent).toBe('false')
  })

  it('handles missing clipboard API', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, clipboard: undefined },
      writable: true,
    })

    function TestComponent() {
      const { copy, error } = useClipboard()
      return (
        <div>
          <button onClick={() => copy('test')}>Copy</button>
          <span data-testid="error">{error?.message ?? 'none'}</span>
        </div>
      )
    }

    const { getByText, getByTestId } = render(<TestComponent />)
    fireEvent.click(getByText('Copy'))
    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('Clipboard API is not available')
    })
  })
})
