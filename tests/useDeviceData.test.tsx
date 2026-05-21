/** @jsx h */
import { h } from 'preact'
import { render, waitFor } from '@testing-library/preact'
import { getDeviceData, parseUserAgent, useDeviceData } from '../src/useDeviceData'

const CHROME_WIN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

describe('parseUserAgent', () => {
  it('parses Chrome on Windows', () => {
    const parsed = parseUserAgent(CHROME_WIN_UA)
    expect(parsed.browser).toEqual({ name: 'Chrome', version: '120.0.0.0' })
    expect(parsed.os).toEqual({ name: 'Windows', version: '10.0' })
  })

  it('parses Firefox on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    const parsed = parseUserAgent(ua)
    expect(parsed.browser.name).toBe('Firefox')
    expect(parsed.browser.version).toBe('121.0')
    expect(parsed.os.name).toBe('macOS')
    expect(parsed.os.version).toBe('10.15')
  })

  it('parses Safari on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    const parsed = parseUserAgent(ua)
    expect(parsed.browser.name).toBe('Safari')
    expect(parsed.browser.version).toBe('17.2')
    expect(parsed.os.name).toBe('iOS')
    expect(parsed.os.version).toBe('17.2')
  })

  it('parses Edge from user-agent', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    const parsed = parseUserAgent(ua)
    expect(parsed.browser.name).toBe('Edge')
    expect(parsed.browser.version).toBe('120.0.0.0')
  })
})

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
    expect(data.browser).toEqual({ name: 'Unknown', version: '' })
    expect(data.os).toEqual({ name: 'Unknown', version: '' })
    expect(data.online).toBe(true)
    expect(data.viewport.width).toBe(0)
  })

  it('reads navigator, browser, OS, and screen fields', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: CHROME_WIN_UA,
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
    expect(data.userAgent).toBe(CHROME_WIN_UA)
    expect(data.browser.name).toBe('Chrome')
    expect(data.browser.version).toBe('120.0.0.0')
    expect(data.os.name).toBe('Windows')
    expect(data.os.version).toBe('10.0')
    expect(data.language).toBe('en-US')
    expect(data.platform).toBe('Win32')
    expect(data.hardwareConcurrency).toBe(8)
    expect(data.screen.width).toBe(1920)
    expect(data.touch).toBe(false)
  })

  it('prefers Client Hints brands over user-agent for browser name', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        userAgent:
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0',
        userAgentData: {
          mobile: true,
          platform: 'Android',
          brands: [
            { brand: 'Not A Brand', version: '99' },
            { brand: 'Google Chrome', version: '120.0.0.0' },
          ],
        },
      },
      writable: true,
    })

    const data = getDeviceData()
    expect(data.userAgentData?.mobile).toBe(true)
    expect(data.browser.name).toBe('Google Chrome')
    expect(data.browser.version).toBe('120.0.0.0')
    expect(data.os.name).toBe('Android')
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

  it('returns browser and OS from navigator user-agent', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        userAgent: CHROME_WIN_UA,
        language: 'fr',
        languages: ['fr'],
        platform: 'Win32',
        cookieEnabled: true,
        onLine: true,
        maxTouchPoints: 0,
        vendor: 'Google Inc.',
      },
      writable: true,
    })

    function TestComponent() {
      const device = useDeviceData({
        includeBattery: false,
        includeHighEntropy: false,
      })
      return (
        <div>
          <span data-testid="browser">
            {device.browser.name}:{device.browser.version}
          </span>
          <span data-testid="os">
            {device.os.name}:{device.os.version}
          </span>
          <span data-testid="lang">{device.language}</span>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('browser').textContent).toBe('Chrome:120.0.0.0')
    expect(getByTestId('os').textContent).toBe('Windows:10.0')
    expect(getByTestId('lang').textContent).toBe('fr')
  })

  it('enriches browser and OS version from getHighEntropyValues', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        userAgent: CHROME_WIN_UA,
        userAgentData: {
          platform: 'Windows',
          brands: [{ brand: 'Google Chrome', version: '120.0.0.0' }],
          getHighEntropyValues: vi.fn().mockResolvedValue({
            platformVersion: '15.0.0',
            fullVersionList: [
              { brand: 'Google Chrome', version: '120.0.6099.130' },
            ],
          }),
        },
      },
      writable: true,
    })

    function TestComponent() {
      const device = useDeviceData({
        includeBattery: false,
        includeHighEntropy: true,
      })
      return (
        <div>
          <span data-testid="browser">
            {device.browser.name}:{device.browser.version}
          </span>
          <span data-testid="os">
            {device.os.name}:{device.os.version}
          </span>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)
    await waitFor(() => {
      expect(getByTestId('browser').textContent).toBe(
        'Google Chrome:120.0.6099.130',
      )
      expect(getByTestId('os').textContent).toBe('Windows:15.0.0')
    })
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
      value: { ...originalNavigator, onLine: true, userAgent: CHROME_WIN_UA },
      writable: true,
    })

    function TestComponent() {
      const device = useDeviceData({
        includeBattery: false,
        includeHighEntropy: false,
      })
      return <span data-testid="vw">{device.viewport.width}</span>
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
        userAgent: CHROME_WIN_UA,
        getBattery: () =>
          Promise.resolve({ charging: true, level: 0.75 }),
      },
      writable: true,
    })

    function TestComponent() {
      const device = useDeviceData({
        includeBattery: true,
        includeHighEntropy: false,
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
