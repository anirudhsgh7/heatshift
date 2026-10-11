import { useTheme } from '../theme.js'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={dark}
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <svg
        className="theme-toggle__icon theme-toggle__icon--sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
      </svg>
      <svg
        className="theme-toggle__icon theme-toggle__icon--moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
      </svg>
    </button>
  )
}