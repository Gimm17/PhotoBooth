import type { CSSProperties } from 'react'
import type { FrameAssetLayer, FrameTemplate, PhotoSlot } from '../../catalog/types'

interface FrameThumbnailProps {
  frame: FrameTemplate
}

const percent = (value: number) => `${Number((value * 100).toFixed(4))}%`

const normalizedBox = ({ x, y, width, height, rotation }: PhotoSlot | FrameAssetLayer): CSSProperties => ({
  left: percent(x),
  top: percent(y),
  width: percent(width),
  height: percent(height),
  transform: rotation === undefined ? undefined : `rotate(${rotation}turn)`,
})

export function FrameThumbnail({ frame }: FrameThumbnailProps) {
  const thumbnailAsset = frame.assets?.find(({ src }) => src === frame.thumbnail)
  const artworkStyle: CSSProperties = thumbnailAsset
    ? { ...normalizedBox(thumbnailAsset), opacity: thumbnailAsset.opacity }
    : { inset: 0, height: '100%', width: '100%' }

  return <span className="frame-thumbnail" aria-hidden="true">
    <span
      className="frame-thumbnail-canvas"
      data-testid={`frame-thumbnail-${frame.id}`}
      style={{
        aspectRatio: `${frame.output.width} / ${frame.output.height}`,
        width: `min(100%, calc(var(--frame-thumbnail-height) * ${frame.output.width / frame.output.height}))`,
        background: frame.background,
        borderColor: frame.border.color,
        borderWidth: `${Math.max(2, Math.min(8, frame.border.width / 4))}px`,
        borderRadius: `${Math.min(14, frame.border.radius)}px`,
      }}
    >
      {frame.thumbnail && <img
        alt=""
        aria-hidden="true"
        className={`frame-thumbnail-artwork is-${thumbnailAsset?.placement ?? 'overlay'}`}
        src={frame.thumbnail}
        style={artworkStyle}
      />}
      {frame.slots.map((slot, index) => <span
        className="frame-thumbnail-slot"
        data-testid="frame-thumbnail-slot"
        key={`${slot.x}-${slot.y}-${index}`}
        style={normalizedBox(slot)}
      />)}
    </span>
  </span>
}
