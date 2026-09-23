import { PageShell } from '../shared/layout/PageShell'
import { Studio } from '../features/camera/Studio'
import { Navigate } from 'react-router-dom'
import { frameById } from '../catalog/frames'
import { useSessionStore } from '../store/session-store'

export function StudioPage() {
  const { selectedFrame, cameraDeviceId, photos } = useSessionStore()
  if (!frameById(selectedFrame)) return <Navigate to="/frames" replace />
  if (!cameraDeviceId && photos.length === 0) return <Navigate to="/setup" replace />
  return <PageShell><Studio /></PageShell>
}
