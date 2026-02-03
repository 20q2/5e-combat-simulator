import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// Mock Math.random for deterministic dice rolls in tests
// Tests can override this per-test using vi.spyOn(Math, 'random')
// Example: vi.spyOn(Math, 'random').mockReturnValue(0.5)

// Reset all mocks after each test
afterEach(() => {
  vi.restoreAllMocks()
})

// Mock window.matchMedia for component tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
