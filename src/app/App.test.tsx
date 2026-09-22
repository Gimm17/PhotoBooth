import { fireEvent, render, screen } from '@testing-library/react'
import { App } from './App'

const routes = [
  ['/', 'PhotoBooth untuk kenanganmu'],
  ['/setup', 'Siapkan kamera'],
  ['/studio', 'Studio pengambilan foto'],
  ['/editor', 'Kustomisasi hasil fotomu'],
  ['/result', 'Foto kamu sudah siap'],
  ['/gallery', 'Galeri lokal'],
] as const

describe('application routes', () => {
  it.each(routes)('renders the unique page heading for %s', (path, heading) => {
    render(<App initialEntries={[path]} />)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('opens the mobile navigation control', () => {
    render(<App initialEntries={['/']} />)

    const menu = screen.getByRole('button', { name: 'Buka navigasi' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menu)

    expect(menu).toHaveAttribute('aria-expanded', 'true')
  })
})
