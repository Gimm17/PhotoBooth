import type { FilterPreset } from './types'

export const FILTER_PRESETS = [
  { id: 'original', name: 'Original', category: 'natural', cssFilter: 'brightness(100%) contrast(100%) saturate(100%) sepia(0%) grayscale(0%) hue-rotate(0deg)', previewColor: '#F4F0E4' },
  { id: '1977', name: '1977', category: 'film', cssFilter: 'brightness(110%) contrast(110%) saturate(130%) sepia(15%) grayscale(0%) hue-rotate(0deg)', previewColor: '#EFAAB9' },
  { id: 'aden', name: 'Aden', category: 'film', cssFilter: 'brightness(120%) contrast(90%) saturate(85%) sepia(20%) grayscale(0%) hue-rotate(340deg)', previewColor: '#DCC6C0' },
  { id: 'brannan', name: 'Brannan', category: 'film', cssFilter: 'brightness(105%) contrast(135%) saturate(75%) sepia(18%) grayscale(0%) hue-rotate(0deg)', previewColor: '#8E7D70' },
  { id: 'brooklyn', name: 'Brooklyn', category: 'cool', cssFilter: 'brightness(110%) contrast(95%) saturate(85%) sepia(5%) grayscale(0%) hue-rotate(12deg)', previewColor: '#A5D6F1' },
  { id: 'clarendon', name: 'Clarendon', category: 'film', cssFilter: 'brightness(110%) contrast(125%) saturate(125%) sepia(0%) grayscale(0%) hue-rotate(0deg)', previewColor: '#78B7D5' },
  { id: 'earlybird', name: 'Earlybird', category: 'warm', cssFilter: 'brightness(105%) contrast(95%) saturate(75%) sepia(35%) grayscale(0%) hue-rotate(345deg)', previewColor: '#C99A75' },
  { id: 'gingham', name: 'Gingham', category: 'natural', cssFilter: 'brightness(110%) contrast(85%) saturate(90%) sepia(8%) grayscale(0%) hue-rotate(0deg)', previewColor: '#D8D5C7' },
  { id: 'hudson', name: 'Hudson', category: 'cool', cssFilter: 'brightness(115%) contrast(105%) saturate(80%) sepia(5%) grayscale(0%) hue-rotate(20deg)', previewColor: '#B7D5E8' },
  { id: 'inkwell', name: 'Inkwell', category: 'mono', cssFilter: 'brightness(110%) contrast(120%) saturate(0%) sepia(0%) grayscale(100%) hue-rotate(0deg)', previewColor: '#575757' },
  { id: 'kelvin', name: 'Kelvin', category: 'warm', cssFilter: 'brightness(110%) contrast(115%) saturate(135%) sepia(28%) grayscale(0%) hue-rotate(340deg)', previewColor: '#E99A61' },
  { id: 'lark', name: 'Lark', category: 'natural', cssFilter: 'brightness(110%) contrast(100%) saturate(110%) sepia(8%) grayscale(0%) hue-rotate(5deg)', previewColor: '#C8D6A2' },
  { id: 'lofi', name: 'Lofi', category: 'creative', cssFilter: 'brightness(110%) contrast(145%) saturate(150%) sepia(10%) grayscale(0%) hue-rotate(0deg)', previewColor: '#DE5D4C' },
  { id: 'mayfair', name: 'Mayfair', category: 'warm', cssFilter: 'brightness(120%) contrast(95%) saturate(115%) sepia(18%) grayscale(0%) hue-rotate(345deg)', previewColor: '#F1B5B8' },
  { id: 'moon', name: 'Moon', category: 'mono', cssFilter: 'brightness(115%) contrast(105%) saturate(0%) sepia(12%) grayscale(100%) hue-rotate(0deg)', previewColor: '#9D9A95' },
  { id: 'nashville', name: 'Nashville', category: 'warm', cssFilter: 'brightness(110%) contrast(90%) saturate(115%) sepia(25%) grayscale(0%) hue-rotate(340deg)', previewColor: '#E8B99A' },
  { id: 'perpetua', name: 'Perpetua', category: 'cool', cssFilter: 'brightness(110%) contrast(105%) saturate(100%) sepia(8%) grayscale(0%) hue-rotate(18deg)', previewColor: '#9DCCE1' },
  { id: 'reyes', name: 'Reyes', category: 'natural', cssFilter: 'brightness(120%) contrast(80%) saturate(70%) sepia(15%) grayscale(0%) hue-rotate(0deg)', previewColor: '#D6CBB8' },
  { id: 'rise', name: 'Rise', category: 'warm', cssFilter: 'brightness(115%) contrast(95%) saturate(110%) sepia(20%) grayscale(0%) hue-rotate(345deg)', previewColor: '#F2BE9C' },
  { id: 'slumber', name: 'Slumber', category: 'cool', cssFilter: 'brightness(105%) contrast(85%) saturate(80%) sepia(10%) grayscale(0%) hue-rotate(15deg)', previewColor: '#B7C8C8' },
  { id: 'toaster', name: 'Toaster', category: 'creative', cssFilter: 'brightness(110%) contrast(145%) saturate(120%) sepia(32%) grayscale(0%) hue-rotate(345deg)', previewColor: '#CE7253' },
  { id: 'valencia', name: 'Valencia', category: 'warm', cssFilter: 'brightness(110%) contrast(105%) saturate(125%) sepia(18%) grayscale(0%) hue-rotate(350deg)', previewColor: '#E8A97B' },
  { id: 'walden', name: 'Walden', category: 'cool', cssFilter: 'brightness(110%) contrast(100%) saturate(80%) sepia(12%) grayscale(0%) hue-rotate(18deg)', previewColor: '#A9C7CA' },
  { id: 'willow', name: 'Willow', category: 'mono', cssFilter: 'brightness(110%) contrast(90%) saturate(0%) sepia(18%) grayscale(100%) hue-rotate(0deg)', previewColor: '#B4AA9B' },
  { id: 'x-pro-ii', name: 'X-Pro II', category: 'creative', cssFilter: 'brightness(105%) contrast(150%) saturate(145%) sepia(20%) grayscale(0%) hue-rotate(345deg)', previewColor: '#B85C54' },
] satisfies FilterPreset[]

export const filterById = (id: string) => FILTER_PRESETS.find((filter) => filter.id === id)
