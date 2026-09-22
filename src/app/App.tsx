import { useMemo } from 'react'
import { RouterProvider } from 'react-router-dom'
import { browserRouter, createTestRouter } from './router'

interface AppProps {
  initialEntries?: string[]
}

export function App({ initialEntries }: AppProps) {
  const router = useMemo(
    () => (initialEntries ? createTestRouter(initialEntries) : browserRouter),
    [initialEntries],
  )

  return <RouterProvider router={router} />
}
