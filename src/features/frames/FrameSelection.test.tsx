import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../store/session-store'
import { FrameSelection } from './FrameSelection'

const navigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

describe('FrameSelection', () => {
  beforeEach(() => {
    navigate.mockReset()
    useSessionStore.getState().resetSession()
  })

  it('stores the selected frame and required poses before camera setup', () => {
    render(<MemoryRouter><FrameSelection /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /Sakura Diary.*3 pose/i }))
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke kamera.*3 pose/i }))

    expect(useSessionStore.getState()).toMatchObject({
      selectedFrame: 'sakura-diary',
      selectedLayout: 'three-postcard',
      requiredShots: 3,
    })
    expect(navigate).toHaveBeenCalledWith('/setup')
  })

  it('filters frames while preserving the current selection', () => {
    render(<MemoryRouter><FrameSelection /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Cari bingkai'), { target: { value: 'Sakura Diary' } })

    expect(screen.getByRole('button', { name: /Sakura Diary.*3 pose/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: /Candy Scrapbook/i })).not.toBeInTheDocument()
  })
})
