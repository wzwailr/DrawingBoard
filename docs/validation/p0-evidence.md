# P0 execution evidence

Date: 2026-10-19. Scope: T01–T03 only. Branch: p0/editor-feasibility; initial docs baseline c55c43d. This record separates automatic checks, actual desktop interaction, measurements and unverified items.

## T01 implemented; automatic checks passed

- Official GitHub commit endpoint confirmed e1b7aacb356a492aa1e0fc6eb57b8896124027f0, dated 2026-10-18.
- Source ZIP SHA-256: 87da5287759d85c59caff316ec59a18719a64e4baa900d73c89dbecfce1aabd4.
- Upstream Yarn lock SHA-256 before build: 2fceed8bdb8180b2d14ab0db6010f48b05da0f3a772e218a7024e88ca7a7c76e.
- Snapshot tests first failed because the implementation module was absent. After implementing the boundary, 3/3 passed: IDs/Chinese/labels/bindings/images/provenance round trip, unknown schema rejection, malformed/missing-image rejection.
- Desktop bootstrap test first failed because the desktop entry had not been implemented/built. It now launches Electron 44.9.0, verifies a single canvas window and sandboxed preload, loads two labeled Chinese nodes, a bound arrow and an image, and round trips the actual editor scene and provenance.
- Offline reload initially failed with 232 CDN font resource entries. Fixed host asset initialization order and copied the font directory matching generated paths. Applied one idempotent vendor font-source patch to omit CDN fallback when a host asset root is configured. Upstream App.tsx and private interaction handlers remain unmodified.
- Offline check uses the Electron browser context's offline mode, reloads local files, restores the graph and image, and asserts no HTTP(S) resource entries. The final desktop bootstrap test passes. This is runtime evidence under emulated offline networking, not a claim that the machine's network adapter was disabled.
- Host TypeScript check passes; production and validation builds pass. Vite reports an upstream Mermaid static/dynamic import warning; this is recorded, not a runtime failure. Validation-only test probes live in tests/support and are removed from production builds.

## T02 in progress

- Pure gesture tests observed RED before implementation. 11/11 now pass: release/hold/slow motion, independent strokes, stale timer/disposal, unknown shape fallback, preview cancellation, capture loss, click/no-dot behavior, pointer identity and a 140,001-point stroke. The long-stroke case first reproduced a JavaScript argument-limit failure, corrected with iterative bounds calculation.
- These tests exercise the timing policy with an injected recognizer; actual engine classification and on-screen interaction are the next integration checks.

Detailed transient build logs and the continuation ledger are under the plan-scoped .superpowers/sdd workspace; final outcomes will be summarized here before task completion.
