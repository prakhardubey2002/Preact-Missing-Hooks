/** @jsx h */
import { h } from 'preact'
import { render, waitFor } from '@testing-library/preact'
import { useMediaQuery } from '../src/useMediaQuery'

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  function createMockMediaQuery(matches: boolean, media = '(min-width: 768px)') {
    return {
      matches,
      media,
      onchange: null as ((e: MediaQueryListEvent) => void) | null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  }

  it('returns true when the query matches', () => {
    const mql = createMockMediaQuery(true)
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia

    function TestComponent() {
      const matches = useMediaQuery('(min-width: 768px)')
      return <span data-testid="matches">{String(matches)}</span>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('matches').textContent).toBe('true')
  })

  it('returns false when the query does not match', () => {
    const mql = createMockMediaQuery(false)
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia

    function TestComponent() {
      const matches = useMediaQuery('(min-width: 768px)')
      return <span data-testid="matches">{String(matches)}</span>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('matches').textContent).toBe('false')
  })

  it('updates when the media query change event fires', async () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null
    const mql = {
      matches: false,
      media: '(max-width: 600px)',
      onchange: null,
      addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia

    function TestComponent() {
      const matches = useMediaQuery('(max-width: 600px)')
      return <span data-testid="matches">{String(matches)}</span>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('matches').textContent).toBe('false')

    mql.matches = true
    changeHandler?.({ matches: true, media: '(max-width: 600px)' } as MediaQueryListEvent)

    await waitFor(() => {
      expect(getByTestId('matches').textContent).toBe('true')
    })
  })

  it('uses defaultMatches when matchMedia is unavailable', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia

    function TestComponent() {
      const matches = useMediaQuery('(min-width: 1px)', true)
      return <span data-testid="matches">{String(matches)}</span>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('matches').textContent).toBe('true')
  })

  it('re-subscribes when the query string changes', () => {
    const first = createMockMediaQuery(true, '(min-width: 500px)')
    const second = createMockMediaQuery(false, '(min-width: 1200px)')
    window.matchMedia = vi.fn((query: string) => {
      if (query.includes('1200')) return second
      return first
    }) as unknown as typeof window.matchMedia

    function TestComponent({ query }: { query: string }) {
      const matches = useMediaQuery(query)
      return <span data-testid="matches">{String(matches)}</span>
    }

    const { getByTestId, rerender } = render(<TestComponent query="(min-width: 500px)" />)
    expect(getByTestId('matches').textContent).toBe('true')

    rerender(<TestComponent query="(min-width: 1200px)" />)
    expect(getByTestId('matches').textContent).toBe('false')
    expect(first.removeEventListener).toHaveBeenCalled()
    expect(second.addEventListener).toHaveBeenCalled()
  })
})
