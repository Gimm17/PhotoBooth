import { Camera } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '../shared/layout/PageShell'

export function StudioPage() {
  return <PageShell><section className="simple-page page-width"><p className="section-kicker">Ambil foto</p><h1>Studio pengambilan foto</h1><p>Atur hitung mundur, pilih layout, dan abadikan momenmu saat siap.</p><div className="camera-placeholder"><Camera aria-hidden="true" size={42} /><span>Pratinjau kamera akan muncul di sini</span></div><Link className="button primary-button" to="/editor">Lanjut ke editor</Link></section></PageShell>
}
