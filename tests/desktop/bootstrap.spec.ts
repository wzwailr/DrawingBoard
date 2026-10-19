import { _electron, expect, test } from '@playwright/test';
import path from 'node:path';

test('offline desktop opens one editable window with isolated preload', async () => {
  const environment: Record<string, string> = { DRAWINGBOARD_TEST: '1', DRAWINGBOARD_DATA_DIR: path.resolve('test-results/runtime/bootstrap') };
  for (const [name, value] of Object.entries(process.env)) if (value !== undefined && name !== 'ELECTRON_RUN_AS_NODE') environment[name] = value;
  const app = await _electron.launch({
    args: ['dist-electron/main.cjs'],
    env: environment,
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole('button', { name: '智能笔', exact: true })).toBeVisible();
    await expect(page.locator('.excalidraw canvas').first()).toBeVisible();
    expect(await page.evaluate(() => typeof (window as unknown as { require?: unknown }).require)).toBe('undefined');
    expect(await page.evaluate(() => typeof window.desktop?.savePdf)).toBe('function');
    expect(await app.windows()).toHaveLength(1);
    await page.waitForFunction(() => !!window.__p0);
    await page.evaluate(() => window.__p0!.seedBasics());
    await expect(page.getByText('6 个对象', { exact: true })).toBeVisible();
    const first = await page.evaluate(() => window.__p0!.snapshot());
    await page.evaluate((scene) => window.__p0!.load(scene), first);
    await expect.poll(async () => (await page.evaluate(() => window.__p0!.snapshot())).elements.length).toBe(6);
    const restored = await page.evaluate(() => window.__p0!.snapshot());
    expect(restored.elements.find((e) => e.id === 'node-a')?.customData).toEqual(first.elements.find((e) => e.id === 'node-a')?.customData);
    expect(restored.elements.find((e) => e.id === 'edge')?.startBinding).toEqual(first.elements.find((e) => e.id === 'edge')?.startBinding);
    expect(Object.keys(restored.files)).toEqual(['fixture-image']);
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForFunction(() => !!window.__p0);
    await page.evaluate((scene) => window.__p0!.load(scene), first);
    await expect(page.getByText('6 个对象', { exact: true })).toBeVisible();
    const remote = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((name) => /^https?:/.test(name)));
    expect(remote).toEqual([]);
    await page.screenshot({ path: 'test-results/desktop/bootstrap.jpg' });
  } finally { await app.close(); }
});
