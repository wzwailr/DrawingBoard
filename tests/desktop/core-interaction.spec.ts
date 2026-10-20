import { test, expect, type Page, type ElectronApplication } from '@playwright/test';
import { launchDesktop } from '../support/desktop';
let page: Page, app: ElectronApplication;
test.afterEach(async () => { await app?.close(); });
test.beforeEach(async () => {
  ({ page, app } = await launchDesktop('core'));
  await page.getByRole('button', { name: '智能笔', exact: true }).click();
  await page.evaluate(() => window.__p0!.seedBasics());
  await page.evaluate(() => window.__p0!.setZoom(1));
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.viewport())).zoom).toBe(1);
});
for (const zoom of [.5, 1, 2, 4]) test(`native border routing stays consistent at zoom ${zoom}`, async () => {
  await page.evaluate((zoom) => window.__p0!.setZoom(zoom, -100, -150), zoom);
  await expect.poll(() => page.evaluate(() => window.__p0!.viewport())).toEqual({ zoom, scrollX: -100, scrollY: -150 });
  const from = await page.evaluate(() => window.__p0!.toScreen({ x: 160, y: 200 }));
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(from.x + 40 * zoom, from.y + 10 * zoom, { steps: 5 }); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.find((e) => e.id === 'node-a')?.x).toBe(200);
});
test('composition Escape and hide request wait for composition end, then preserve committed text', async () => {
  await page.mouse.dblclick(160,264);
  const input = page.getByRole('textbox', { name: '画布文字' }); await expect(input).toBeVisible();
  await input.dispatchEvent('compositionstart', { data: '' });
  await input.fill('组合输入');
  await input.dispatchEvent('keydown', { key: 'Escape', code: 'Escape', isComposing: true, keyCode: 229 });
  await expect(input).toBeVisible();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('p0:event', { kind: 'request-hide' }));
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(true);
  await input.dispatchEvent('compositionend', { data: '组合输入' });
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
  expect((await page.evaluate(() => window.__p0!.snapshot())).elements.some((e) => e.text === '组合输入')).toBe(true);
});
test('ime_composing_ctrl_enter_does_not_submit', async () => {
  await page.mouse.dblclick(160,264);
  const input = page.getByRole('textbox', { name: '画布文字' }); await expect(input).toBeVisible();
  await input.dispatchEvent('compositionstart', { data: '' }); await input.fill('尚在组合');
  await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', ctrlKey: true, isComposing: true, keyCode: 229 });
  await expect(input).toBeFocused();
  expect((await page.evaluate(() => window.__p0!.snapshot())).elements.some((e) => e.text === '尚在组合')).toBe(false);
  await input.dispatchEvent('compositionend', { data: '尚在组合' }); await input.press('Escape');
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.some((e) => e.text === '尚在组合')).toBe(true);
});
test('filled_shape_inside_still_draws', async () => {
  await page.evaluate(() => {
    const scene = window.__p0!.snapshot(); const box = scene.elements.find((e) => e.id === 'node-a')!;
    box.backgroundColor = '#d3e6dc'; box.fillStyle = 'solid'; window.__p0!.load(scene);
  });
  await page.mouse.move(185,250); await page.mouse.down(); await page.mouse.move(215,260, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.filter((e) => e.type === 'freedraw').length).toBe(1);
  expect((await page.evaluate(() => window.__p0!.snapshot())).elements.find((e) => e.id === 'node-a')?.x).toBe(160);
});
test('existing independent text edits without adding a second text object', async () => {
  await page.mouse.dblclick(900,450);
  const input = page.getByRole('textbox', { name: '画布文字' });
  await input.fill('第一版'); await input.press('Escape'); await expect(input).toHaveCount(0);
  await page.mouse.dblclick(920,460); await expect(input).toBeVisible(); await input.fill('第二版'); await input.press('Escape');
  const texts = (await page.evaluate(() => window.__p0!.snapshot())).elements.filter((e) => e.type === 'text' && e.containerId === null);
  expect(texts).toHaveLength(1); expect(texts[0].text).toBe('第二版');
  await page.mouse.move(920,460); await page.mouse.down(); await page.mouse.move(960,490,{steps:8}); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.find((e)=>e.id===texts[0].id)?.x).toBe(940);
});
test('selected native corner handle resizes instead of drawing ink', async () => {
  await page.mouse.click(160,264);
  await page.mouse.move(344,338); await page.mouse.down(); await page.mouse.move(394,368,{steps:8}); await page.mouse.up();
  const scene = await page.evaluate(() => window.__p0!.snapshot());
  expect(Number(scene.elements.find((e) => e.id === 'node-a')?.width)).toBeGreaterThan(220);
  expect(scene.elements.filter((e) => e.type === 'freedraw')).toHaveLength(0);
});
test('smart pen resumes after Space is released outside the blurred window', async () => {
  await page.evaluate(() => window.__p0!.clear());
  await page.keyboard.down('Space');
  // Model release in a different application: reset the driver key state but
  // deliberately do not deliver that keyup to either application handler.
  await page.evaluate(() => window.addEventListener('keyup', (event) => event.stopImmediatePropagation(), { capture: true, once: true }));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  // CDP can emulate document focus while the native window is hidden. Explicit
  // blur exercises the product handler deterministically; this is not an IME/
  // physical-key acceptance claim.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('Space');
  await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.show(); window.focus(); });
  await page.waitForFunction(() => document.hasFocus());
  await page.mouse.move(850,450); await page.mouse.down(); await page.mouse.move(900,470,{steps:8}); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.map((e)=>e.type)).toEqual(['freedraw']);
});
test('wheel navigation preserves a still-held Space until keyup', async () => {
  await page.evaluate(() => window.__p0!.clear());
  await page.keyboard.down('Space'); await page.mouse.move(850,450); await page.mouse.wheel(0,50);
  await page.mouse.down(); await page.mouse.move(900,470,{steps:8}); await page.mouse.up();
  expect((await page.evaluate(() => window.__p0!.snapshot())).elements).toHaveLength(0);
  await page.keyboard.up('Space');
  await page.mouse.move(850,450); await page.mouse.down(); await page.mouse.move(900,470,{steps:8}); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.map((e)=>e.type)).toEqual(['freedraw']);
});
test('inside_draws_border_moves and bound line follows the actual native drag', async () => {
  const original = await page.evaluate(() => window.__p0!.snapshot());
  // World node-a begins at (160,180), canvas is 54 CSS pixels below the viewport top.
  await page.mouse.move(162, 254); await page.mouse.down(); await page.mouse.move(242, 304, { steps: 10 }); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.find((e) => e.id === 'node-a')!.x).toBe(240);
  const moved = await page.evaluate(() => window.__p0!.snapshot());
  expect(moved.elements.find((e) => e.id === 'edge')).not.toEqual(original.elements.find((e) => e.id === 'edge'));
  await page.mouse.move(275, 300); await page.mouse.down(); await page.mouse.move(305, 320, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.filter((e) => e.type === 'freedraw').length).toBe(1);
});
test('border_doubleclick_binds_text and inside_doubleclick_creates_independent_text_without_dots', async () => {
  await page.mouse.dblclick(160, 264);
  const input = page.getByRole('textbox', { name: '画布文字' });
  await expect(input).toBeVisible(); await input.fill('边框标签'); await input.press('Escape');
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.find((e) => e.type === 'text' && e.containerId === 'node-a')?.text).toBe('边框标签');
  await expect(input).toHaveCount(0);
  await page.mouse.dblclick(190, 250);
  await expect(input).toBeVisible();
  await input.fill('独立文字\n第二行'); await input.press('Escape');
  const scene = await page.evaluate(() => window.__p0!.snapshot());
  expect(scene.elements.some((e) => e.type === 'text' && e.containerId === null && e.text === '独立文字\n第二行')).toBe(true);
  expect(scene.elements.filter((e) => e.type === 'freedraw')).toHaveLength(0);
});
test('raw_line_has_no_bindings; held line binds and single undo removes its whole commit', async () => {
  await page.mouse.move(350, 264); await page.mouse.down(); await page.mouse.move(550, 264, { steps: 10 }); await page.mouse.up();
  let scene = await page.evaluate(() => window.__p0!.snapshot());
  expect(scene.elements.at(-1)?.type).toBe('freedraw');
  expect(scene.elements.at(-1)?.startBinding).toBeUndefined();
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.length).toBe(6);
  await page.mouse.move(350, 264); await page.mouse.down(); await page.mouse.move(550, 264, { steps: 10 });
  await expect(page.getByTestId('recognition-hint')).toContainText('直线'); await page.mouse.up();
  scene = await page.evaluate(() => window.__p0!.snapshot());
  expect(scene.elements.at(-1)).toMatchObject({ type: 'arrow', startBinding: { elementId: 'node-a' }, endBinding: { elementId: 'node-b' }, endArrowhead: 'arrow' });
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.length).toBe(6);
});
