import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'expense_tracker_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
      return saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'light'
    } catch {
      return 'light'
    }
  })

  const [isDark, setIsDark] = useState<boolean>(false)

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const effectiveDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches)
      setIsDark(effectiveDark)
      if (effectiveDark) {
        root.classList.add('dark')
        document.body.classList.add('dark')
      } else {
        root.classList.remove('dark')
        document.body.classList.remove('dark')
      }
    }

    applyTheme()
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {}

    const listener = () => {
      if (theme === 'system') applyTheme()
    }
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
