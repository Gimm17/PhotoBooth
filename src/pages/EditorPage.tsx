import { Editor } from '../features/editor/Editor'
import { PageShell } from '../shared/layout/PageShell'
import { Navigate } from 'react-router-dom'
import { frameById } from '../catalog/frames'
import { useSessionStore } from '../store/session-store'

export function EditorPage() {
  const { selectedFrame, photos, requiredShots } = useSessionStore()
  if (!frameById(selectedFrame)) return <Navigate to="/frames" replace />
  if (photos.length < requiredShots) return <Navigate to="/studio" replace />
  return <PageShell><Editor /></PageShell>
}
