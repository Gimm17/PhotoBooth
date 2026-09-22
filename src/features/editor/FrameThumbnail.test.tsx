import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { frameById } from '../../catalog/frames'
import type { FrameTemplate } from '../../catalog/types'
import { FrameThumbnail } from './FrameThumbnail'

describe('FrameThumbnail', () => {
  it('renders decorative artwork and normalized slot placeholders without an accessible image name', () => {
    const frame = frameById('love-letter-portrait')! as FrameTemplate
    const { container } = render(<FrameThumbnail frame={frame} />)

    const thumbnail = screen.getByTestId('frame-thumbnail-love-letter-portrait')
    const artwork = container.querySelectorAll('img')
    const slots = screen.getAllByTestId('frame-thumbnail-slot')

    expect(thumbnail).toHaveStyle({ aspectRatio: '1200 / 1500' })
    expect(artwork).toHaveLength(1)
    expect(artwork[0]).toHaveAttribute('src', frame.thumbnail)
    expect(artwork[0]).toHaveAttribute('alt', '')
    expect(artwork[0]).toHaveAttribute('aria-hidden', 'true')
    expect(artwork[0]).not.toHaveAccessibleName()
    expect(artwork[0]).toHaveStyle({ left: '7%', top: '81%', width: '21%', height: '13%' })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(slots).toHaveLength(frame.slots.length)
    expect(slots[0]).toHaveStyle({
      left: '10%',
      top: '9%',
      width: '80%',
      height: '70%',
    })
  })

  it('keeps the generated color-and-slot swatch for retained frames without artwork', () => {
    const frame = frameById('classic-polaroid')! as FrameTemplate
    const { container } = render(<FrameThumbnail frame={frame} />)

    expect(screen.getByTestId('frame-thumbnail-classic-polaroid')).toHaveStyle({
      background: frame.background,
      borderColor: frame.border.color,
    })
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('frame-thumbnail-slot')).toHaveLength(frame.slots.length)
  })
})
