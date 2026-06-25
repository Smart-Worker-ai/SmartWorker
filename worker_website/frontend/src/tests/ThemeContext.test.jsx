import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

function TestComponent() {
  const { isDark, setIsDark, lang, setLang, t } = useTheme()
  return (
    <div>
      <button onClick={() => setIsDark(!isDark)} data-testid="theme-toggle">
        {isDark ? 'Light' : 'Dark'}
      </button>
      <button onClick={() => setLang(lang === 'en' ? 'ml' : 'en')} data-testid="lang-toggle">
        {lang}
      </button>
      <div data-testid="translated">{t('Welcome')}</div>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides theme context', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('toggles dark mode', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    const toggleBtn = screen.getByTestId('theme-toggle')
    expect(toggleBtn).toHaveTextContent('Dark')

    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveTextContent('Light')
  })

  it('toggles language', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    const langBtn = screen.getByTestId('lang-toggle')
    expect(langBtn).toHaveTextContent('en')

    fireEvent.click(langBtn)
    expect(langBtn).toHaveTextContent('ml')
  })

  it('provides translation function', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    expect(screen.getByTestId('translated')).toBeInTheDocument()
  })
})
