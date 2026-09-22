import { strict as assert } from 'node:assert'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const checkerPath = new URL('./check-release.mjs', import.meta.url)
const svgAsset = 'frame-abcdefgh.svg'
const secondSvgAsset = 'frame-qrstuvwx.svg'
const pngAsset = 'frame-hijklmno.png'

function writeFixture({ assets, precacheUrls, comments = [] }) {
  const directory = mkdtempSync(join(tmpdir(), 'photobooth-release-check-'))
  const assetsDirectory = join(directory, 'dist', 'assets')
  mkdirSync(assetsDirectory, { recursive: true })
  mkdirSync(join(directory, 'scripts'))
  copyFileSync(checkerPath, join(directory, 'scripts', 'check-release.mjs'))
  for (const asset of assets) writeFileSync(join(assetsDirectory, asset), '')

  const serviceWorker = [
    "const CACHE_NAME = 'photobooth-app-shell-123456789abc'",
    `const PRECACHE_URLS = ${JSON.stringify(precacheUrls)}`,
    ...comments.map((comment) => `// ${comment}`),
  ].join('\n')
  writeFileSync(join(directory, 'dist', 'sw.js'), serviceWorker)
  return directory
}

function expectReleaseFailure(name, fixture, expectedMessage) {
  const directory = writeFixture(fixture)
  try {
    const result = spawnSync(process.execPath, ['scripts/check-release.mjs'], {
      cwd: directory,
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0, `${name} unexpectedly passed`)
    assert.match(result.stderr, new RegExp(expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    console.log(`${name}: ${expectedMessage}`)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

expectReleaseFailure('missing SVG', {
  assets: [pngAsset],
  precacheUrls: [`/assets/${pngAsset}`],
}, 'No fingerprinted SVG frame asset found')

expectReleaseFailure('missing PNG', {
  assets: [svgAsset],
  precacheUrls: [`/assets/${svgAsset}`],
}, 'No fingerprinted PNG frame asset found')

expectReleaseFailure('frame outside precache', {
  assets: [svgAsset, pngAsset],
  precacheUrls: [],
  comments: [`/assets/${svgAsset}`, `/assets/${pngAsset}`],
}, `Frame asset missing from service-worker precache: /assets/${svgAsset}`)

expectReleaseFailure('non-first same-format frame outside precache', {
  assets: [svgAsset, secondSvgAsset, pngAsset],
  precacheUrls: [`/assets/${svgAsset}`, `/assets/${pngAsset}`],
}, `Frame asset missing from service-worker precache: /assets/${secondSvgAsset}`)

console.log('Release checker failure coverage passed.')
