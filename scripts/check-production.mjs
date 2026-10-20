// Real production UI smoke: deliberately uses no validation probe.
import { _electron, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE'));
const out = path.resolve('test-results/production'); await mkdir(out,{recursive:true});
const app = await _electron.launch({args:['dist-electron/main.cjs'],env:{...env,DRAWINGBOARD_DATA_DIR:path.join(out,'runtime')}});
try {
  const page = await app.firstWindow(), errors=[]; page.on('pageerror',(error)=>errors.push(error.message));
  await page.context().setOffline(true); await page.reload();
  await expect(page.getByRole('button',{name:'智能笔',exact:true})).toBeVisible();
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible())).toBe(true);
  await page.waitForFunction(()=>document.hasFocus());
  expect(await page.evaluate(()=>typeof window.__p0)).toBe('undefined');
  expect(await page.evaluate(()=>typeof window.require)).toBe('undefined');
  async function box(x,label) {
    await page.mouse.move(x,240); await page.mouse.down();
    for(const [px,py] of [[x+200,242],[x+202,380],[x-2,378],[x,240]]) await page.mouse.move(px,py,{steps:8});
    await expect(page.getByTestId('recognition-hint')).toContainText('矩形'); await page.mouse.up();
    await page.mouse.dblclick(x,285); const text=page.getByRole('textbox',{name:'画布文字'}); await text.fill(label); await text.press('Escape'); await expect(text).toHaveCount(0);
  }
  await box(220,'产品讨论'); await box(600,'功能布局');
  await page.mouse.move(434,310); await page.mouse.down(); await page.mouse.move(586,310,{steps:12});
  await expect(page.getByTestId('recognition-hint')).toContainText('直线'); await page.mouse.up();
  await expect(page.getByText('5 个对象',{exact:true})).toBeVisible();
  const remote=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/^https?:/.test(n)));
  expect(remote).toEqual([]); expect(errors).toEqual([]);
  await page.screenshot({path:path.join(out,'workflow.png')});
  const hash=async(file)=>createHash('sha256').update(await readFile(file)).digest('hex');
  await writeFile(path.join(out,'smoke.json'),JSON.stringify({at:new Date().toISOString(),mode:'production',probe:'undefined',require:'undefined',offline:true,remote,errors,objectCount:5,mainSha256:await hash('dist-electron/main.cjs'),indexSha256:await hash('dist/index.html')},null,2));
  console.log('Production offline UI smoke PASS: no probe, no remote resources; two held shapes, Chinese labels and a line.');
} finally {await app.close();}
