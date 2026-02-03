import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Custom render that wraps components with necessary providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>{children}</BrowserRouter>
    ),
    ...options,
  })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Override render with our custom version
export { customRender as render }

// Helper to create mock dice rolls
export function mockDiceRoll(value: number) {
  // Math.random() returns [0, 1), so for a d20:
  // roll = Math.floor(Math.random() * 20) + 1
  // To get value N: Math.random() should return (N - 1) / 20
  return (value - 1) / 20
}

// Helper to create a sequence of dice rolls
export function mockDiceSequence(values: number[], sides: number = 20) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index++
    return (value - 1) / sides
  }
}
