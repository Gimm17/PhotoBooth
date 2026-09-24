import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PageShell } from './PageShell'

describe('PageShell', () => {
  it('uses an immersive shell and omits site chrome in Studio', () => {
    const { container } = render(<MemoryRouter initialEntries={['/studio']}><PageShell><p>Studio content</p></PageShell></MemoryRouter>)

    expect(container.querySelector('.app-shell')).toHaveClass('is-studio-mode')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('keeps the site chrome outside Studio', () => {
    const { container } = render(<MemoryRouter initialEntries={['/']}><PageShell><p>Home content</p></PageShell></MemoryRouter>)

    expect(container.querySelector('.app-shell')).not.toHaveClass('is-studio-mode')
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
