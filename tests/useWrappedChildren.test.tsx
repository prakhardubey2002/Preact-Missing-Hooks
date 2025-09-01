/** @jsx h */
import { h, ComponentChildren } from 'preact'
import { render, screen } from '@testing-library/preact'
import '@testing-library/jest-dom'
import { useWrappedChildren } from '../src/useWrappedChildren'

interface TestChildProps {
  className?: string
  'data-testid'?: string
  style?: Record<string, string>
  children?: ComponentChildren
}

function TestChild({ className, 'data-testid': testId, style, children }: TestChildProps) {
  return (
    <div className={className} data-testid={testId} style={style}>
      {children}
    </div>
  )
}

function ParentWithWrappedChildren({ 
  children, 
  injectProps, 
  mergeStrategy 
}: { 
  children: ComponentChildren
  injectProps: Record<string, any>
  mergeStrategy?: 'override' | 'preserve' 
}) {
  const wrappedChildren = useWrappedChildren(children, injectProps, mergeStrategy)
  return <div data-testid="parent">{wrappedChildren}</div>
}

describe('useWrappedChildren', () => {
  it('injects props into single child component', () => {
    const injectProps = { className: 'injected', 'data-testid': 'child' }
    
    render(
      <ParentWithWrappedChildren injectProps={injectProps}>
        <TestChild>Original content</TestChild>
      </ParentWithWrappedChildren>
    )

    const child = screen.getByTestId('child')
    expect(child).toHaveClass('injected')
    expect(child).toHaveTextContent('Original content')
  })

  it('injects props into multiple child components', () => {
    const injectProps = { className: 'injected' }
    
    render(
      <ParentWithWrappedChildren injectProps={injectProps}>
        <TestChild data-testid="child1">First child</TestChild>
        <TestChild data-testid="child2">Second child</TestChild>
      </ParentWithWrappedChildren>
    )

    const child1 = screen.getByTestId('child1')
    const child2 = screen.getByTestId('child2')
    
    expect(child1).toHaveClass('injected')
    expect(child2).toHaveClass('injected')
    expect(child1).toHaveTextContent('First child')
    expect(child2).toHaveTextContent('Second child')
  })

  it('preserves existing props by default', () => {
    const injectProps = { className: 'injected', style: { color: 'blue' } }
    
    render(
      <ParentWithWrappedChildren injectProps={injectProps}>
        <TestChild 
          className="existing" 
          data-testid="child"
          style={{ backgroundColor: 'red' }}
        >
          Content
        </TestChild>
      </ParentWithWrappedChildren>
    )

    const child = screen.getByTestId('child')
    expect(child).toHaveClass('existing')  // existing prop preserved
    expect(child).not.toHaveClass('injected')  // injected prop not applied due to conflict
    
    // Check computed styles
    const computedStyle = getComputedStyle(child)
    expect(computedStyle.backgroundColor).toBe('rgb(255, 0, 0)')  // red
    expect(computedStyle.color).toBe('rgb(0, 0, 255)')  // blue
  })

  it('overrides existing props when mergeStrategy is override', () => {
    const injectProps = { className: 'injected', 'data-testid': 'child' }
    
    render(
      <ParentWithWrappedChildren 
        injectProps={injectProps} 
        mergeStrategy="override"
      >
        <TestChild className="existing">Content</TestChild>
      </ParentWithWrappedChildren>
    )

    const child = screen.getByTestId('child')
    expect(child).toHaveClass('injected')  // injected prop applied
    expect(child).not.toHaveClass('existing')  // existing prop overridden
  })

  it('handles non-element children gracefully', () => {
    const injectProps = { className: 'injected' }
    
    render(
      <ParentWithWrappedChildren injectProps={injectProps}>
        Plain text content
        <TestChild data-testid="child">Element content</TestChild>
        {42}
        {null}
      </ParentWithWrappedChildren>
    )

    const parent = screen.getByTestId('parent')
    const child = screen.getByTestId('child')
    
    expect(parent).toHaveTextContent('Plain text content')
    expect(parent).toHaveTextContent('42')
    expect(child).toHaveClass('injected')
  })

  it('returns undefined children unchanged', () => {
    const injectProps = { className: 'injected' }
    
    render(
      <ParentWithWrappedChildren injectProps={injectProps}>
        {undefined}
      </ParentWithWrappedChildren>
    )

    const parent = screen.getByTestId('parent')
    expect(parent).toBeEmptyDOMElement()
  })

  it('returns null children unchanged', () => {
    const injectProps = { className: 'injected' }
    
    render(
      <ParentWithWrappedChildren injectProps={injectProps}>
        {null}
      </ParentWithWrappedChildren>
    )

    const parent = screen.getByTestId('parent')
    expect(parent).toBeEmptyDOMElement()
  })
})