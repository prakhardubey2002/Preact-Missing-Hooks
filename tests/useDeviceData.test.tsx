/** @jsx h */
import { h } from 'preact'
import { render, waitFor } from '@testing-library/preact'
import { getDeviceData, useDeviceData } from '../src/useDeviceData'

describe('getDeviceData', () => {
  const originalNavigator = global.navigator
  const originalScreen = global.screen
  const originalWindow = global.window

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    Object.defineProperty(global, 'screen', {
      value: originalScreen,
      writable: true,
    })
    global.window = originalWindow
  })

  it('returns SSR-safe defaults when navigator is undefined', () => {
    vi.stubGlobal('navigator', undefined)
    const data = getDeviceData()
    vi.unstubAllGlobals()
    expect(data.userAgent).toBe('')
    expect(data.online).toBe(true)
    expect(data.viewport.width).toBe(0)
  })

  it('reads navigator and screen fields', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'TestAgent/1.0',
        language: 'en-US',
        languages: ['en-US', 'en'],
        platform: 'Win32',
        cookieEnabled: true,
        onLine: true,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        vendor: 'TestVendor',
      },
      writable: true,
    })
    Object.defineProperty(global, 'screen', {
      value: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
      },
      writable: true,
    })

    const data = getDeviceData()
    expect(data.userAgent).toBe('TestAgent/1.0')
    expect(data.language).toBe('en-US')
    expect(data.languages).toEqual(['en-US', 'en'])
    expect(data.platform).toBe('Win32')
    expect(data.hardwareConcurrency).toBe(8)
    expect(data.deviceMemory).toBe(8)
    expect(data.screen.width).toBe(1920)
    expect(data.screen.height).toBe(1080)
    expect(data.touch).toBe(false)
  })

  it('includes userAgentData when navigator.userAgentData exists', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        userAgentData: {
          mobile: true,
          platform: 'Android',
          brands: [{ brand: 'Chromium', version: '120' }],
        },
      },
      writable: true,
    })

    const data = getDeviceData()
    expect(data.userAgentData?.mobile).toBe(true)
    expect(data.userAgentData?.platform).toBe('Android')
    expect(data.userAgentData?.brands[0]?.brand).toBe('Chromium')
  })
})

describe('useDeviceData', () => {
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

  it('returns device data from navigator', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        userAgent: 'HookTest/2.0',
        language: 'fr',
        languages: ['fr'],
        platform: 'MacIntel',
        cookieEnabled: true,
        onLine: true,
        maxTouchPoints: 5,
        vendor: 'Apple',
      },
      writable: true,
    })

    function TestComponent() {
      const device = useDeviceData({ includeBattery: false })
      return (
        <div>
          <span data-testid="ua">{device.userAgent}</span>
          <span data-testid="lang">{device.language}</span>
          <span data-testid="touch">{String(device.touch)}</span>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('ua').textContent).toBe('HookTest/2.0')
    expect(getByTestId('lang').textContent).toBe('fr')
    expect(getByTestId('touch').textContent).toBe('true')
  })

  it('updates viewport on resize', async () => {
    let resizeHandler: () => void = () => {}
    window.addEventListener = vi.fn((event: string, handler: () => void) => {
      if (event === 'resize') resizeHandler = handler
    }) as typeof window.addEventListener
    window.removeEventListener = vi.fn()

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    })

    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: true },
      writable: true,
    })

    function TestComponent() {
      const device = useDeviceData({ includeBattery: false })
      return (
        <span data-testid="vw">{device.viewport.width}</span>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('vw').textContent).toBe('800')

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    })
    resizeHandler()

    await waitFor(() => {
      expect(getByTestId('vw').textContent).toBe('1024')
    })
  })

  it('merges battery data when getBattery resolves', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        onLine: true,
        getBattery: () =>
          Promise.resolve({ charging: true, level: 0.75 }),
      },
      writable: true,
    })

    function TestComponent() {
      const device = useDeviceData({
        includeBattery: true,
        batteryPollIntervalMs: 0,
      })
      return (
        <span data-testid="battery">
          {device.battery
            ? `${device.battery.charging}-${device.battery.level}`
            : 'none'}
        </span>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    await waitFor(
      () => {
        expect(getByTestId('battery').textContent).toBe('true-0.75')
      },
      { timeout: 3000 },
    )
  })
})
