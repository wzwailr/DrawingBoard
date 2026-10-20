import { test, expect, type Page, type ElectronApplication } from '@playwright/test';
import { launchDesktop } from '../support/desktop';
let page: Page, app: ElectronApplication;
test.beforeAll(async () => { ({ page, app } = await launchDesktop('smart-pen')); await app.context().tracing.start({ screenshots: true, snapshots: false }); });
test.afterAll(async () => { if (app) { await app.context().tracing.stop({ path: `test-results/desktop/smart-pen-events-${test.info().repeatEachIndex}.zip` }); await app.close(); } });
test.beforeEach(async () => {
  await page.getByRole('button', { name: '智能笔', exact: true }).click();
  await page.evaluate(() => window.__p0!.clear());
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.length).toBe(0);
});
async function rectangle() {
  await page.mouse.move(220, 240); await page.mouse.down();
  for (const [x, y] of [[420,242],[422,380],[218,378],[220,240]]) await page.mouse.move(x, y, { steps: 8 });
}
test('release before a hold keeps the original ink', async () => {
  await rectangle(); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.map((e) => e.type)).toEqual(['freedraw']);
});
test('hold-to-preview leaves the document untouched and commits one shape on release', async () => {
  await rectangle();
  await expect(page.getByTestId('recognition-hint')).toContainText('矩形');
  expect((await page.evaluate(() => window.__p0!.snapshot())).elements).toHaveLength(0);
  await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.map((e) => e.type)).toEqual(['rectangle']);
  expect((await page.evaluate(() => window.__p0!.snapshot())).elements[0].customData).toBeTruthy();
  await page.screenshot({ path: 'test-results/desktop/recognized-rectangle.jpg' });
});
test('moving after a preview resumes the same raw stroke', async () => {
  await rectangle(); await expect(page.getByTestId('recognition-hint')).toBeVisible();
  await page.mouse.move(270, 280, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.map((e) => e.type)).toEqual(['freedraw']);
});
test('continuous slow mouse movement never activates a hold preview', async () => {
  await page.mouse.move(800,450); await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(800+i*2,450); await page.waitForTimeout(100);
    await expect(page.getByTestId('recognition-hint')).toHaveCount(0);
  }
  await page.mouse.up();
  await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.map((e)=>e.type)).toEqual(['freedraw']);
});
