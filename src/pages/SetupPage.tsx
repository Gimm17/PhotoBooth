import { CameraSetup } from '../features/camera/CameraSetup'
import { PageShell } from '../shared/layout/PageShell'
import { Navigate } from 'react-router-dom'
import { frameById } from '../catalog/frames'
import { useSessionStore } from '../store/session-store'

export function SetupPage() {
  const selectedFrame = useSessionStore((state) => state.selectedFrame)
  if (!frameById(selectedFrame)) return <Navigate to="/frames" replace />
  return <PageShell><CameraSetup /></PageShell>
}
