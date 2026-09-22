import { Camera, ShieldCheck } from 'lucide-react'

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="page-width footer-content">
        <div>
          <p className="footer-brand"><Camera aria-hidden="true" size={15} /> PhotoBooth Analog Studio</p>
          <p>Foto strip bernuansa taktil langsung dari perangkatmu tanpa unggahan server.</p>
        </div>
        <p className="footer-privacy"><ShieldCheck aria-hidden="true" size={15} /> Semua foto diproses di perangkat ini</p>
      </div>
    </footer>
  )
}
