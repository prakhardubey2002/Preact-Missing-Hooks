/** @jsx h */
import { h } from 'preact'
import { useRef } from 'preact/hooks'
import { render, fireEvent, waitFor } from '@testing-library/preact'
import { useRageClick } from '../src/useRageClick'
import { vi } from 'vitest'

describe('useRageClick', () => {
  it('does not call onRageClick when clicks are below threshold', () => {
    const onRageClick = vi.fn()

    function TestComponent() {
      const ref = useRef<HTMLButtonElement>(null)
      useRageClick(ref, { onRageClick, threshold: 5, timeWindow: 1000 })
      return <button ref={ref}>Click</button>
    }

    const { getByText } = render(<TestComponent />)
    const btn = getByText('Click')

    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)

    expect(onRageClick).not.toHaveBeenCalled()
  })

  it('calls onRageClick when clicks meet threshold in same area', async () => {
    const onRageClick = vi.fn()

    function TestComponent() {
      const ref = useRef<HTMLButtonElement>(null)
      useRageClick(ref, { onRageClick, threshold: 5, timeWindow: 1000 })
      return <button ref={ref}>Click</button>
    }

    const { getByText } = render(<TestComponent />)
    const btn = getByText('Click')

    for (let i = 0; i < 5; i++) {
      fireEvent.click(btn, { clientX: 10, clientY: 10 })
    }

    await waitFor(() => {
      expect(onRageClick).toHaveBeenCalledTimes(1)
      expect(onRageClick).toHaveBeenCalledWith(
        expect.objectContaining({ count: 5 })
      )
      expect(onRageClick.mock.calls[0][0].event).toBeDefined()
    })
  })

  it('respects custom threshold', async () => {
    const onRageClick = vi.fn()

    function TestComponent() {
      const ref = useRef<HTMLButtonElement>(null)
      useRageClick(ref, { onRageClick, threshold: 3, timeWindow: 1000 })
      return <button ref={ref}>Click</button>
    }

    const { getByText } = render(<TestComponent />)
    const btn = getByText('Click')

    fireEvent.click(btn, { clientX: 0, clientY: 0 })
    fireEvent.click(btn, { clientX: 1, clientY: 1 })
    fireEvent.click(btn, { clientX: 2, clientY: 2 })

    await waitFor(() => {
      expect(onRageClick).toHaveBeenCalledTimes(1)
      expect(onRageClick).toHaveBeenCalledWith(
        expect.objectContaining({ count: 3 })
      )
    })
  })

  it('does not fire when clicks are far apart (distanceThreshold)', async () => {
    const onRageClick = vi.fn()

    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)
      useRageClick(ref, {
        onRageClick,
        threshold: 5,
        timeWindow: 1000,
        distanceThreshold: 20,
      })
      return <div ref={ref} data-testid="area">Area</div>
    }

    const { getByTestId } = render(<TestComponent />)
    const el = getByTestId('area')

    for (let i = 0; i < 5; i++) {
      fireEvent.click(el, { clientX: i * 100, clientY: i * 100 })
    }

    expect(onRageClick).not.toHaveBeenCalled()
  })

  it('fires when clicks are within distanceThreshold', async () => {
    const onRageClick = vi.fn()

    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)
      useRageClick(ref, {
        onRageClick,
        threshold: 5,
        timeWindow: 1000,
        distanceThreshold: 50,
      })
      return <div ref={ref} data-testid="area">Area</div>
    }

    const { getByTestId } = render(<TestComponent />)
    const el = getByTestId('area')

    for (let i = 0; i < 5; i++) {
      fireEvent.click(el, { clientX: 10 + i * 5, clientY: 10 + i * 5 })
    }

    await waitFor(() => {
      expect(onRageClick).toHaveBeenCalledTimes(1)
      expect(onRageClick.mock.calls[0][0].count).toBe(5)
    })
  })

  it('cleans up listener on unmount', () => {
    const onRageClick = vi.fn()

    function TestComponent() {
      const ref = useRef<HTMLButtonElement>(null)
      useRageClick(ref, { onRageClick, threshold: 5 })
      return <button ref={ref}>Click</button>
    }

    const { getByText, unmount } = render(<TestComponent />)
    const btn = getByText('Click')
    unmount()
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(onRageClick).not.toHaveBeenCalled()
  })
})
