import { CalendarDays, MessageSquareText, SlidersHorizontal } from 'lucide-react'

interface InspectorProps {
  caption: string
  intensity: number
  showDate: boolean
  onCaptionChange: (caption: string) => void
  onIntensityChange: (intensity: number) => void
  onShowDateChange: (showDate: boolean) => void
}

export function Inspector({ caption, intensity, showDate, onCaptionChange, onIntensityChange, onShowDateChange }: InspectorProps) {
  return <section className="editor-inspector" aria-labelledby="inspector-heading">
    <div><p className="editor-kicker">Detail cetakan</p><h2 id="inspector-heading">Inspektur</h2></div>
    <label className="editor-field"><span><SlidersHorizontal aria-hidden="true" size={17} /> Intensitas efek <output>{intensity}%</output></span><input aria-label="Intensitas filter" type="range" min="0" max="100" value={intensity} onChange={(event) => onIntensityChange(Number(event.target.value))} /><small>Halus <b>Seimbang</b> Tajam retro</small></label>
    <label className="editor-field"><span><MessageSquareText aria-hidden="true" size={17} /> Caption foto</span><input aria-label="Caption foto" type="text" maxLength={80} value={caption} onChange={(event) => onCaptionChange(event.target.value)} placeholder="Tulis kenangan singkat" /></label>
    <label className="date-toggle"><span><CalendarDays aria-hidden="true" size={18} /><b>Tampilkan tanggal</b><small>Tanggal dicetak di bawah caption.</small></span><input aria-label="Tampilkan tanggal" type="checkbox" checked={showDate} onChange={(event) => onShowDateChange(event.target.checked)} /></label>
  </section>
}
