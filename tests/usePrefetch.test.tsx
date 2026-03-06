/** @jsx h */
import { h } from 'preact'
import { render, fireEvent } from '@testing-library/preact'
import { usePrefetch } from '../src/usePrefetch'

describe('usePrefetch', () => {
  let originalDocumentHead: HTMLHeadElement
  let headAppendChild: typeof document.head.appendChild

  beforeEach(() => {
    originalDocumentHead = document.head
    headAppendChild = document.head.appendChild
  })

  afterEach(() => {
    document.head.innerHTML = ''
  })

  it('returns prefetch and isPrefetched', () => {
    function TestComponent() {
      const { prefetch, isPrefetched } = usePrefetch()
      return (
        <div>
          <button onClick={() => prefetch('/page')} data-testid="btn">Prefetch</button>
          <span data-testid="before">{String(isPrefetched('/page'))}</span>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('before').textContent).toBe('false')
    expect(getByTestId('btn')).toBeTruthy()
  })

  it('prefetch with document adds a link element', () => {
    function TestComponent() {
      const { prefetch } = usePrefetch()
      return (
        <button onClick={() => prefetch('https://example.com/page')}>Prefetch</button>
      )
    }
    const { getByText } = render(<TestComponent />)
    fireEvent.click(getByText('Prefetch'))
    const link = document.querySelector('link[rel="prefetch"][href="https://example.com/page"]')
    expect(link).toBeTruthy()
  })

  it('prefetch with empty url does nothing', () => {
    function TestComponent() {
      const { prefetch, isPrefetched } = usePrefetch()
      return (
        <div>
          <button onClick={() => prefetch('')}>Prefetch empty</button>
          <span data-testid="result">{String(isPrefetched(''))}</span>
        </div>
      )
    }
    const { getByText, getByTestId } = render(<TestComponent />)
    fireEvent.click(getByText('Prefetch empty'))
    expect(document.querySelectorAll('link[rel="prefetch"]').length).toBe(0)
    expect(getByTestId('result').textContent).toBe('false')
  })

  it('isPrefetched returns true after prefetching', () => {
    const url = 'https://example.com/other'
    function TestComponent() {
      const { prefetch, isPrefetched } = usePrefetch()
      return (
        <div>
          <button onClick={() => prefetch(url)}>Prefetch</button>
          <span data-testid="status">{String(isPrefetched(url))}</span>
        </div>
      )
    }
    const { getByText, getByTestId } = render(<TestComponent />)
    expect(getByTestId('status').textContent).toBe('false')
    fireEvent.click(getByText('Prefetch'))
    expect(getByTestId('status').textContent).toBe('true')
  })

  it('prefetch with as fetch calls fetch', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({} as Response)
    function TestComponent() {
      const { prefetch } = usePrefetch()
      return (
        <button onClick={() => prefetch('https://api.example.com/data', { as: 'fetch' })}>Prefetch fetch</button>
      )
    }
    const { getByText } = render(<TestComponent />)
    fireEvent.click(getByText('Prefetch fetch'))
    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/data', { method: 'GET', mode: 'cors' })
    fetchSpy.mockRestore()
  })

  it('same URL prefetched twice does not add duplicate link', () => {
    const url = 'https://example.com/once'
    function TestComponent() {
      const { prefetch } = usePrefetch()
      return (
        <button onClick={() => { prefetch(url); prefetch(url); }}>Prefetch twice</button>
      )
    }
    const { getByText } = render(<TestComponent />)
    fireEvent.click(getByText('Prefetch twice'))
    const links = document.querySelectorAll('link[rel="prefetch"][href="' + url + '"]')
    expect(links.length).toBe(1)
  })
})
