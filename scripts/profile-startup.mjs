// Diagnostic only: separates launch/attach, fixture transfer+decode, and rendered frames.
import { _electron } from '@playwright/test';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE'));
let app;
try {
  const t = performance.now();
  app = await _electron.launch({ args: ['dist-electron/main.cjs'], env: { ...env, DRAWINGBOARD_DATA_DIR: path.resolve('test-results/profile') } });
  const launched = performance.now(); const page = await app.firstWindow(); await page.waitForFunction(() => !!window.__p0);
  const probeReady = performance.now();
  const state = await page.evaluate(() => ({ focused: document.hasFocus(), visibility: document.visibilityState, navigation: performance.getEntriesByType('navigation')[0].toJSON() }));
  await page.evaluate(() => window.__p0.seedPerformance());
  const scene = await page.evaluate(() => window.__p0.snapshot());
  const loadStart = performance.now();
  await page.evaluate(async (scene) => { await Promise.all(Object.values(scene.files).map(async (f) => { const img = new Image(); img.src=f.dataURL; await img.decode(); })); window.__p0.load(scene); },scene);
  const loaded = performance.now();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const framesMs = performance.now()-loaded;
  const file = path.resolve('test-results/profile/scene.json'); await writeFile(file, JSON.stringify(scene));
  const nativeStart = performance.now();
  const localLoad = await app.evaluate(async ({ BrowserWindow }, file) => {
    const raw = process.getBuiltinModule('fs').readFileSync(file,'utf8');
    return BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(`(async()=>{const s=JSON.parse(${JSON.stringify(raw)}); const t=performance.now(); await Promise.all(Object.values(s.files).map(async f=>{const img=new Image();img.src=f.dataURL;await img.decode()})); window.__p0.load(s); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return {rendererMs:performance.now()-t,count:window.__p0.snapshot().elements.length};})()`);
  }, file);
  console.log(JSON.stringify({ launchAttachMs: launched-t, probeMs: probeReady-launched, fixtureTransferDecodeLoadMs: loaded-loadStart, framesMs, localFileLoadWallMs: performance.now()-nativeStart, localLoad, state },null,2));
} finally { await app?.close(); }
