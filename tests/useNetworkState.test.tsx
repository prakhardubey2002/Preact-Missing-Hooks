/** @jsx h */
import { h } from 'preact'
import { render, waitFor } from '@testing-library/preact'
import { useNetworkState } from '../src/useNetworkState'

describe('useNetworkState', () => {
  const originalNavigator = global.navigator
  const originalAddEventListener = window.addEventListener
  const originalRemoveEventListener = window.removeEventListener

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
  })

  it('returns online: true when navigator.onLine is true', () => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: true },
      writable: true,
    })

    function TestComponent() {
      const state = useNetworkState()
      return (
        <div>
          <span data-testid="online">{String(state.online)}</span>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('online').textContent).toBe('true')
  })

  it('returns online: false when navigator.onLine is false', () => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: false },
      writable: true,
    })

    function TestComponent() {
      const state = useNetworkState()
      return (
        <div>
          <span data-testid="online">{String(state.online)}</span>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('online').textContent).toBe('false')
  })

  it('includes connection info when navigator.connection is available', () => {
    const mockConnection = {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      type: 'wifi',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        onLine: true,
        connection: mockConnection,
      },
      writable: true,
    })

    function TestComponent() {
      const state = useNetworkState()
      return (
        <div>
          <span data-testid="effectiveType">{state.effectiveType ?? 'none'}</span>
          <span data-testid="downlink">{state.downlink ?? 'none'}</span>
          <span data-testid="rtt">{state.rtt ?? 'none'}</span>
          <span data-testid="saveData">{String(state.saveData ?? 'none')}</span>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('effectiveType').textContent).toBe('4g')
    expect(getByTestId('downlink').textContent).toBe('10')
    expect(getByTestId('rtt').textContent).toBe('50')
    expect(getByTestId('saveData').textContent).toBe('false')
  })

  it('updates when online/offline events fire', async () => {
    let onlineHandler: () => void = () => { }
    let offlineHandler: () => void = () => { }

    window.addEventListener = vi.fn((event: string, handler: () => void) => {
      if (event === 'online') onlineHandler = handler
      if (event === 'offline') offlineHandler = handler
    }) as any
    window.removeEventListener = vi.fn()

    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: true },
      writable: true,
    })

    function TestComponent() {
      const state = useNetworkState()
      return <span data-testid="online">{String(state.online)}</span>
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('online').textContent).toBe('true')

    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: false },
      writable: true,
    })
    offlineHandler()

    await waitFor(() => {
      expect(getByTestId('online').textContent).toBe('false')
    })

    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: true },
      writable: true,
    })
    onlineHandler()

    await waitFor(() => {
      expect(getByTestId('online').textContent).toBe('true')
    })
  })
})
