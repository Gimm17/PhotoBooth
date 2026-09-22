import { Images } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '../shared/layout/PageShell'

export function GalleryPage() {
  return <PageShell><section className="simple-page page-width"><p className="section-kicker">Hanya di perangkatmu</p><h1>Galeri lokal</h1><p>Belum ada foto tersimpan. Hasil PhotoBooth yang disimpan akan muncul di sini.</p><Images aria-hidden="true" className="empty-icon" size={48} /><Link className="button primary-button" to="/setup">Mulai membuat foto</Link></section></PageShell>
}
