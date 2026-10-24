# Local audiovisual regression checks

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
