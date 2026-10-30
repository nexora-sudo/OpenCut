# Local audiovisual regression checks

## Version 0.3.4 playback regression

Temporarily copy `playback-harness.tsx` to `apps/web/src/app/qa-playback/page.tsx` and open `/qa-playback` in development. It generates a moving 720p/30 fps source and places two cuts from the same file on the timeline. It renders a sequence through both transitions, records frame latency/source read counts, checks the actual blended pixels, decodes transition exports, and checks clip/scene grayscale through the editor command path. It also checks that rendering an effect thumbnail does not change the video compositor. The linked clean test project supports a real click-through check of effect application in the editor.

This test exposed a pooled-canvas aliasing bug that the isolated 4 fps checks did not catch. Keep motion/normal-frame-rate coverage when changing decoder or transition code. **Remove the temporary route before committing or deploying.**

## Version 0.3.3 features

Temporarily copy `features-033-harness.tsx` to `apps/web/src/app/qa-features/page.tsx`, start development, and open `/qa-features`. The button runs five real exports: 480p/720p/1080p/1440p WebM and 720p MP4. Synthetic video includes embedded 440 Hz audio, red and blue cuts and a white position marker. Checks compare the dissolve/slide midpoint pixels between preview and decoded output, clip and full-scene grayscale, exact output dimensions, audio energy during the transition, duration and backup persistence. Each source is only four visible seconds at 4 fps; this is a feature regression check, not a long-video performance benchmark.

The resulting test project can be opened to check transition duration, removal/undo, resolution labels and language switching through the UI. **Remove the temporary route before committing or deploying.**

## Version 0.3.2 audiovisual regression

This harness generates synthetic media (440 Hz embedded audio and 880 Hz library music), calls the real browser codec/render/export pipeline, decodes the exported file, and validates duration, audio energy/frequencies, cut gaps, frame colors and portable project data. It does not use personal media or upload data.

1. Copy `scripts/qa/export-harness.tsx` to a new local file `apps/web/src/app/qa-export/page.tsx` (create the directory first).
2. Start the local development server and open `/qa-export` in a desktop browser.
3. Run short WebM, MP4, cancellation and 20-minute checks separately. The 20-minute test uses **160×90 at 1 fps**, with embedded audio throughout, to exercise duration and bounded audio memory rather than 4K rendering performance. The short test uses 10 fps, cuts with a gap, Blur, text, a shape sticker and library music.
4. Save the JSON results displayed on the page. Avoid editing source code during a check because development hot reload can interrupt the test.
5. Remove the temporary `apps/web/src/app/qa-export/page.tsx` before committing or deploying. The harness itself also refuses to run outside development.

The harness creates local QA projects and restored copies. No original user project is overwritten. Its audio tones are deliberately synthetic and should not be described as real spoken-word test coverage. Check a real speech clip on the affected browser and OS before calling a community codec report fully resolved.

Unit checks from the repository root:

```sh
bun test apps/web/src/core/managers/__tests__/save-manager.test.ts apps/web/src/export/__tests__/task.test.ts apps/web/src/project/__tests__/backup.test.ts apps/web/src/preview/__tests__ apps/web/src/services/renderer/compositor/__tests__ apps/web/src/i18n
```

## Version 0.4.0 creative tools and recovery

Copy `features-040-harness.tsx` into a temporary `apps/web/src/app/qa-features040/page.tsx` and open that route in development. The synthetic 720p/30 fps source exercises two cuts of the same file, six moving transitions, five GPU color effects and 22 MP4/WebM exports. It compares intermediate decoded pixels, intensity-zero and disabled effects, and 440/880 Hz content in an optional audio crossfade. AAC container padding can extend a four-second MP4 to about 4.017 s.

Copy `history-harness.tsx` to a temporary `apps/web/src/app/qa-history/page.tsx`. It uses real IndexedDB/OPFS, creates only its own QA projects, archives removed referenced media and restores an independent copy. Assertions verify the original editing state, restored clip and byte-for-byte media equality.

The `export-040-harness.tsx` harness adds preview-scale checks and actual 15-minute MP4/WebM outputs at 128×72/10 fps. These have synthetic graphics without audio; they validate duration, continuous frame processing, progress, ETA, decoded first/last frames and quality independence, not real camera footage or 4K throughput.

Copy harness files into routes instead of importing them from outside the workspace, so browser dependencies resolve from the web app. Remove every temporary QA route before building or publishing. See `docs/VALIDATION-0.4.0.md` for the full scope and limitations.
