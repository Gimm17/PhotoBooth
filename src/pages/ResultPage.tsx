import { Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '../shared/layout/PageShell'

export function ResultPage() {
  return <PageShell><section className="simple-page page-width"><p className="section-kicker">Siap disimpan</p><h1>Foto kamu sudah siap</h1><p>Unduh, cetak, atau simpan hasilnya ke galeri lokal perangkat ini.</p><div className="simple-actions"><button className="button primary-button" type="button"><Download aria-hidden="true" size={19} /> Unduh foto</button><Link className="button secondary-button" to="/gallery">Buka galeri lokal</Link></div></section></PageShell>
}
