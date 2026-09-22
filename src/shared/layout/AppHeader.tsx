import { useState } from 'react'
import { Aperture, LockKeyhole, Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigation = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/setup', label: 'Kamera' },
  { to: '/editor', label: 'Editor' },
  { to: '/gallery', label: 'Galeri lokal' },
]

export function AppHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="app-header">
      <div className="page-width header-content">
        <NavLink className="brand" to="/" aria-label="PhotoBooth, kembali ke beranda">
          <Aperture aria-hidden="true" size={22} strokeWidth={1.8} />
          <span>
            <strong>PhotoBooth</strong>
            <small>Est. Analog Feel</small>
          </span>
        </NavLink>

        <nav id="primary-navigation" className={`primary-nav${isMenuOpen ? ' is-open' : ''}`} aria-label="Navigasi utama">
          {navigation.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-status" aria-label="Privasi di browser">
          <LockKeyhole aria-hidden="true" size={14} />
          <span>100% privat di browser</span>
        </div>
        <button
          className="menu-button"
          type="button"
          aria-label="Buka navigasi"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <Menu aria-hidden="true" size={20} />
        </button>
      </div>
    </header>
  )
}
