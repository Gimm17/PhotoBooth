import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'

interface PageShellProps {
  children: ReactNode
}

const routeTitles: Record<string, string> = {
  '/': 'Beranda',
  '/frames': 'Pilih frame',
  '/setup': 'Pengaturan kamera',
  '/studio': 'Studio foto',
  '/editor': 'Editor',
  '/result': 'Hasil foto',
  '/gallery': 'Galeri foto',
}

export function PageShell({ children }: PageShellProps) {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = `${routeTitles[pathname] ?? 'PhotoBooth'} | PhotoBooth`
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
      <AppHeader />
      <main ref={mainRef} id="main-content" tabIndex={-1}>{children}</main>
      <AppFooter />
    </div>
  )
}
