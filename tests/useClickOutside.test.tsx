/** @jsx h */
import { h } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { render, fireEvent } from '@testing-library/preact'
import { useClickOutside } from '../src/useClickOutside'

describe('useClickOutside', () => {
  it('calls the handler when clicking outside the element', () => {
    const handler = vi.fn()
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)
      useClickOutside(ref, handler)
      return (
        <div>
          <div ref={ref} data-testid="inside">Inside</div>
          <div data-testid="outside">Outside</div>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    fireEvent.mouseDown(getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call the handler when clicking inside the element', () => {
    const handler = vi.fn()
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)
      useClickOutside(ref, handler)
      return (
        <div>
          <div ref={ref} data-testid="inside">
            <span data-testid="child">Child</span>
          </div>
          <div data-testid="outside">Outside</div>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    fireEvent.mouseDown(getByTestId('inside'))
    fireEvent.mouseDown(getByTestId('child'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not listen when enabled is false', () => {
    const handler = vi.fn()
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)
      useClickOutside(ref, handler, { enabled: false })
      return (
        <div>
          <div ref={ref} data-testid="inside">Inside</div>
          <div data-testid="outside">Outside</div>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    fireEvent.mouseDown(getByTestId('outside'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('supports an array of refs (click inside either is ignored)', () => {
    const handler = vi.fn()
    function TestComponent() {
      const a = useRef<HTMLDivElement>(null)
      const b = useRef<HTMLDivElement>(null)
      useClickOutside([a, b], handler)
      return (
        <div>
          <div ref={a} data-testid="a">A</div>
          <div ref={b} data-testid="b">B</div>
          <div data-testid="outside">Outside</div>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    fireEvent.mouseDown(getByTestId('a'))
    fireEvent.mouseDown(getByTestId('b'))
    expect(handler).not.toHaveBeenCalled()
    fireEvent.mouseDown(getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('stops listening after unmount', () => {
    const handler = vi.fn()
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)
      useClickOutside(ref, handler)
      return (
        <div>
          <div ref={ref} data-testid="inside">Inside</div>
          <div data-testid="outside">Outside</div>
        </div>
      )
    }
    const { getByTestId, unmount } = render(<TestComponent />)
    const outside = getByTestId('outside')
    unmount()
    fireEvent.mouseDown(outside)
    expect(handler).not.toHaveBeenCalled()
  })

  it('uses the latest handler without re-binding on each render', () => {
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)
      const [count, setCount] = useState(0)
      useClickOutside(ref, () => setCount((n) => n + 1))
      return (
        <div>
          <div ref={ref} data-testid="inside">Inside</div>
          <div data-testid="outside">Outside</div>
          <span data-testid="count">{count}</span>
        </div>
      )
    }
    const { getByTestId } = render(<TestComponent />)
    fireEvent.mouseDown(getByTestId('outside'))
    fireEvent.mouseDown(getByTestId('outside'))
    expect(getByTestId('count').textContent).toBe('2')
  })
})
