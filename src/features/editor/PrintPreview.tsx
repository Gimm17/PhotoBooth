import { ImageOff, LoaderCircle } from 'lucide-react'
import type { FrameTemplate } from '../../catalog/types'

interface PrintPreviewProps {
  frame: FrameTemplate
  resultUrl: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
}

export function PrintPreview({ frame, resultUrl, status }: PrintPreviewProps) {
  return <section className="print-preview" aria-label="Pratinjau cetakan">
    <div className="preview-meta"><span><i /> {frame.orientation === 'portrait' ? 'CETAK TEGAK' : frame.orientation === 'landscape' ? 'CETAK LANDSKAP' : 'CETAK KOTAK'}</span><span>{frame.output.width} × {frame.output.height}</span></div>
    <div className="print-stage">
      <div className="print-tape preview-tape">PREVIEW LANGSUNG</div>
      {resultUrl ? <img src={resultUrl} alt="Pratinjau hasil foto dengan bingkai dan filter pilihan" /> : <div className="preview-empty">{status === 'loading' ? <LoaderCircle aria-hidden="true" size={28} /> : <ImageOff aria-hidden="true" size={28} />}<span>{status === 'loading' ? 'Menyusun cetakan…' : 'Pratinjau belum tersedia'}</span></div>}
    </div>
  </section>
}
