# Frame-First Live Photobooth and Boomerang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frame selection the first step, show the camera live inside the active frame slot, capture a short motion sequence per pose, and export every slot moving together as an adaptive MP4/WebM boomerang.

**Architecture:** Extend the Zustand session with slot-indexed live sequences, extract one shared canvas renderer for static/preview/video consistency, and add isolated capture, preview, boomerang, and recorder services. Keep photo capture authoritative: every live failure falls back to a valid static session, while Result and Gallery add video as a discriminated second media type.

**Tech Stack:** React 19, TypeScript 5.7, Zustand 5, React Router 7, Canvas 2D, MediaRecorder, IndexedDB, Vitest, Testing Library, Playwright, Vite 8.

**Spec:** `docs/superpowers/specs/2026-09-23-frame-first-live-boomerang-design.md`

## Global Constraints

- The default route flow is Home → Frame selection → Camera setup → Live Studio → Editor → Result.
- All camera, photo, sequence, video, and gallery processing remains local to the browser; no server upload is introduced.
- Live Boomerang defaults to enabled, samples approximately 1.2 seconds at 10–12 fps, and never blocks static capture.
- Every slot moves simultaneously using forward → reverse → forward ordering with duplicate turnaround endpoints removed.
- Video output is silent and uses the first actually supported MP4/H.264, WebM/VP9, WebM/VP8, or browser-selected format; MIME and extension must match the produced Blob.
- Static photo export retains current full-resolution PNG/JPEG/WebP behavior.
- Direct-route guards, keyboard operation, visible status text, live regions, and `prefers-reduced-motion` behavior remain accessible.
- Existing 41 frames and the local upload path must remain functional.
- Do not add a GIF encoder or server-side transcoding dependency.
- Do not stage or commit `Photobooth_Template/`.

## Review Focus

- **Interrupted capture:** cancelling, navigating, switching device, or retaking during sampling must not commit a partial still or sequence; pinned in Task 4 and Task 7 tests.
- **Unequal/missing live sequences:** video composition must clamp shorter sequences and reject/fallback clearly when a required slot has no sequence; pinned in Task 9 tests.
- **Codec truthfulness:** the downloaded extension, share metadata, and displayed label must come from `MediaRecorder.mimeType`/Blob type rather than the requested candidate; pinned in Task 8 and Task 10 tests.
- **Legacy gallery migration:** version-1 image records without `kind` or `posterBlob` must still list and open after the schema upgrade; pinned in Task 11 tests.
- **Memory cleanup:** retake, Live disable, regeneration, route reset, and unmount must revoke generated URLs and release sequence references; pinned in Task 1, Task 7, Task 9, and Task 10 tests.

---

## Planned File Structure

- Create `src/features/frames/FrameSelection.tsx` and `frame-selection.css`: pre-camera catalog and confirmation UI.
- Create `src/pages/FrameSelectionPage.tsx`: page shell for `/frames`.
- Create `src/features/export/frame-renderer.ts`: shared synchronous canvas drawing once decoded inputs/assets are available.
- Create `src/features/camera/live-capture-service.ts`: cancellable sequence sampling and middle-frame still selection.
- Create `src/features/camera/LiveFramePreview.tsx`: requestAnimationFrame preview renderer.
- Create `src/features/export/media-recorder-service.ts`: MIME negotiation and canvas-stream recording.
- Create `src/features/export/boomerang-compositor.ts`: sequence ordering, decoding, synchronized drawing, adaptive dimensions, and recording.
- Modify `src/catalog/types.ts` and `src/store/session-store.ts`: live source/result session model and lifecycle actions.
- Modify camera, editor, export, gallery, router, page, style, and test files only where their existing responsibilities require it.

### Task 1: Live Session Model and Lifecycle

**Files:**
- Modify: `src/catalog/types.ts`
- Modify: `src/store/session-store.ts`
- Modify: `src/store/session-store.test.ts`

**Interfaces:**
- Produces: `LiveFrameSample`, `LiveSequence`, `BoomerangResult`, `CapturedPose`.
- Produces: `commitCapturedPose(index: number, pose: CapturedPose)`, `clearLiveSequences()`, `setBoomerangResult(result: BoomerangResult | null)`, and `invalidateOutputs()` actions.
- Consumes: existing `FrameTemplate`, layout lookup, static composed-result cleanup.

- [ ] **Step 1: Write failing store tests for defaults, atomic capture/retake, non-destructive frame changes, invalidation, and cleanup**

```ts
it('stores a still and live sequence atomically at its slot', () => {
  const sequence = { frames: [new Blob(['a'], { type: 'image/webp' })], width: 320, height: 240, fps: 10 }
  useSessionStore.getState().commitCapturedPose(0, { photo: 'data:image/jpeg;base64,one', sequence })
  expect(useSessionStore.getState()).toMatchObject({
    photos: ['data:image/jpeg;base64,one'],
    liveSequences: [sequence],
  })
})

it('keeps surplus media when switching to a smaller frame', () => {
  seedFourCapturedPoses()
  useSessionStore.getState().setFrame(frameWithThreeSlots.id)
  expect(useSessionStore.getState().photos).toHaveLength(4)
  expect(useSessionStore.getState().liveSequences).toHaveLength(4)
  expect(useSessionStore.getState().requiredShots).toBe(3)
})

it('revokes both generated result URLs on reset', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  useSessionStore.setState({ composedResultUrl: 'blob:photo', boomerangResult: { blob: new Blob(), url: 'blob:video', mimeType: 'video/webm' } })
  useSessionStore.getState().resetSession()
  expect(revoke).toHaveBeenCalledWith('blob:photo')
  expect(revoke).toHaveBeenCalledWith('blob:video')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:unit -- src/store/session-store.test.ts`

Expected: FAIL because live types and actions do not exist.

- [ ] **Step 3: Add live types and lifecycle-safe state actions**

```ts
export interface LiveFrameSample { blob: Blob }
export interface LiveSequence {
  frames: LiveFrameSample[]
  width: number
  height: number
  fps: number
}
export interface CapturedPose { photo: string; sequence: LiveSequence | null; liveError?: string }
export interface BoomerangResult { blob: Blob; url: string; mimeType: string }

export interface PhotoSession {
  // existing fields remain
  liveEnabled: boolean
  liveSequences: Array<LiveSequence | null>
  liveErrors: Array<string | null>
  boomerangResult: BoomerangResult | null
}
```

Implement `commitCapturedPose` as an indexed immutable update that extends arrays without truncating surplus captures. `setFrame`, filter/intensity/caption/date changes, and photo mutations call one internal output invalidator. `setLiveEnabled(false)` clears sequences/errors and invalidates video only. `resetSession` revokes both blob URLs before replacing state.

- [ ] **Step 4: Run store and type tests GREEN**

Run: `npm run test:unit -- src/store/session-store.test.ts && npm run typecheck`

Expected: store tests and TypeScript pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/catalog/types.ts src/store/session-store.ts src/store/session-store.test.ts
git commit -m "feat: add live capture session state"
```

### Task 2: Frame-First Route and Selection Page

**Files:**
- Create: `src/features/frames/FrameSelection.tsx`
- Create: `src/features/frames/frame-selection.css`
- Create: `src/features/frames/FrameSelection.test.tsx`
- Create: `src/pages/FrameSelectionPage.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/features/camera/CameraSetup.tsx`
- Modify: `src/features/gallery/Gallery.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `FRAME_TEMPLATES`, `FrameBrowser`/`FrameThumbnail` presentation patterns, `setFrame`, `resetSession`.
- Produces: `/frames` as the required start-of-session route and selected-frame guard for `/setup`.

- [ ] **Step 1: Write failing routing and selection tests**

```tsx
it('starts a new session at frame selection', async () => {
  renderApp(['/'])
  await userEvent.click(screen.getByRole('link', { name: /mulai photobooth/i }))
  expect(screen.getByRole('heading', { name: /pilih frame/i })).toBeVisible()
})

it('stores the frame and required poses before camera setup', async () => {
  render(<FrameSelection />)
  await userEvent.click(screen.getByRole('button', { name: /sakura diary/i }))
  await userEvent.click(screen.getByRole('button', { name: /lanjut ke kamera/i }))
  expect(useSessionStore.getState()).toMatchObject({ selectedFrame: 'sakura-diary', requiredShots: 3 })
  expect(mockNavigate).toHaveBeenCalledWith('/setup')
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm run test:unit -- src/features/frames/FrameSelection.test.tsx src/app/App.test.tsx`

Expected: FAIL because `/frames` and `FrameSelection` do not exist.

- [ ] **Step 3: Implement the selection page and navigation changes**

```tsx
export function FrameSelection() {
  const navigate = useNavigate()
  const selectedFrame = useSessionStore((state) => state.selectedFrame)
  const setFrame = useSessionStore((state) => state.setFrame)
  const selected = frameById(selectedFrame)
  return <section className="frame-selection page-width" aria-labelledby="frame-selection-title">
    <header><p className="section-kicker">Langkah 1 dari 5</p><h1 id="frame-selection-title">Pilih frame sebelum berpose</h1></header>
    <FrameBrowser selectedFrame={selectedFrame} onSelect={setFrame} /* controlled filter props */ />
    <button type="button" className="button primary-button" disabled={!selected} onClick={() => navigate('/setup')}>
      Lanjut ke kamera · {layoutById(selected!.layoutId)!.requiredShots} pose
    </button>
  </section>
}
```

Add `{ path: '/frames', element: <FrameSelectionPage /> }`. Change Home and Gallery new-session links from `/setup` to `/frames`. Camera Setup's back action returns to `/frames`, its step label becomes step 2, and direct `/setup` access uses the current valid default frame rather than clearing selection.

- [ ] **Step 4: Run component, routing, and accessibility assertions GREEN**

Run: `npm run test:unit -- src/features/frames/FrameSelection.test.tsx src/app/App.test.tsx src/features/camera/CameraSetup.test.tsx`

Expected: all selected tests pass; frame cards expose name, category, and pose count to accessible names/text.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/features/frames src/pages/FrameSelectionPage.tsx src/app/router.tsx src/pages/HomePage.tsx src/features/camera/CameraSetup.tsx src/features/gallery/Gallery.tsx src/app/App.test.tsx
git commit -m "feat: make frame selection the first step"
```

### Task 3: Shared Canvas Frame Renderer

**Files:**
- Create: `src/features/export/frame-renderer.ts`
- Create: `src/features/export/frame-renderer.test.ts`
- Modify: `src/features/export/compositor.ts`
- Modify: `src/features/export/compositor.test.ts`

**Interfaces:**
- Produces: `PreparedFrameAssets`, `prepareFrameAssets(frame)`, `drawFrameComposition(input): void`, and `interpolateFilter(cssFilter, intensity)`.
- Consumes: decoded `CanvasImageSource` objects with explicit dimensions; existing frame geometry and asset loader.
- Used later by: Live preview (Task 5) and boomerang compositor (Task 9).

- [ ] **Step 1: Write failing renderer tests for cover crop, rotation, layer order, filter, caption, and date**

```ts
it('draws underlay, rotated clipped slots, overlay, then caption', () => {
  drawFrameComposition({ context, canvas, frame, assets, slots: [{ source: photo, width: 640, height: 480 }], filter, intensity: 60, caption: 'HI', showDate: true, date })
  expect(callNames(context)).toEqual(expect.arrayContaining(['fillRect', 'clip', 'drawImage', 'fillText']))
  expect(context.rotate).toHaveBeenCalledWith(frame.slots[0].rotation! * Math.PI * 2)
  expect(drawOrder()).toEqual(['underlay', 'photo-0', 'overlay'])
})
```

- [ ] **Step 2: Run renderer tests and verify RED**

Run: `npm run test:unit -- src/features/export/frame-renderer.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Extract the renderer with explicit decoded-source inputs**

```ts
export interface RenderSource { source: CanvasImageSource; width: number; height: number }
export interface PreparedFrameAsset { layer: FrameAssetLayer; image: CanvasImageSource; width: number; height: number }
export interface DrawFrameCompositionInput {
  context: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  frame: FrameTemplate
  assets: PreparedFrameAsset[]
  slots: Array<RenderSource | null>
  filter: FilterPreset
  intensity: number
  caption: string
  showDate: boolean
  date: Date
  placeholder?: (context: CanvasRenderingContext2D, slotIndex: number, box: DOMRect) => void
}
```

Move normalized slot drawing, rounded clipping, underlay/overlay ordering, border, interpolated filter, caption, and date into `drawFrameComposition`. Keep image decoding and final `canvas.toBlob` in `compositor.ts`, then delegate drawing to the shared function.

- [ ] **Step 4: Prove static output behavior remains GREEN**

Run: `npm run test:unit -- src/features/export/frame-renderer.test.ts src/features/export/compositor.test.ts src/features/export/geometry.test.ts`

Expected: new renderer tests and all existing compositor tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/features/export/frame-renderer.ts src/features/export/frame-renderer.test.ts src/features/export/compositor.ts src/features/export/compositor.test.ts
git commit -m "refactor: share frame canvas rendering"
```

### Task 4: Cancellable Live Pose Sampling

**Files:**
- Create: `src/features/camera/live-capture-service.ts`
- Create: `src/features/camera/live-capture-service.test.ts`
- Modify: `src/features/camera/camera-service.ts`
- Modify: `src/features/camera/camera-service.test.ts`

**Interfaces:**
- Produces: `captureLivePose(video, options): Promise<CapturedPose>` and `middleFrameIndex(length): number`.
- Consumes: `HTMLVideoElement`, `AbortSignal`, mirror/filter options, adaptive long-edge cap.
- Used later by: Studio Task 7.

- [ ] **Step 1: Write failing service tests for frame count, midpoint still, mirror/filter, abort, and live fallback**

```ts
it('samples twelve frames and uses the middle frame as the still', async () => {
  const pose = await captureLivePose(video, { durationMs: 1_200, fps: 10, mirror: true, filter: 'sepia(20%)', signal, dependencies })
  expect(pose.sequence?.frames).toHaveLength(12)
  expect(pose.photo).toBe(await blobToDataUrl(pose.sequence!.frames[6].blob))
})

it('rejects without committing when aborted between samples', async () => {
  dependencies.sleep.mockImplementationOnce(() => { controller.abort(); return Promise.resolve() })
  await expect(captureLivePose(video, options(controller.signal))).rejects.toMatchObject({ name: 'AbortError' })
})

it('returns a static pose when sequence encoding fails after a valid still', async () => {
  dependencies.encodeSequenceFrame.mockRejectedValueOnce(new Error('quota'))
  await expect(captureLivePose(video, options)).resolves.toMatchObject({ sequence: null, liveError: expect.stringContaining('Live') })
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:unit -- src/features/camera/live-capture-service.test.ts src/features/camera/camera-service.test.ts`

Expected: FAIL because live sampling APIs do not exist.

- [ ] **Step 3: Implement adaptive sampling and injectable timing/encoding dependencies**

```ts
export async function captureLivePose(video: HTMLVideoElement, options: LiveCaptureOptions): Promise<CapturedPose> {
  assertVideoReady(video)
  const frameCount = Math.max(2, Math.round(options.durationMs / 1_000 * options.fps))
  const frames: LiveFrameSample[] = []
  for (let index = 0; index < frameCount; index += 1) {
    throwIfAborted(options.signal)
    frames.push({ blob: await encodeVideoFrame(video, options) })
    if (index < frameCount - 1) await abortableDelay(1_000 / options.fps, options.signal)
  }
  const photo = await blobToDataUrl(frames[middleFrameIndex(frames.length)].blob)
  return { photo, sequence: { frames, width: options.width, height: options.height, fps: options.fps } }
}
```

Use a reusable canvas, `image/webp` at controlled quality for sequence frames, and JPEG 0.92 for static fallback. Do not create object URLs for sequence frames.

- [ ] **Step 4: Run capture services and typecheck GREEN**

Run: `npm run test:unit -- src/features/camera/live-capture-service.test.ts src/features/camera/camera-service.test.ts && npm run typecheck`

Expected: focused tests and types pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/features/camera/live-capture-service.ts src/features/camera/live-capture-service.test.ts src/features/camera/camera-service.ts src/features/camera/camera-service.test.ts
git commit -m "feat: capture cancellable live pose sequences"
```

### Task 5: Real-Time Framed Preview

**Files:**
- Create: `src/features/camera/LiveFramePreview.tsx`
- Create: `src/features/camera/LiveFramePreview.test.tsx`
- Modify: `src/features/camera/studio.css`

**Interfaces:**
- Consumes: selected `FrameTemplate`, filter, completed photo URLs, active slot, video element, camera status, mirror setting, prepared assets, shared renderer.
- Produces: a responsive canvas and hidden `video` element ref for Studio; no session mutations.

- [ ] **Step 1: Write failing preview tests for active/completed/future sources, rotation, and cleanup**

```tsx
it('draws completed photos, live video in the active slot, and null future slots', async () => {
  render(<LiveFramePreview frame={frame4} photos={[photoOne]} activeSlot={1} cameraStatus="active" {...props} />)
  await waitFor(() => expect(drawFrameComposition).toHaveBeenCalled())
  const input = vi.mocked(drawFrameComposition).mock.lastCall![0]
  expect(input.slots[0]?.source).toBeInstanceOf(HTMLImageElement)
  expect(input.slots[1]?.source).toBeInstanceOf(HTMLVideoElement)
  expect(input.slots[2]).toBeNull()
})

it('cancels requestAnimationFrame and releases decoded photo URLs on unmount', () => {
  const { unmount } = render(<LiveFramePreview {...props} />)
  unmount()
  expect(cancelAnimationFrame).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run focused preview tests and verify RED**

Run: `npm run test:unit -- src/features/camera/LiveFramePreview.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the isolated requestAnimationFrame preview**

```tsx
export const LiveFramePreview = forwardRef<HTMLVideoElement, LiveFramePreviewProps>((props, forwardedRef) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let animationId = 0
    let disposed = false
    const draw = () => {
      if (disposed) return
      drawFrameComposition(buildPreviewInput(props, canvasRef.current!, videoRef.current!))
      animationId = requestAnimationFrame(draw)
    }
    void preparePreviewSources(props).then(draw)
    return () => { disposed = true; cancelAnimationFrame(animationId) }
  }, [previewIdentity(props)])
  return <div className="live-frame-preview"><canvas ref={canvasRef} aria-label="Pratinjau kamera di dalam frame" /><video ref={mergeRefs(videoRef, forwardedRef)} autoPlay muted playsInline /></div>
})
```

Use CSS aspect-ratio from `frame.output`, cap viewport height, render pose labels outside export layers, and avoid announcing every animation frame.

- [ ] **Step 4: Run preview and renderer tests GREEN**

Run: `npm run test:unit -- src/features/camera/LiveFramePreview.test.tsx src/features/export/frame-renderer.test.ts`

Expected: both suites pass.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/features/camera/LiveFramePreview.tsx src/features/camera/LiveFramePreview.test.tsx src/features/camera/studio.css
git commit -m "feat: preview camera inside selected frame"
```

### Task 6: Async Capture State Machine

**Files:**
- Modify: `src/features/camera/capture-machine.ts`
- Modify: `src/features/camera/capture-machine.test.ts`

**Interfaces:**
- Produces: `CaptureStatus` including `capturing`; async `capture(replaceIndex, signal): Promise<void>`; cancellation token protection.
- Consumes: timer, required-shot count, committed photo count.
- Used later by: Studio Task 7.

- [ ] **Step 1: Write failing tests for async completion, duplicate trigger suppression, rejection, and cancellation**

```ts
it('stays capturing until the asynchronous pose commits', async () => {
  const deferred = promiseWithResolvers<void>()
  const machine = createCaptureMachine({ ...options, capture: () => deferred.promise })
  advanceCountdown(machine)
  expect(machine.getState().status).toBe('capturing')
  deferred.resolve()
  await flushPromises()
  expect(machine.getState().status).toBe('captured')
})

it('ignores a late capture resolution after cancel', async () => {
  const deferred = promiseWithResolvers<void>()
  const machine = createCaptureMachine({ ...options, capture: () => deferred.promise })
  advanceCountdown(machine)
  machine.cancel()
  deferred.resolve()
  await flushPromises()
  expect(machine.getState().status).toBe('ready')
})
```

- [ ] **Step 2: Run the state-machine test and verify RED**

Run: `npm run test:unit -- src/features/camera/capture-machine.test.ts`

Expected: FAIL because capture is synchronous and `capturing` is absent.

- [ ] **Step 3: Add generation-token and AbortController-controlled async capture**

```ts
interface CaptureMachineOptions {
  capture: (replaceIndex: number | null, signal: AbortSignal) => Promise<void>
  // existing options
}

const beginCapture = () => {
  const generation = ++captureGeneration
  captureController = new AbortController()
  setState({ status: 'capturing', remaining: 0 })
  void options.capture(state.retakeIndex, captureController.signal)
    .then(() => { if (generation === captureGeneration) syncCommittedState() })
    .catch((error) => { if (generation === captureGeneration && error?.name !== 'AbortError') setCaptureError(error) })
}
```

`cancel()` and `dispose()` abort and increment the generation before resetting state. Ignore trigger/retake while countdown, flashing, or capturing.

- [ ] **Step 4: Run state-machine tests GREEN**

Run: `npm run test:unit -- src/features/camera/capture-machine.test.ts`

Expected: all synchronous legacy expectations updated for awaited completion and all new cases pass.

- [ ] **Step 5: Commit Task 6**

```bash
git add src/features/camera/capture-machine.ts src/features/camera/capture-machine.test.ts
git commit -m "feat: support cancellable async photo capture"
```

### Task 7: Integrate Frame Preview and Live Capture into Studio

**Files:**
- Modify: `src/features/camera/Studio.tsx`
- Modify: `src/features/camera/Studio.test.tsx`
- Modify: `src/features/camera/studio.css`
- Modify: `src/pages/StudioPage.tsx`

**Interfaces:**
- Consumes: `LiveFramePreview`, `captureLivePose`, async capture machine, live session actions, current frame/filter.
- Produces: complete Studio flow, retake, Live toggle, missing-pose continuation, and guards.

- [ ] **Step 1: Write failing Studio tests for selected-frame preview, default Live capture, retake, static fallback, and cancellation**

```tsx
it('captures the active pose and advances the live frame slot', async () => {
  captureLivePose.mockResolvedValue({ photo: photoOne, sequence })
  render(<Studio />)
  expect(screen.getByText(/pose 1 dari 3/i)).toBeVisible()
  await triggerAndFinishCountdown()
  await waitFor(() => expect(useSessionStore.getState().photos).toEqual([photoOne]))
  expect(useSessionStore.getState().liveSequences[0]).toBe(sequence)
  expect(screen.getByText(/pose 2 dari 3/i)).toBeVisible()
})

it('keeps a static photo when live sampling reports a fallback', async () => {
  captureLivePose.mockResolvedValue({ photo: photoOne, sequence: null, liveError: 'Live tidak tersedia.' })
  render(<Studio />)
  await triggerAndFinishCountdown()
  expect(useSessionStore.getState().photos).toEqual([photoOne])
  expect(screen.getByRole('status')).toHaveTextContent(/live tidak tersedia/i)
})
```

- [ ] **Step 2: Run Studio tests and verify RED**

Run: `npm run test:unit -- src/features/camera/Studio.test.tsx`

Expected: FAIL because Studio still uses the plain viewfinder and synchronous `captureFrame`.

- [ ] **Step 3: Replace the plain viewfinder with framed preview and async pose capture**

```tsx
const capturePose = async (replaceIndex: number | null, signal: AbortSignal) => {
  const video = videoRef.current
  if (!video || currentCamera.current.status !== 'active') throw new Error('Kamera belum aktif.')
  const index = replaceIndex ?? useSessionStore.getState().photos.length
  const pose = latest.current.liveEnabled
    ? await captureLivePose(video, liveOptions(latest.current, signal))
    : { photo: captureFrame(video, stillOptions(latest.current)), sequence: null }
  if (signal.aborted) throw new DOMException('Capture dibatalkan.', 'AbortError')
  useSessionStore.getState().commitCapturedPose(index, pose)
}
```

Render `LiveFramePreview`, an accessible Live toggle defaulted from store, sequence status, current pose, disabled controls while capturing, and retake buttons. On completed missing-pose continuation, retain existing media. Back goes to setup; setup back goes to frames.

- [ ] **Step 4: Run Studio, store, capture, and camera tests GREEN**

Run: `npm run test:unit -- src/features/camera/Studio.test.tsx src/features/camera/LiveFramePreview.test.tsx src/features/camera/live-capture-service.test.ts src/features/camera/capture-machine.test.ts src/store/session-store.test.ts`

Expected: all focused suites pass.

- [ ] **Step 5: Commit Task 7**

```bash
git add src/features/camera/Studio.tsx src/features/camera/Studio.test.tsx src/features/camera/studio.css src/pages/StudioPage.tsx
git commit -m "feat: capture live poses inside frame templates"
```

### Task 8: Adaptive MediaRecorder Service

**Files:**
- Create: `src/features/export/media-recorder-service.ts`
- Create: `src/features/export/media-recorder-service.test.ts`
- Modify: `src/features/export/export-service.ts`
- Modify: `src/features/export/export-service.test.ts`

**Interfaces:**
- Produces: `selectVideoMimeType(MediaRecorderClass): string | null`, `recordCanvas(canvas, draw, options): Promise<RecordedVideo>`, `extensionForVideoMime(mime): 'mp4' | 'webm'`, and `createBoomerangFilename(mime, date?)`.
- Consumes: canvas `captureStream`, runtime `MediaRecorder`, a frame-driving callback, abort signal.
- Used later by: boomerang compositor and Result.

- [ ] **Step 1: Write failing MIME negotiation and truthful filename tests**

```ts
it('prefers supported mp4 then vp9 then vp8', () => {
  MediaRecorder.isTypeSupported.mockImplementation((type) => type === 'video/webm;codecs=vp8')
  expect(selectVideoMimeType(MediaRecorder)).toBe('video/webm;codecs=vp8')
})

it('uses the recorder output MIME instead of the requested candidate', async () => {
  FakeRecorder.emittedType = 'video/webm'
  const result = await recordCanvas(canvas, drawFrames, options)
  expect(result.mimeType).toBe('video/webm')
  expect(result.blob.type).toBe('video/webm')
  expect(createBoomerangFilename(result.mimeType, date)).toMatch(/-boomerang\.webm$/)
})
```

- [ ] **Step 2: Run recorder tests and verify RED**

Run: `npm run test:unit -- src/features/export/media-recorder-service.test.ts src/features/export/export-service.test.ts`

Expected: FAIL because recorder helpers do not exist.

- [ ] **Step 3: Implement runtime feature detection and abort-safe recording**

```ts
const candidates = ['video/mp4;codecs=avc1.42E01E', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8'] as const

export const selectVideoMimeType = (Recorder = MediaRecorder) =>
  candidates.find((candidate) => Recorder.isTypeSupported(candidate)) ?? null

export async function recordCanvas(canvas: HTMLCanvasElement, render: (signal: AbortSignal) => Promise<void>, options: RecordCanvasOptions): Promise<RecordedVideo> {
  if (!canvas.captureStream || typeof MediaRecorder === 'undefined') throw new UnsupportedLiveVideoError()
  const stream = canvas.captureStream(options.fps)
  const requested = selectVideoMimeType(MediaRecorder)
  const recorder = requested ? new MediaRecorder(stream, { mimeType: requested, videoBitsPerSecond: options.videoBitsPerSecond }) : new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data) }
  const completion = recorderCompletion(recorder)
  recorder.start()
  try { await render(options.signal) } finally { if (recorder.state !== 'inactive') recorder.stop() }
  await completion
  stream.getTracks().forEach((track) => track.stop())
  const mimeType = recorder.mimeType || chunks[0]?.type
  return { blob: new Blob(chunks, { type: mimeType }), mimeType }
}
```

Handle synchronous constructor errors, recorder `error`, zero-byte output, abort, and track cleanup in every path.

- [ ] **Step 4: Run recorder/export tests GREEN**

Run: `npm run test:unit -- src/features/export/media-recorder-service.test.ts src/features/export/export-service.test.ts`

Expected: all selected tests pass.

- [ ] **Step 5: Commit Task 8**

```bash
git add src/features/export/media-recorder-service.ts src/features/export/media-recorder-service.test.ts src/features/export/export-service.ts src/features/export/export-service.test.ts
git commit -m "feat: record adaptive mp4 or webm output"
```

### Task 9: Synchronized Boomerang Compositor

**Files:**
- Create: `src/features/export/boomerang-compositor.ts`
- Create: `src/features/export/boomerang-compositor.test.ts`
- Modify: `src/features/export/frame-asset-loader.ts`
- Modify: `src/features/export/frame-asset-loader.test.ts`

**Interfaces:**
- Produces: `boomerangOrder(frameCount): number[]`, `chooseBoomerangDimensions(frame, capability): Dimensions`, and `composeBoomerang(input): Promise<RecordedVideo>`.
- Consumes: live sequences, frame/filter/design inputs, shared renderer, prepared assets, recorder service.
- Used later by: Result Task 10.

- [ ] **Step 1: Write failing ordering, synchronization, adaptive size, missing-slot, abort, and cleanup tests**

```ts
it('creates forward reverse forward order without duplicate turnarounds', () => {
  expect(boomerangOrder(4)).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3])
})

it('clamps a shorter slot sequence while all slots advance together', async () => {
  await composeBoomerang(inputWithFrameLengths([4, 2]))
  expect(renderedSourceIndices()).toEqual([
    [0, 0], [1, 1], [2, 1], [3, 1], [2, 1], [1, 1], [0, 0], [1, 1], [2, 1], [3, 1],
  ])
})

it('rejects with a recoverable message when a required slot has no live sequence', async () => {
  await expect(composeBoomerang(inputWithMissingSlot(1))).rejects.toThrow('Pose 2 belum memiliki rekaman Live')
})
```

- [ ] **Step 2: Run compositor tests and verify RED**

Run: `npm run test:unit -- src/features/export/boomerang-compositor.test.ts`

Expected: FAIL because the boomerang compositor does not exist.

- [ ] **Step 3: Implement decoding, synchronized rendering, and guaranteed cleanup**

```ts
export const boomerangOrder = (count: number) => {
  if (count < 2) return [0]
  const forward = Array.from({ length: count }, (_, index) => index)
  return [...forward, ...forward.slice(0, -1).reverse(), ...forward.slice(1)]
}

export async function composeBoomerang(input: ComposeBoomerangInput): Promise<RecordedVideo> {
  assertCompleteSequences(input.frame.slots.length, input.sequences)
  const decoded = await decodeSequences(input.sequences)
  try {
    const canvas = createOutputCanvas(chooseBoomerangDimensions(input.frame, input.capability))
    const assets = await prepareFrameAssets(input.frame)
    const order = boomerangOrder(Math.max(...decoded.map((sequence) => sequence.length)))
    return await recordCanvas(canvas, async (signal) => {
      for (const index of order) {
        throwIfAborted(signal)
        const slots = decoded.map((frames) => frames[Math.min(index, frames.length - 1)])
        drawFrameComposition(buildBoomerangFrame(input, canvas, assets, slots))
        await nextVideoFrame(input.fps, signal)
      }
    }, recorderOptions(input))
  } finally {
    decoded.flat().forEach((source) => source.close?.())
  }
}
```

Use `createImageBitmap(blob)` with an HTMLImageElement/object-URL fallback, and revoke every fallback URL. A low-capability decision caps the long edge at 720; otherwise 960.

- [ ] **Step 4: Run boomerang, renderer, asset-loader, and recorder tests GREEN**

Run: `npm run test:unit -- src/features/export/boomerang-compositor.test.ts src/features/export/frame-renderer.test.ts src/features/export/frame-asset-loader.test.ts src/features/export/media-recorder-service.test.ts`

Expected: all focused suites pass with cleanup assertions.

- [ ] **Step 5: Commit Task 9**

```bash
git add src/features/export/boomerang-compositor.ts src/features/export/boomerang-compositor.test.ts src/features/export/frame-asset-loader.ts src/features/export/frame-asset-loader.test.ts
git commit -m "feat: compose synchronized framed boomerangs"
```

### Task 10: Result Photo/Live Views and Save All

**Files:**
- Modify: `src/features/export/ResultPanel.tsx`
- Modify: `src/features/export/ResultPanel.test.tsx`
- Modify: `src/features/export/result.css`
- Modify: `src/pages/ResultPage.tsx`

**Interfaces:**
- Consumes: `composeBoomerang`, session live sequences/result, adaptive filename, existing download/share/print services.
- Produces: lazy Live generation, retry, Live download/share/save, `Save All`, reduced-motion preview.
- Produces callback: `saveToGallery(media: GallerySaveRequest): Promise<void>` for Task 11's discriminated gallery input.

- [ ] **Step 1: Write failing Result tests for lazy generation, truthful format, retry, static fallback, Save All partial failure, and URL cleanup**

```tsx
it('generates Live only after its tab opens and displays the actual recorder format', async () => {
  composeBoomerang.mockResolvedValue({ blob: webmBlob, mimeType: 'video/webm' })
  render(<ResultPanel />)
  expect(composeBoomerang).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('tab', { name: /live boomerang/i }))
  await screen.findByText(/webm/i)
  expect(screen.getByRole('button', { name: /unduh boomerang/i })).toBeEnabled()
})

it('keeps the saved photo when video saving fails', async () => {
  saveToGallery.mockResolvedValueOnce().mockRejectedValueOnce(new Error('Video gagal'))
  await userEvent.click(screen.getByRole('button', { name: /simpan semua/i }))
  expect(screen.getByRole('status')).toHaveTextContent(/foto tersimpan.*video gagal/i)
})
```

- [ ] **Step 2: Run Result tests and verify RED**

Run: `npm run test:unit -- src/features/export/ResultPanel.test.tsx src/pages/ResultPage.test.tsx`

Expected: FAIL because Photo/Live tabs and video callbacks do not exist.

- [ ] **Step 3: Implement tabs and lazy generation state machine**

```ts
type LiveStatus =
  | { kind: 'idle' }
  | { kind: 'generating'; controller: AbortController }
  | { kind: 'ready'; result: BoomerangResult }
  | { kind: 'unsupported' | 'error'; message: string }

const openLive = async () => {
  setActiveView('live')
  if (liveStatus.kind === 'ready' || liveStatus.kind === 'generating') return
  const controller = new AbortController()
  setLiveStatus({ kind: 'generating', controller })
  try {
    const recorded = await composeBoomerang(buildInput(session, controller.signal))
    const url = URL.createObjectURL(recorded.blob)
    useSessionStore.getState().setBoomerangResult({ ...recorded, url })
    setLiveStatus({ kind: 'ready', result: { ...recorded, url } })
  } catch (error) {
    setLiveStatus(classifyLiveError(error))
  }
}
```

Use accessible tabs, muted/loop/playsInline video, and `autoPlay={!reducedMotion}`. Abort generation on unmount/source identity change. `Save All` invokes image and video saves independently and reports both outcomes.

- [ ] **Step 4: Run Result and export tests GREEN**

Run: `npm run test:unit -- src/features/export/ResultPanel.test.tsx src/pages/ResultPage.test.tsx src/features/export/boomerang-compositor.test.ts src/features/export/export-service.test.ts`

Expected: all selected tests pass.

- [ ] **Step 5: Commit Task 10**

```bash
git add src/features/export/ResultPanel.tsx src/features/export/ResultPanel.test.tsx src/features/export/result.css src/pages/ResultPage.tsx
git commit -m "feat: add live boomerang result and export"
```

### Task 11: Image/Video Local Gallery and Migration

**Files:**
- Modify: `src/features/gallery/gallery-db.ts`
- Modify: `src/features/gallery/gallery-db.test.ts`
- Modify: `src/features/gallery/Gallery.tsx`
- Modify: `src/features/gallery/Gallery.test.tsx`
- Modify: `src/features/gallery/gallery.css`
- Modify: `src/pages/ResultPage.tsx`

**Interfaces:**
- Produces: discriminated `ImageGalleryRecord | VideoGalleryRecord`, schema version 2, legacy normalization, poster-backed video cards.
- Consumes: static Blob and optional video Blob/poster from Result.

- [ ] **Step 1: Write failing database migration and Gallery video tests**

```ts
it('normalizes a version-one image record without kind', async () => {
  await seedLegacyRecord({ id: 'old', blob: pngBlob, mimeType: 'image/png', ...metadata })
  const [record] = await listGalleryRecords()
  expect(record).toMatchObject({ id: 'old', kind: 'image' })
})

it('persists a video and its static poster', async () => {
  const saved = await saveGalleryRecord({ kind: 'video', blob: webmBlob, posterBlob: pngBlob, ...metadata })
  expect(saved).toMatchObject({ kind: 'video', mimeType: 'video/webm', posterBlob: pngBlob })
})

it('uses a poster in the grid and an accessible looping player in preview', async () => {
  render(<Gallery repository={videoRepository} />)
  expect(await screen.findByRole('img', { name: /pratinjau boomerang/i })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: /putar boomerang/i }))
  expect(screen.getByLabelText(/video boomerang/i)).toHaveAttribute('playsinline')
})
```

- [ ] **Step 2: Run gallery tests and verify RED**

Run: `npm run test:unit -- src/features/gallery/gallery-db.test.ts src/features/gallery/Gallery.test.tsx`

Expected: FAIL because gallery records are image-only.

- [ ] **Step 3: Upgrade records, normalize legacy images, and render poster-backed video previews**

```ts
export type GalleryRecord = ImageGalleryRecord | VideoGalleryRecord
interface GalleryRecordBase { id: string; createdAt: number; blob: Blob; mimeType: string; size: number /* metadata */ }
export interface ImageGalleryRecord extends GalleryRecordBase { kind: 'image' }
export interface VideoGalleryRecord extends GalleryRecordBase { kind: 'video'; posterBlob: Blob }

const normalizeRecord = (record: GalleryRecord | LegacyGalleryRecord): GalleryRecord =>
  'kind' in record ? record : { ...record, kind: 'image' }
```

Bump the database version to 2 without deleting or replacing the object store. Gallery list cards create a URL from `posterBlob` for videos and from `blob` for images. The dialog creates the video URL only while open, revokes it on close, and respects reduced motion. Download uses the record's real MIME extension.

- [ ] **Step 4: Run gallery, Result page, and migration tests GREEN**

Run: `npm run test:unit -- src/features/gallery/gallery-db.test.ts src/features/gallery/Gallery.test.tsx src/pages/ResultPage.test.tsx`

Expected: legacy image and new video paths pass.

- [ ] **Step 5: Commit Task 11**

```bash
git add src/features/gallery/gallery-db.ts src/features/gallery/gallery-db.test.ts src/features/gallery/Gallery.tsx src/features/gallery/Gallery.test.tsx src/features/gallery/gallery.css src/pages/ResultPage.tsx
git commit -m "feat: store and play boomerangs in local gallery"
```

### Task 12: Route Guards, Responsive Polish, and End-to-End Regression

**Files:**
- Modify: `src/pages/SetupPage.tsx`
- Modify: `src/pages/StudioPage.tsx`
- Modify: `src/pages/EditorPage.tsx`
- Modify: `src/pages/ResultPage.tsx`
- Modify: `src/shared/styles/global.css`
- Modify: `e2e/photobooth.spec.ts`
- Modify: `e2e/flow-regressions.spec.ts`
- Create: `e2e/frame-first-live.spec.ts`
- Modify: `scripts/check-release.mjs` only if the new route/media assets reveal a release-manifest gap.

**Interfaces:**
- Consumes: all completed feature interfaces.
- Produces: guarded production flow and full release verification.

- [ ] **Step 1: Add failing E2E coverage for frame-first 1/3/4 poses, mobile preview, upload fallback, frame-count change, mocked recorder, and unsupported recorder**

```ts
test('frame-first three-pose session previews slots and exports a live boomerang', async ({ page }) => {
  await installFakeCamera(page)
  await installFakeCanvasRecorder(page, { mimeType: 'video/webm' })
  await page.goto('/')
  await page.getByRole('link', { name: /mulai photobooth/i }).click()
  await page.getByRole('button', { name: /sakura diary/i }).click()
  await page.getByRole('button', { name: /lanjut ke kamera.*3 pose/i }).click()
  await activateAndEnterStudio(page)
  await expect(page.getByLabel(/pratinjau kamera di dalam frame/i)).toBeVisible()
  await capturePoses(page, 3)
  await finishEditor(page)
  await page.getByRole('tab', { name: /live boomerang/i }).click()
  await expect(page.getByText(/webm/i)).toBeVisible()
})
```

- [ ] **Step 2: Run the new E2E file and verify RED before final integration fixes**

Run: `npx playwright test e2e/frame-first-live.spec.ts`

Expected: at least one test fails on missing guard/polish behavior identified by real navigation.

- [ ] **Step 3: Complete route guards and responsive/accessibility polish**

Guard rules:

```tsx
if (!frameById(selectedFrame)) return <Navigate to="/frames" replace />
if (!cameraDeviceId && photos.length === 0) return <Navigate to="/setup" replace />
if (photos.length < requiredShots) return <Navigate to="/studio" replace />
if (!composedResultBlob) return <Navigate to="/editor" replace />
```

Use route-appropriate guard UI only where an automatic redirect would hide a recoverable user choice. Verify the frame canvas fits 390 px width without horizontal scrolling, result tabs remain reachable, Studio controls have 44 px touch targets, focus states are visible, status updates use `aria-live`, and reduced motion disables video autoplay.

- [ ] **Step 4: Run the complete quality gate**

Run: `npm run verify`

Expected: all unit tests, TypeScript, production build/release checks, and all Playwright tests pass.

- [ ] **Step 5: Inspect production bundle and repository scope**

Run: `git status --short && git diff --check && git diff --stat HEAD~12..HEAD`

Expected: only planned source/docs/tests are tracked; `Photobooth_Template/` remains untracked; no generated test artifacts are staged; no whitespace errors.

- [ ] **Step 6: Commit Task 12**

```bash
git add src/pages src/shared/styles/global.css e2e scripts/check-release.mjs
git commit -m "test: verify frame-first live photobooth flow"
```

## Final Verification and Delivery

- [ ] Run `npm run verify` once more from a clean process and retain the exact pass counts.
- [ ] Run `git status --short` and confirm only intentionally untracked source templates remain.
- [ ] Review the complete branch diff against `docs/superpowers/specs/2026-09-23-frame-first-live-boomerang-design.md`.
- [ ] Do not push or deploy until the user explicitly requests it after reviewing the completed implementation.
