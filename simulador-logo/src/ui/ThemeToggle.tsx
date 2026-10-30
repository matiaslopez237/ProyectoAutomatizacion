import { useEffect, useState } from 'react'

const THEME_KEY = 'simulador-logo/tema'
type Theme = 'light' | 'dark'

function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Botón del sol: pasa todo el simulador a modo oscuro (y la luna lo vuelve al claro de LOGO!Soft). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const dark = theme === 'dark'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // sin almacenamiento: el tema no se recuerda
    }
  }, [theme])

  return (
    <button
      type="button"
      className="btn btn-ghost theme-toggle"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-pressed={dark}
      aria-label="Modo oscuro"
      title={dark ? 'Volver al modo claro' : 'Pasar a modo oscuro'}
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
          </g>
        </svg>
      )}
    </button>
  )
}
