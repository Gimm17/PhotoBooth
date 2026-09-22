import type { ReactNode } from 'react'
import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
      <AppHeader />
      <main id="main-content">{children}</main>
      <AppFooter />
    </div>
  )
}
