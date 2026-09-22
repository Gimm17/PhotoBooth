import { fireEvent, render, screen } from '@testing-library/react'
import { App } from './App'
import '../shared/styles/global.css'

const routes = [
  ['/', 'PhotoBooth untuk kenanganmu'],
  ['/setup', 'Izinkan Akses Kamera'],
  ['/studio', 'Studio pengambilan foto'],
  ['/editor', 'Kustomisasi hasil fotomu'],
  ['/result', 'Hasil foto belum siap'],
  ['/gallery', 'Galeri lokal'],
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

  it('gives the skip link a 44px minimum touch target', () => {
    render(<App initialEntries={['/']} />)

    const skipLink = screen.getByRole('link', { name: 'Lewati ke konten utama' })
    expect(skipLink).toHaveStyle({ minHeight: '44px' })
  })
})
