# Contributing to the OpenCut Classic community fork

Bug fixes, feature proposals, translations, documentation and testing are welcome in this independent fork maintained by nexora-sudo. It is not the official OpenCut project. You may communicate in Portuguese, English or Simplified Chinese.

## Report a problem or suggest an idea

Use [New issue](https://github.com/nexora-sudo/OpenCut/issues/new/choose) and select Bug report, Feature request or Translation. Search existing issues first; add useful information to an existing report rather than creating a duplicate. Use reactions to support ideas.

For bugs, include steps to reproduce, expected and actual behavior, browser, operating system, and the tested version or commit. Share only non-private samples. For features, describe the problem and the proposed behavior. Acceptance and timing depend on maintainer review; an issue is not a promise of implementation.

## Contribute code

1. Follow the [README local setup](../README.md#run-locally).
2. Branch from `feat/portuguese-chinese`, the default branch of this fork. Use a descriptive name such as `fix/export-dialog` or `feat/timeline-shortcuts`.
3. Keep each change focused. Discuss large features in an issue before investing substantial implementation work; small fixes and documentation improvements can be submitted directly.
4. Follow existing architecture and code conventions. Preserve the original MIT license and credits. Do not commit credentials, private media, build output or dependencies.
5. Run checks relevant to your change and describe what you tested. For translation work, run `bun test apps/web/src/i18n` from the repository root. The application type check runs from `apps/web` with `bunx tsc --project tsconfig.app-check.json --noEmit`.
6. Open a pull request **against nexora-sudo/OpenCut**, targeting `feat/portuguese-chinese`, rather than the official upstream. Link the issue and include screenshots for visible changes. Fork contributors should verify the destination repository before submitting.

The full upstream test suite has existing WASM and timeline failures. Report failures accurately and distinguish new regressions from existing problems. Do not bypass checks just to obtain a passing result.

AI-assisted contributions are welcome. Disclose substantial AI assistance in the pull request, review the output, and explain how you validated it. Contributors remain responsible for correctness and licensing.

## How requests are organized

- `needs-triage`: awaiting initial review.
- `bug`, `enhancement`, `translation`, `documentation`, `question`: type of request.
- `accepted`: agreed direction, without a delivery date.
- `in-progress`: actively being worked on.
- `help wanted`: contributions welcome.
- `good first issue`: a maintainer has identified a suitable starting task.

Maintainers apply status labels after review. A suggestion may be closed with an explanation or linked to an existing issue. There is no guaranteed response time.

Be respectful and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
