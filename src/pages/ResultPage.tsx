import { ResultPanel, type GallerySaveRequest } from '../features/export/ResultPanel'
import { frameById, layoutById } from '../catalog/frames'
import { filterById } from '../catalog/filters'
import { saveGalleryRecord } from '../features/gallery/gallery-db'
import { useSessionStore } from '../store/session-store'
import { PageShell } from '../shared/layout/PageShell'

export function ResultPage() {
  const session = useSessionStore()
  const saveCurrentResult = async (media: GallerySaveRequest) => {
    const frame = frameById(session.selectedFrame)
    const layout = layoutById(session.selectedLayout)
    const filter = filterById(session.selectedFilter)
    if (!frame || !layout || !filter) throw new Error('Metadata foto tidak lengkap untuk disimpan ke galeri.')

    const metadata = {
      blob: media.blob,
      frameId: frame.id,
      frameLabel: frame.name,
      layoutId: layout.id,
      layoutLabel: layout.name,
      filterId: filter.id,
      filterLabel: filter.name,
    }
    await saveGalleryRecord(media.kind === 'video'
      ? { ...metadata, kind: 'video', posterBlob: media.posterBlob }
      : { ...metadata, kind: 'image' })
  }

  return <PageShell><ResultPanel saveToGallery={saveCurrentResult} /></PageShell>
}
