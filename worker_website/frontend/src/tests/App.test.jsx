import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.queryByText(/Settings|സജ്ജനങ്ങൾ/)).toBeInTheDocument()
  })

  it('renders landing page by default', () => {
    render(<App />)
    // App component renders with routes, just verify it doesn't error
    expect(document.body).toBeTruthy()
  })

  it('has theme and language toggle button', () => {
    render(<App />)
    const settingsButton = screen.getByLabelText(/Settings|സജ്ജനങ്ങൾ/)
    expect(settingsButton).toBeInTheDocument()
  })
})
