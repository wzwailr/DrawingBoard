# Pinned Excalidraw source

The editor is built from `excalidraw/excalidraw` commit `e1b7aacb356a492aa1e0fc6eb57b8896124027f0` (2026-10-18). Its package version field is 0.18.0; this is **not** the npm 0.18.1 release.

Source archive: `https://codeload.github.com/excalidraw/excalidraw/zip/e1b7aacb356a492aa1e0fc6eb57b8896124027f0`.
SHA-256: `87da5287759d85c59caff316ec59a18719a64e4baa900d73c89dbecfce1aabd4`.

`excalidraw/` is ignored vendor material, not a nested Git checkout. The upstream source retains its MIT LICENSE and font licenses. Do not replace its Yarn lock with the application's pnpm lock.

After obtaining the source archive and extracting it to `vendor/excalidraw`, run `pnpm install --frozen-lockfile`, then `pnpm build:editor`. The build script uses pinned Yarn 1.22.22, frozen upstream dependencies and official package build commands. It verifies the upstream lock remains unchanged. A fresh source can also be fetched by the script when the directory does not exist.

No changes to upstream App.tsx or private interaction state are currently made. One controlled source patch is applied by the build script:

- `patches/local-fonts.json`: only `fonts/ExcalidrawFontFace.ts`; when the host supplies a local asset root, omit the additional CDN font source. The offline Electron bootstrap test first failed with 232 remote font resource entries; it must pass without HTTP resources after this patch. The host asset path is configured before the editor module is imported.

Any later patch must be recorded here with a reproducing integration test; import only the editor, not the full showcase application.
