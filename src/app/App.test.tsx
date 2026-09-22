import { fireEvent, render, screen } from '@testing-library/react'
import { App } from './App'
import '../shared/styles/global.css'

const routes = [
  ['/', 'Abadikan momen, buat jadi milikmu.'],
  ['/setup', 'Izinkan Akses Kamera'],
  ['/studio', 'Studio pengambilan foto'],
  ['/editor', 'Kustomisasi hasil fotomu'],
  ['/result', 'Hasil foto belum siap'],
  ['/gallery', 'Galeri Foto Pribadi'],
] as const

describe('application routes', () => {
  it.each(routes)('renders the unique page heading for %s', (path, heading) => {
    render(<App initialEntries={[path]} />)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('opens the mobile navigation control', () => {
    render(<App initialEntries={['/']} />)

    const menu = screen.getByLabelText('Buka navigasi', { selector: 'button' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menu)

    expect(menu).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes mobile navigation after following a navigation link', () => {
    render(<App initialEntries={['/']} />)

    const menu = screen.getByLabelText('Buka navigasi', { selector: 'button' })
    fireEvent.click(menu)
    fireEvent.click(screen.getByRole('link', { name: /^Kamera$/ }))

    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { level: 1, name: 'Izinkan Akses Kamera' })).toBeInTheDocument()
  })

  it('closes mobile navigation with Escape and restores the menu trigger focus', () => {
    render(<App initialEntries={['/']} />)

    const menu = screen.getByLabelText('Buka navigasi', { selector: 'button' })
    fireEvent.click(menu)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveFocus()
  })

  it.each([
    ['/', 'Beranda'],
    ['/setup', 'Pengaturan kamera'],
    ['/editor', 'Editor'],
    ['/result', 'Hasil foto'],
    ['/gallery', 'Galeri foto'],
  ])('moves focus to main content and updates the title on %s', (path, title) => {
    render(<App initialEntries={[path]} />)

    expect(document.title).toBe(`${title} | PhotoBooth`)
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('gives the skip link a 44px minimum touch target', () => {
    render(<App initialEntries={['/']} />)

    const skipLink = screen.getByRole('link', { name: 'Lewati ke konten utama' })
    expect(skipLink).toHaveStyle({ minHeight: '44px' })
  })
})
