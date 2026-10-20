import { _electron } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const out = path.resolve('test-results/benchmark'); await mkdir(out, { recursive: true });
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'ELECTRON_RUN_AS_NODE'));
const settle = (page) => page.evaluate(async () => { await document.fonts.ready; await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); return performance.timeOrigin + performance.now(); });
const start = async (label) => {
  const app = await _electron.launch({ args: ['dist-electron/main.cjs'], env: { ...env, DRAWINGBOARD_DATA_DIR: path.join(out, label) } });
  const page = await app.firstWindow(); await page.waitForFunction(() => !!window.__p0); return { app, page };
};
const localLoad = (app, file) => app.evaluate(async ({ BrowserWindow }, file) => {
  const raw = process.getBuiltinModule('fs').readFileSync(file,'utf8');
  return BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(`(async()=>{const s=JSON.parse(${JSON.stringify(raw)}); await Promise.all(Object.values(s.files).map(async f=>{const img=new Image();img.src=f.dataURL;await img.decode()})); window.__p0.load(s); await document.fonts.ready; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return window.__p0.snapshot().elements.length;})()`);
}, file);
async function inputSample(app) {
  return app.evaluate(async ({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const waiting = w.webContents.executeJavaScript('window.__p0.waitForInkCommit()');
    // The subscription is installed in the renderer before input is sent.
    await w.webContents.executeJavaScript('true');
    const begin = performance.timeOrigin + performance.now(); w.show(); w.focus();
    // Showing a native window is asynchronous. An unpaced batch sent in the
    // same turn can lose pointer capture during Windows activation. Keep that
    // readiness wait inside the measured show-to-commit interval.
    if (!w.isFocused()) await new Promise((resolve, reject) => {
      const onFocus = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(() => { w.removeListener('focus', onFocus); reject(new Error('Window did not gain focus')); }, 2000);
      w.once('focus', onFocus);
    });
    await w.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    w.webContents.sendInputEvent({ type: 'mouseMove', x: 1050, y: 680 });
    w.webContents.sendInputEvent({ type: 'mouseDown', x: 1050, y: 680, button: 'left', clickCount: 1 });
    w.webContents.sendInputEvent({ type: 'mouseMove', x: 1080, y: 690, button: 'left' });
    w.webContents.sendInputEvent({ type: 'mouseUp', x: 1080, y: 690, button: 'left', clickCount: 1 });
    const result = await waiting;
    return { ms: result.at - begin, count: result.count };
  });
}
let current;
async function idleSample(app) {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
  await app.evaluate(({ app }) => app.getAppMetrics());
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const metrics = await app.evaluate(({ app }) => app.getAppMetrics());
  return { hidden: true, sampleMs: 3000, cpuPercent: metrics.reduce((s,p)=>s+p.cpu.percentCPUUsage,0), workingSetKiB: metrics.reduce((s,p)=>s+(p.memory?.workingSetSize??0),0), metrics };
}
try {
  current = await start('fixture');
  const imageBytes = await current.page.evaluate(() => window.__p0.seedPerformance());
  await settle(current.page);
  const scene = await current.page.evaluate(() => window.__p0.snapshot());
  const fixtureFile = path.join(out, 'scene.json'); await writeFile(fixtureFile, JSON.stringify(scene));
  await current.app.close(); current = null;
  const restart = [], warm = [];
  for (let i = 0; i < 10; i++) {
    console.log(`restart ${i+1}/10`);
    const begin = performance.now(); current = await start(`restart-${i}`);
    if (await localLoad(current.app, fixtureFile) !== 123) throw new Error('Incomplete reference scene');
    const input = await inputSample(current.app);
    if (input.count !== 124) throw new Error('Reference scene did not accept input');
    restart.push(performance.now() - begin);
    if (i < 9) { await current.app.close(); current = null; }
  }
  for (let i = 0; i < 30; i++) {
    if (i%10 === 0) console.log(`warm ${i+1}/30`);
    await localLoad(current.app, fixtureFile);
    await current.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
    const input = await inputSample(current.app);
    if (input.count !== 124) throw new Error('Warm scene did not accept input');
    warm.push(input.ms);
  }
  const idleReference = await idleSample(current.app);
  await current.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
  await current.page.evaluate(() => window.__p0.seedPerformance(true)); await settle(current.page);
  const frames = await current.page.evaluate(async () => {
    const times = []; let last = performance.now();
    for (let i = 0; i < 180; i++) { window.__p0.pan(-(i%60)*2); await new Promise(requestAnimationFrame); const now = performance.now(); if (i > 4) times.push(now-last); last=now; }
    return times;
  });
  const display = await current.app.evaluate(({ screen }) => ({ scaleFactor: screen.getPrimaryDisplay().scaleFactor }));
  const idleMixed = await idleSample(current.app);
  const p95 = (values) => [...values].sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1];
  const result = { measuredAt: new Date().toISOString(), build: {mode:'validation', mainSha256:createHash('sha256').update(await readFile('dist-electron/main.cjs')).digest('hex'), indexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')}, device: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0].model, logicalCpu: os.cpus().length, ramGiB: os.totalmem()/1024**3, scaleFactor: display.scaleFactor },
    definitions: { S: '100 shapes/text + 20 arrows + 3 images; image bytes below', warm: 'main show/focus request, native focus and two animation frames, through Chromium mouse events to a new original-ink object committed in the actual editor; includes readiness wait, excludes physical key dispatch latency', restart: 'external _electron.launch start, CDP attach, locally read reference scene, image decoding, two frames and actual ink commit; caches warm, not reboot cold start; fixture injection is benchmark-only, not P1 persistence', frames: '1000 mixed objects, 180 scripted pan updates, first 5 discarded; RAF frame interval, not GPU draw time', idle: '3 second app.getAppMetrics sample; percentCPUUsage since previous call, all app processes summed' },
    scene: { count: scene.elements.length, imageBytes }, warmMs: warm, restartMs: restart, frameMs: frames,
    p95: { warmMs: p95(warm), restartMs: p95(restart), frameMs: p95(frames) },
    idleReference, idleMixed };
  await writeFile(path.join(out, 'performance.json'), JSON.stringify(result,null,2)); console.log(JSON.stringify({device:result.device,scene:result.scene,p95:result.p95,idleReference:{...idleReference,metrics:undefined},idleMixed:{...idleMixed,metrics:undefined}},null,2));
} finally { if (current) await current.app.close(); }
