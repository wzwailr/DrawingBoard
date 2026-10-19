# P0 dependency baseline

Verified 2026-10-19 against npm official registry and the fixed GitHub source. Execution environment: Windows, Node 24.18.0, pnpm 11.25.0, Git 2.45.1. Application dependencies are locked by pnpm-lock.yaml; upstream dependencies remain locked by vendor/excalidraw/yarn.lock.

| Dependency | Chosen version | Role |
| --- | --- | --- |
| Electron | 44.9.0 | Desktop runtime; downloaded with the package's official installer/checksums |
| React / React DOM | 19.3.1 | Host UI; satisfies upstream ^19 peer requirement |
| Vite / React plugin | 8.3.4 / 6.1.2 | Build and local development |
| TypeScript | 7.0.2 | Host typecheck; upstream keeps its own 5.9.3 build |
| Vitest | 5.0.5 | Behavioral/unit tests |
| Playwright test | 1.64.1 | Browser and Electron integration tests |
| esbuild | 0.28.2 | Main/preload bundling; upstream retains its versions |
| electron-builder | 26.15.3 | Future distribution task, not P0 acceptance proof |
| Yarn | 1.22.22 | Fixed upstream source build |
| Excalidraw | e1b7aacb356a492aa1e0fc6eb57b8896124027f0 | Source snapshot; package field 0.18.0, not npm 0.18.1 |

The initially invoked bundled pnpm runtime encountered connection resets. Direct system Node fetching of the same official tarballs succeeded, and invoking pnpm through system Node with network concurrency 4 completed. Certificate verification was never disabled; registries were not replaced with unverified mirrors. Upstream uses reduced concurrency 3 and retains its source lock.

The vendor source and generated font assets are ignored and reproducible from the pinned official archive; see vendor/README.md and scripts/build-editor.mjs. The application deduplicates React and React DOM during bundling so the separately built upstream editor uses the host's React instance.

No dependency version or UI availability claim implies P0 behavioral acceptance. Third-party distribution notices and packaging acceptance remain tasks T13–T14.
