export type FilterCategory = 'natural' | 'film' | 'mono' | 'warm' | 'cool' | 'creative'

export interface FilterPreset {
  id: string
  name: string
  category: FilterCategory
  cssFilter: string
  previewColor: string
}

export type LayoutId =
  | 'polaroid-single'
  | 'wide-duo'
  | 'three-postcard'
  | 'classic-strip'
  | 'grid-2x2'

export interface LayoutDefinition {
  id: LayoutId
  name: string
  requiredShots: number
}

export interface PhotoSlot {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export type FrameCategory = 'Classic' | 'Cute & Pastel' | 'Retro' | 'Minimal' | 'Seasonal'
export type FrameOrientation = 'portrait' | 'landscape' | 'square'

export interface FrameCaption {
  enabled: boolean
  color: string
  fontFamily: string
  fontSize: number
  align: 'left' | 'center' | 'right'
  x: number
  y: number
}

export interface FrameTemplate {
  id: string
  name: string
  category: FrameCategory
  layoutId: LayoutId
  orientation: FrameOrientation
  output: { width: number; height: number }
  slots: PhotoSlot[]
  background: string
  border: { color: string; width: number; radius: number }
  caption: FrameCaption
}

export interface PhotoSession {
  selectedLayout: LayoutId
  selectedFrame: string
  selectedFilter: string
  requiredShots: number
  photos: string[]
  mirror: boolean
  timer: 3 | 5 | 10
  showGrid: boolean
  filterIntensity: number
  caption: string
  showDate: boolean
  composedResultUrl: string | null
  composedResultBlob: Blob | null
}
