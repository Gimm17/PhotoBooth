import { createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { EditorPage } from '../pages/EditorPage'
import { GalleryPage } from '../pages/GalleryPage'
import { HomePage } from '../pages/HomePage'
import { ResultPage } from '../pages/ResultPage'
import { SetupPage } from '../pages/SetupPage'
import { StudioPage } from '../pages/StudioPage'

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/setup', element: <SetupPage /> },
  { path: '/studio', element: <StudioPage /> },
  { path: '/editor', element: <EditorPage /> },
  { path: '/result', element: <ResultPage /> },
  { path: '/gallery', element: <GalleryPage /> },
]

export const browserRouter = createBrowserRouter(routes)

export function createTestRouter(initialEntries: string[]) {
  return createMemoryRouter(routes, { initialEntries })
}
