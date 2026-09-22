import { ArrowRight, Camera, Download, Images, LockKeyhole, Printer, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '../shared/layout/PageShell'

const features = [
  { icon: LockKeyhole, label: 'Tanpa akun & login' },
  { icon: Printer, label: 'Resolusi cetak 300 DPI' },
  { icon: Download, label: 'Export PNG / WebP' },
  { icon: ShieldCheck, label: 'Tanpa iklan atau pelacak' },
]

export function HomePage() {
  return (
    <PageShell>
      <section className="hero page-width">
        <div className="hero-copy">
          <p className="privacy-chip"><span aria-hidden="true" /> Privat. Cepat. Langsung di perangkatmu.</p>
          <h1>PhotoBooth untuk kenanganmu</h1>
          <p className="hero-title" aria-hidden="true">
            Abadikan momen,<br /> <mark className="blue-mark">buat jadi</mark> <mark className="pink-mark">milikmu.</mark>
          </p>
          <p className="hero-summary">Studio foto digital langsung dari browsermu. Tangkap momen spontan, buat strip foto bergaya scrapbook, lalu simpan tanpa server.</p>
          <div className="hero-actions">
            <Link className="button primary-button" to="/setup">Mulai PhotoBooth <ArrowRight aria-hidden="true" size={19} /></Link>
            <a className="button secondary-button" href="#fitur"><Images aria-hidden="true" size={19} /> Lihat fitur</a>
          </div>
          <p className="privacy-note"><ShieldCheck aria-hidden="true" size={15} /> Foto tidak diunggah ke cloud. Semuanya diproses secara lokal.</p>
          <dl className="hero-metrics">
            <div><dt>0 ms</dt><dd>latensi server</dd></div>
            <div><dt>300 DPI</dt><dd>siap cetak fisik</dd></div>
            <div><dt>100%</dt><dd>offline-ready</dd></div>
          </dl>
        </div>
        <HeroPrint />
      </section>

      <section className="feature-pills page-width" aria-label="Keunggulan PhotoBooth">
        {features.map(({ icon: Icon, label }) => <div key={label}><Icon aria-hidden="true" size={17} />{label}</div>)}
      </section>

      <section className="showcase page-width" id="fitur">
        <div className="section-heading">
          <div><p className="section-kicker">Fitur studio terintegrasi</p><h2>Kreasikan sesuka hatimu</h2></div>
          <p>Pilih komposisi frame klasik, atur nuansa film, lalu simpan hasilnya sebagai kenanganmu sendiri.</p>
        </div>
        <div className="showcase-grid">
          <article className="feature-card frames-card">
            <div className="tape tape-blue" />
            <p className="card-kicker"><Images aria-hidden="true" size={17} /> Layout fleksibel</p>
            <h3>Koleksi frame scrapbook</h3>
            <p>Tata foto layaknya strip film klasik, prangko, atau kartu pos dengan pinggiran kertas yang terasa personal.</p>
            <div className="frame-samples" aria-label="Contoh gaya frame">
              <FrameSample label="4-Cut Vertikal" slots={4} />
              <FrameSample label="Retro Sprocket" slots={2} dark />
              <FrameSample label="Postage Stamp" slots={2} pink />
              <FrameSample label="Duo Polaroid" slots={2} />
            </div>
          </article>
          <article className="feature-card filters-card">
            <p className="card-kicker pink-kicker"><Sparkles aria-hidden="true" size={17} /> Emulasi film real-time</p>
            <h3>Filter kamera retro & film</h3>
            <p>Mulai dari warna hangat hingga grain lembut, semua dipratinjau langsung di perangkatmu.</p>
            <div className="filter-list">
              <FilterRow code="FUJI" title="Warm Fuji 400" detail="Nada hangat, bayangan amber" />
              <FilterRow code="B&W" title="Monochrome Ilford" detail="Kontras tajam, tekstur perak" dark />
              <FilterRow code="PSTL" title="Pastel Dream" detail="Sorotan lembut bernuansa dreamy" pink />
            </div>
          </article>
        </div>
      </section>

      <section className="callout page-width">
        <div className="tape tape-pink" />
        <p className="section-kicker">Kamera siap digunakan</p>
        <h2>Siap membuat kenangan barumu hari ini?</h2>
        <p>Nyalakan kamera perangkatmu, berpose bersama orang tersayang, dan simpan strip kenangan berkualitas cetak dalam hitungan detik.</p>
        <Link className="button primary-button" to="/setup"><Camera aria-hidden="true" size={19} /> Buka kamera sekarang</Link>
      </section>
    </PageShell>
  )
}

function HeroPrint() {
  return <div className="hero-print" aria-label="Contoh susunan foto scrapbook" role="img">
    <div className="print-tape">KEEPSAKE NO. 04</div>
    <p className="print-title">TOKYO RETRO</p>
    <div className="photo-slot photo-one"><span>EXP. 01</span></div>
    <div className="photo-slot photo-two"><span>EXP. 02</span></div>
    <div className="photo-slot photo-three"><span>EXP. 03</span></div>
    <p className="print-caption">STUDIO PHOTOBOOTH<br />2026.09.22 — MAKASSAR</p>
  </div>
}

function FrameSample({ label, slots, dark, pink }: { label: string; slots: number; dark?: boolean; pink?: boolean }) {
  return <div className={`frame-sample${dark ? ' dark' : ''}${pink ? ' pink' : ''}`}><div>{Array.from({ length: slots }, (_, index) => <span key={index} />)}</div><small>{label}</small></div>
}

function FilterRow({ code, title, detail, dark, pink }: { code: string; title: string; detail: string; dark?: boolean; pink?: boolean }) {
  return <div className="filter-row"><b className={`${dark ? 'dark' : ''}${pink ? ' pink' : ''}`}>{code}</b><span><strong>{title}</strong><small>{detail}</small></span><em>GRAIN 25%</em></div>
}
