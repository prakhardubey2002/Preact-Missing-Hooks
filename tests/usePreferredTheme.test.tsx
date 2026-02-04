/** @jsx h */
import { h } from 'preact'
import { render, waitFor } from '@testing-library/preact'
import { usePreferredTheme } from '../src/usePreferredTheme'

describe('usePreferredTheme', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  function createMockMediaQuery(matches: boolean) {
    return {
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null as ((e: MediaQueryListEvent) => void) | null,
      addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
        ; (createMockMediaQuery as any)._handler = handler
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  }

  it('returns "dark" when prefers-color-scheme: dark matches', () => {
    const darkQuery = createMockMediaQuery(true)
    const lightQuery = createMockMediaQuery(false)

    window.matchMedia = vi.fn((query: string) => {
      if (query.includes('dark')) return darkQuery
      return lightQuery
    }) as any

    function TestComponent() {
      const theme = usePreferredTheme()
      return <div data-testid="theme">{theme}</div>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('theme').textContent).toBe('dark')
  })

  it('returns "light" when prefers-color-scheme: light matches', () => {
    const darkQuery = createMockMediaQuery(false)
    const lightQuery = createMockMediaQuery(true)

    window.matchMedia = vi.fn((query: string) => {
      if (query.includes('dark')) return darkQuery
      return lightQuery
    }) as any

    function TestComponent() {
      const theme = usePreferredTheme()
      return <div data-testid="theme">{theme}</div>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('theme').textContent).toBe('light')
  })

  it('returns "no-preference" when neither dark nor light matches', () => {
    const darkQuery = createMockMediaQuery(false)
    const lightQuery = createMockMediaQuery(false)

    window.matchMedia = vi.fn((query: string) => {
      if (query.includes('dark')) return darkQuery
      return lightQuery
    }) as any

    function TestComponent() {
      const theme = usePreferredTheme()
      return <div data-testid="theme">{theme}</div>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('theme').textContent).toBe('no-preference')
  })

  it('updates when media query change event fires', async () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null
    const darkQuery = {
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    const lightQuery = createMockMediaQuery(false)

    window.matchMedia = vi.fn((query: string) => {
      if (query.includes('dark')) return darkQuery
      return lightQuery
    }) as any

    function TestComponent() {
      const theme = usePreferredTheme()
      return <div data-testid="theme">{theme}</div>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('theme').textContent).toBe('dark')

      // Simulate user switching to light mode
      ; (darkQuery as any).matches = false
    changeHandler?.({ matches: false, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent)

    await waitFor(() => {
      expect(getByTestId('theme').textContent).toBe('light')
    })
  })
})
