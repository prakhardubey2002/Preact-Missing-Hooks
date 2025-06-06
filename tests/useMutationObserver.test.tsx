/** @jsx h */
import { h } from 'preact'
import { render } from '@testing-library/preact'
import { useEffect, useRef } from 'preact/hooks'
import { useMutationObserver } from '../src/useMutationObserver'
import { vi } from 'vitest'
import { waitFor } from '@testing-library/preact'

describe('useMutationObserver', () => {
  it('triggers callback on DOM mutation', async () => {
    const callback = vi.fn()

    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null)

      useMutationObserver(ref, callback, { childList: true })

      useEffect(() => {
        if (ref.current) {
          const span = document.createElement('span')
          span.textContent = 'New Child'
          ref.current.appendChild(span)
        }
      }, [])

      return <div ref={ref}></div>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(callback).toHaveBeenCalled()
    })
  })
})
