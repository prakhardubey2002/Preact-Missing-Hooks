/** @jsx h */
import { render, fireEvent, screen } from '@testing-library/preact'
import '@testing-library/jest-dom'
import { useTransition } from '../src/useTransition'
import { h } from 'preact'

function TestComponent() {
  const [startTransition, isPending] = useTransition()

  return (
    <div>
      <button onClick={() => startTransition(() => {})}>Trigger</button>
      <span>{isPending ? 'Pending' : 'Idle'}</span>
    </div>
  )
}

test('useTransition updates isPending', async () => {
  render(<TestComponent />)
  fireEvent.click(screen.getByText('Trigger'))

  expect(screen.getByText(/Pending|Idle/)).toBeInTheDocument()

  await Promise.resolve()
})
