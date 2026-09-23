# Frame-First Live Photobooth and Boomerang Design

## Objective

Make the website behave like a physical photobooth: visitors choose a frame before entering the camera session, see themselves positioned inside the selected frame in real time, capture the exact number of poses required by that frame, and optionally save a short boomerang in which every photo slot moves simultaneously.

The experience must remain private and client-side, work across mobile and desktop browsers, preserve static-photo export, and degrade safely when live recording is unsupported.

## Product Flow

The default journey is:

1. Home.
2. Frame selection.
3. Camera permission and device setup.
4. Live framed Studio capture.
5. Editor.
6. Result with Photo and Live Boomerang views.

Frame selection becomes the required first creative choice. Selecting a frame also selects its layout and required shot count. Camera setup continues to provide device selection, mirroring, permission troubleshooting, and local upload as a secondary path.

Starting a new session returns to frame selection. A direct visit to a later route without the required session state redirects to the nearest valid earlier step. Uploading existing images continues to support the static workflow, but the UI explains that Live Boomerang requires direct camera capture.

## Frame Selection

The frame-selection page uses the existing catalog, categories, search, orientation filters, and lightweight thumbnails. Each card shows the frame name and required pose count. The selected card has a visible selected state and a primary action to continue to camera setup.

Selection calls the existing frame/layout session actions so the selected frame, selected layout, and `requiredShots` remain internally consistent. Returning from camera setup preserves the selection. Choosing a different frame before capture resets no media because no media exists yet.

## Live Framed Studio

### Preview composition

The Studio preview is canvas-based and uses the selected frame's native aspect ratio. It shares the same normalized slot geometry, cover-crop calculations, rotation semantics, filter settings, and asset layering used by final export.

For each frame slot:

- A completed slot displays its captured still.
- The active slot displays the mirrored or unmirrored camera feed in real time.
- A future slot displays a neutral placeholder.
- The frame background and decorative assets render above the slot media.

This preserves irregular and rotated openings in imported PNG/SVG overlays. The canvas scales responsively to the available viewport without changing composition coordinates. Optional grid and face-safe guides affect preview only and never appear in exported media.

### Capture behavior

Live Boomerang is enabled by default and can be disabled in Studio. After the configured countdown, each pose captures approximately 1.2 seconds of motion as 10–12 sampled image frames. The still photo is taken from the middle of the sequence so the static and animated results represent the same pose.

The next slot becomes active only after both the still and frame sequence have committed. Retaking a slot replaces its still and its live sequence atomically. Spacebar capture and the visible shutter button remain supported. Switching camera, changing the layout, leaving Studio, or starting a retake cancels an in-progress sampling operation without committing partial frames.

If live sampling fails, the Studio retains or captures the static still and marks Live unavailable for that pose. Static completion must never depend on successful animation capture.

### Adaptive resource limits

Sampled frames use a reduced resolution chosen from device and viewport capability rather than the original camera resolution. The default target is 10–12 frames per pose. Frame dimensions and encoded quality are capped so a four-pose session remains practical on mobile devices.

Old object URLs and sampled frames are released when a pose is retaken, Live is disabled, or the session resets. If resource limits or required APIs are unavailable, Studio automatically continues in static-only mode and explains the fallback.

## Session Model

The session state gains:

- `liveEnabled: boolean`, defaulting to `true`.
- One optional live sequence per photo slot.
- Per-slot Live availability/error state.
- A generated boomerang Blob, object URL, MIME type, and generation status.

Each live sequence contains ordered encoded image-frame Blobs plus the sampling width, height, and frame rate. Slot indices are the stable association between still photos and live sequences. Actions add, replace, remove, and clear still/live data together where appropriate.

Changing to another frame with the same required shot count reuses all captured stills and sequences. Changing to a frame with a different count requires confirmation:

- A larger layout preserves existing slots and sends the user to Studio to capture the missing poses.
- A smaller layout uses the leading slots while retaining surplus data for the current session, allowing a non-destructive switch back.

Any frame/filter/caption/date change invalidates a generated boomerang in the same way it invalidates the composed static result, while retaining the source stills and live sequences.

## Boomerang Composition

The boomerang compositor loads every slot's sampled frames and renders them synchronously into a final canvas. At animation frame `n`, every populated slot uses frame `n` from its own sequence. Shorter sequences clamp to their last frame so one imperfect pose cannot desynchronize the output.

Playback follows forward, reverse, then forward ordering, avoiding duplicate endpoint frames at direction changes. The target duration is approximately three seconds at 10–12 fps. Composition applies the selected frame, background, decorative assets, filter, intensity, mirror behavior already baked into capture, caption, and date. Audio is never captured.

Output resolution is adaptive. The long edge is capped near 960 px on capable devices and near 720 px on constrained devices. Static export keeps the frame's existing full output dimensions.

Boomerang generation is lazy: it begins when the user opens the Live view or explicitly requests generation. This keeps Studio responsive and avoids work for users who only need a photo.

## Recording Format and Compatibility

The final animation canvas is recorded through `canvas.captureStream()` and `MediaRecorder`. The recorder service selects the first supported candidate using `MediaRecorder.isTypeSupported()`:

1. MP4/H.264 where supported.
2. WebM/VP9.
3. WebM/VP8.
4. A browser-selected video MIME type as the last recording attempt.

The actual MIME type returned by the recorder determines the filename extension and sharing metadata. The implementation must not relabel WebM bytes as MP4 or the reverse.

MediaRecorder is broadly available, but supported containers and codecs vary by browser. Safari supports MediaRecorder and MP4/H.264, with newer Safari releases also adding WebM support. The application therefore feature-detects APIs and formats at runtime rather than relying on user-agent strings.

If `MediaRecorder`, `canvas.captureStream()`, or a usable encoder is unavailable, the Live view displays a clear compatibility message and leaves all photo actions enabled. A failed generation can be retried without repeating the camera session.

References:

- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API
- https://webkit.org/blog/11353/mediarecorder-api/

## Editor Rules

The editor retains filters, intensity, caption, date, frame browsing, and history. Frame changes follow the shot-count rules above. A frame change that requires more poses offers a clear return-to-Studio action. A frame with fewer slots previews the leading captures without deleting surplus captures.

Undo and redo include the selected layout/frame and source media association but do not duplicate Blob contents unnecessarily. A static composed result and generated boomerang are both invalidated whenever their visual inputs change.

## Result and Export

The result page provides two views:

- **Photo** retains PNG, JPEG, and WebP selection plus download, print, share, and local-gallery actions.
- **Live Boomerang** displays generation progress, a muted looping video preview, actual output format, download, share, retry, and local-gallery actions.

`Save All` stores the current static photo and generated boomerang. It is disabled while required output is generating and reports partial failures explicitly; a video failure must not roll back a successfully saved photo. The video filename uses the existing timestamp naming convention with a `-boomerang` suffix and the encoder's real extension.

## Local Gallery

Gallery storage is extended with a discriminated media type for image and video items. Image records retain current behavior. Video records store the video Blob, its MIME type, filename, creation time, selected frame metadata, and a static poster Blob or URL derived from the composed photo.

Gallery cards use posters so listing remains fast. Opening a video item loads a muted, looping, plays-inline video player with download, share, and delete actions. Existing IndexedDB image records remain readable after the schema upgrade.

Saved gallery media persists according to existing browser storage behavior. Unsaved live sequences are session-only and are released on reset.

## Component Boundaries

- `FrameSelection` owns the pre-camera catalog and confirmation action.
- `LiveFramePreview` owns real-time canvas drawing and exposes no capture state.
- `live-capture-service` samples camera frames, enforces resolution/memory limits, and returns a complete sequence or an error.
- `Studio` coordinates countdown, sampling, still selection, retake, and session actions.
- `boomerang-compositor` converts synchronized sequences plus current design inputs into rendered animation frames.
- `media-recorder-service` feature-detects formats and records a canvas stream to a correctly typed Blob.
- `ResultPanel` owns lazy generation and user export actions.
- `gallery-db` persists discriminated image/video records and handles schema migration.

The existing static compositor remains the source of truth for slot geometry and asset ordering. Shared geometry helpers should be extracted only where required to prevent preview, photo, and video composition from drifting apart.

## Error Handling and Accessibility

- Camera denial or absence preserves the upload path.
- Camera disconnection preserves completed poses and allows reconnection.
- Live sampling failure preserves static capture.
- Recorder failure preserves static result and exposes retry.
- Invalid direct routes redirect to the nearest valid step.
- Capture, generation, success, and error states use visible text plus polite live regions rather than color alone.
- The frame picker, Studio controls, result tabs, and gallery video player remain keyboard accessible.
- Motion preview respects `prefers-reduced-motion`: video does not autoplay when reduced motion is requested, but manual playback and download remain available.

## Testing Strategy

Unit tests cover:

- Frame selection synchronizing frame, layout, and required shots.
- Slot mapping, cover crop, mirror, and rotation in live preview.
- Sample count, middle-frame still selection, cancellation, and static fallback.
- Atomic retake of still and live sequence.
- Same-count and different-count frame switching.
- Forward/reverse/forward frame ordering and endpoint de-duplication.
- Synchronized multi-slot frame selection with unequal source sequence lengths.
- MIME negotiation, true extension selection, unsupported API behavior, and recorder errors.
- Boomerang invalidation after visual edits.
- IndexedDB migration and image/video persistence.
- Object URL cleanup on retake, regeneration, and reset.

Component and integration tests cover:

- Frame-first route guards and navigation.
- Studio active/completed/future slot states.
- Live enabled by default and user-controlled disabling.
- Upload path remaining static-only.
- Retake and missing-pose continuation.
- Result Photo/Live tabs, generation progress, retry, download, share, and Save All partial failure.
- Gallery poster and accessible video playback.

End-to-end tests cover the default frame-first flow with 1-, 3-, and 4-shot frames, a viewport representative of mobile, the legacy upload path, frame switching rules, static fallback, and a mocked supported recorder path. Real camera and codec behavior remains feature-detected because CI cannot guarantee physical camera hardware or every platform encoder.

## Success Criteria

- A visitor can select any catalog frame before granting camera access.
- The Studio shows the live camera accurately clipped inside the active template slot.
- Completed and future slots are visually distinct and compositionally accurate.
- A complete session produces the same static outputs as today.
- With Live enabled and supported, every slot moves simultaneously in a framed boomerang.
- MP4/WebM type and extension match the actual browser-generated bytes.
- Unsupported or failed Live behavior never blocks static capture, editing, saving, sharing, or printing.
- The flow works at desktop and mobile widths and preserves local-only privacy.
