/** @jsx h */
import { h } from 'preact'
import { render, fireEvent } from '@testing-library/preact'
import { useHoneypot } from '../src/useHoneypot'

describe('useHoneypot', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows a normal submit when the decoy is empty and enough time passed', () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    function TestComponent() {
      const { honeypotProps, protect } = useHoneypot({ minTimeMs: 100 })
      return (
        <form onSubmit={protect(onSubmit)}>
          <input {...honeypotProps} data-testid="honeypot" />
          <button type="submit">Send</button>
        </form>
      )
    }
    const { getByText } = render(<TestComponent />)
    vi.advanceTimersByTime(150)
    fireEvent.submit(getByText('Send').closest('form')!)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('blocks when the decoy field is filled (action: block)', () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    const onTrigger = vi.fn()
    function TestComponent() {
      const { honeypotProps, protect, triggered } = useHoneypot({
        minTimeMs: 0,
        action: 'block',
        onTrigger,
      })
      return (
        <form onSubmit={protect(onSubmit)}>
          <input {...honeypotProps} data-testid="honeypot" />
          <span data-testid="triggered">{String(triggered)}</span>
          <button type="submit">Send</button>
        </form>
      )
    }
    const { getByTestId, getByText } = render(<TestComponent />)
    fireEvent.input(getByTestId('honeypot'), { target: { value: 'http://spam.bot' } })
    fireEvent.submit(getByText('Send').closest('form')!)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'filled', value: 'http://spam.bot' })
    )
    expect(getByTestId('triggered').textContent).toBe('true')
  })

  it('silently skips the handler when action is silent', () => {
    const onSubmit = vi.fn()
    function TestComponent() {
      const { honeypotProps, protect } = useHoneypot({
        minTimeMs: 0,
        action: 'silent',
      })
      return (
        <form onSubmit={protect(onSubmit)}>
          <input {...honeypotProps} data-testid="honeypot" />
          <button type="submit">Send</button>
        </form>
      )
    }
    const { getByTestId, getByText } = render(<TestComponent />)
    fireEvent.input(getByTestId('honeypot'), { target: { value: 'bot' } })
    fireEvent.submit(getByText('Send').closest('form')!)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still runs the handler when action is allow, but marks triggered', () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    const onTrigger = vi.fn()
    function TestComponent() {
      const { honeypotProps, protect, triggered } = useHoneypot({
        minTimeMs: 0,
        action: 'allow',
        onTrigger,
      })
      return (
        <form onSubmit={protect(onSubmit)}>
          <input {...honeypotProps} data-testid="honeypot" />
          <span data-testid="triggered">{String(triggered)}</span>
          <button type="submit">Send</button>
        </form>
      )
    }
    const { getByTestId, getByText } = render(<TestComponent />)
    fireEvent.input(getByTestId('honeypot'), { target: { value: 'bot' } })
    fireEvent.submit(getByText('Send').closest('form')!)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onTrigger).toHaveBeenCalled()
    expect(getByTestId('triggered').textContent).toBe('true')
  })

  it('blocks too-fast submissions when minTimeMs is set', () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    const onTrigger = vi.fn()
    function TestComponent() {
      const { protect } = useHoneypot({
        minTimeMs: 500,
        action: 'block',
        onTrigger,
      })
      return (
        <form onSubmit={protect(onSubmit)}>
          <button type="submit">Send</button>
        </form>
      )
    }
    const { getByText } = render(<TestComponent />)
    fireEvent.submit(getByText('Send').closest('form')!)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'too-fast' })
    )

    vi.advanceTimersByTime(500)
    fireEvent.submit(getByText('Send').closest('form')!)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('exposes check() and reset()', async () => {
    let api: ReturnType<typeof useHoneypot> | null = null
    function TestComponent() {
      api = useHoneypot({ minTimeMs: 0 })
      return (
        <div>
          <input {...api.honeypotProps} data-testid="honeypot" />
          <span data-testid="triggered">{String(api.triggered)}</span>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    expect(api!.check()).toBeNull()
    fireEvent.input(getByTestId('honeypot'), { target: { value: 'x' } })
    expect(api!.check()?.reason).toBe('filled')
    api!.reset()
    expect(api!.check()).toBeNull()
    await vi.waitFor(() => {
      expect(getByTestId('triggered').textContent).toBe('false')
    })
  })

  it('hides the decoy field from assistive tech and tab order', () => {
    function TestComponent() {
      const { honeypotProps } = useHoneypot()
      return <input {...honeypotProps} data-testid="honeypot" />
    }
    const { getByTestId } = render(<TestComponent />)
    const el = getByTestId('honeypot') as HTMLInputElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.tabIndex).toBe(-1)
    expect(el.name).toBe('website')
  })
})
