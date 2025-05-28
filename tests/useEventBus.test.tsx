/** @jsx h */
import { h } from 'preact'
import { render, fireEvent, screen } from '@testing-library/preact'
import { useEventBus } from '../src/useEventBus'
import { useEffect, useState } from 'preact/hooks'

type Events = {
  notify: (msg: string) => void
}

function Sender() {
  const { emit } = useEventBus<Events>()
  return <button onClick={() => emit('notify', 'hello')}>Send</button>
}

function Receiver() {
  const { on } = useEventBus<Events>()
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsub = on('notify', setMessage)
    return unsub
  }, [on])

  return <div>{message}</div>
}

test('useEventBus sends and receives events', () => {
  render(
    <div>
      <Sender />
      <Receiver />
    </div>
  )

  fireEvent.click(screen.getByText('Send'))

  const node = screen.getByText('hello')
  expect(node).not.toBeNull()
  expect(node.textContent).toBe('hello')
})
