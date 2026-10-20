// Local P0 review aid. Requires a validation build; this fixture is never loaded by production.
import { _electron } from '@playwright/test';
import path from 'node:path';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'ELECTRON_RUN_AS_NODE'));
const app = await _electron.launch({ args: ['dist-electron/main.cjs'], env: { ...env, DRAWINGBOARD_DATA_DIR: path.resolve('.runtime/preview') } });
const page = await app.firstWindow(); await page.waitForFunction(() => !!window.__p0);
await page.evaluate(() => window.__p0.seedBasics());
if (process.argv.includes('--record-native')) {
  const output = path.resolve('test-results/native/2026-10-20-events.jsonl');
  await mkdir(path.dirname(output), { recursive: true }); await writeFile(output,'');
  await page.exposeFunction('recordNativeEvent', (entry) => appendFile(output, JSON.stringify({ ...entry, observer: 'renderer' })+'\n'));
  await page.evaluate(() => {
    for (const type of ['keydown','compositionstart','compositionend','input','focus','blur','visibilitychange']) document.addEventListener(type, (event) => {
      const target = event.target;
      if (type === 'keydown' && !['n','Enter','Escape',' ','d','Control','Alt'].includes(event.key)) return;
      void window.recordNativeEvent({ type, key: event.key, code: event.code, composing: event.isComposing, trusted: event.isTrusted,
        target: target?.tagName, valueLength: target instanceof HTMLTextAreaElement ? target.value.length : undefined,
        at: performance.timeOrigin+performance.now(), visibility: document.visibilityState });
    }, true);
  });
  await app.evaluate(({ BrowserWindow, globalShortcut }, file) => {
    const fs = process.getBuiltinModule('fs'), w = BrowserWindow.getAllWindows()[0];
    const record = (type) => fs.appendFileSync(file, JSON.stringify({ observer:'main',type,at:performance.timeOrigin+performance.now(),visible:w.isVisible(),focused:w.isFocused(),shortcut:globalShortcut.isRegistered('Control+Alt+D') })+'\n');
    for (const type of ['show','hide','focus','blur']) w.on(type,()=>record(type));
    record('initial');
  }, output);
  console.log(`Native observer recording to ${output}; only this synthetic preview window.`);
}
console.log('DrawingBoard P0 preview ready. Close via the application Exit button.');
app.on('close', () => process.exit(0));
