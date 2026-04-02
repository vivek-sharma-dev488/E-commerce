import { useTheme } from '../../hooks/useTheme'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function AppLayout({ children }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_8%_14%,rgba(251,191,36,0.2),transparent_38%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_50%_95%,rgba(34,197,94,0.15),transparent_38%)]" />

      <Navbar theme={theme} toggleTheme={toggleTheme} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>

      <Footer />
    </div>
  )
}
