import { Camera, LockKeyhole, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '../shared/layout/PageShell'

export function SetupPage() {
  return <PageShell><section className="simple-page page-width"><p className="section-kicker">Langkah pertama</p><h1>Siapkan kamera</h1><p>Izinkan akses kamera untuk mulai mengambil foto. Foto tetap berada di perangkatmu.</p><div className="simple-actions"><Link className="button primary-button" to="/studio"><Camera aria-hidden="true" size={19} /> Izinkan kamera</Link><button className="button secondary-button" type="button"><Upload aria-hidden="true" size={19} /> Pilih file foto</button></div><p className="privacy-note"><LockKeyhole aria-hidden="true" size={15} /> Izin kamera hanya digunakan saat studio dibuka.</p></section></PageShell>
}
