import { SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '../shared/layout/PageShell'

export function EditorPage() {
  return <PageShell><section className="simple-page page-width"><p className="section-kicker">Berikan sentuhan akhir</p><h1>Kustomisasi hasil fotomu</h1><p>Pilih frame, filter, dan catatan yang membuat strip fotomu terasa seperti milikmu.</p><div className="camera-placeholder"><SlidersHorizontal aria-hidden="true" size={42} /><span>Panel editor akan muncul di sini</span></div><Link className="button primary-button" to="/result">Lihat hasil</Link></section></PageShell>
}
