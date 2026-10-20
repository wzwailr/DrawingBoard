import { test, expect, _electron } from '@playwright/test';
import { launchDesktop } from '../support/desktop';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
test('global hotkey registers, hide retains scene, PNG and PDF export use native production paths', async () => {
  const { app, page } = await launchDesktop('lifecycle');
  try {
    expect(await app.evaluate(({ globalShortcut }) => globalShortcut.isRegistered('Control+Alt+D'))).toBe(true);
    await page.evaluate(() => window.__p0!.seedBasics());
    const original = await page.evaluate(() => window.__p0!.snapshot());
    await page.getByRole('button', { name: '收起', exact: true }).click();
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
    expect(await page.evaluate(() => window.__p0!.snapshot())).toEqual(original);
    const output = path.resolve('test-results/exports'); await mkdir(output, { recursive: true });
    await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }); }, path.join(output, 'scene.png'));
    await page.getByRole('button', { name: '导出 PNG' }).click();
    await expect(page.getByRole('status')).toHaveText('已导出 PNG');
    expect((await readFile(path.join(output, 'scene.png'))).subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
    await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }); }, path.join(output, 'scene.pdf'));
    await page.getByRole('button', { name: '导出 PDF' }).click();
    await expect(page.getByRole('status')).toHaveText('已导出 PDF');
    expect((await readFile(path.join(output, 'scene.pdf'))).subarray(0,5).toString()).toBe('%PDF-');
    await page.screenshot({ path: 'test-results/desktop/connected-layout.jpg' });
  } finally { await app.close(); }
});
test('occupied native hotkey is reported and normal exit releases the registration', async () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string,string>;
  const holder = await _electron.launch({ args: ['tests/support/shortcut-holder.cjs'], env });
  let target: Awaited<ReturnType<typeof launchDesktop>> | undefined;
  try {
    await expect.poll(() => holder.evaluate(({ globalShortcut }) => globalShortcut.isRegistered('Control+Alt+D'))).toBe(true);
    target = await launchDesktop('occupied');
    await expect(target.page.getByRole('status')).toContainText('Ctrl+Alt+D 注册失败');
    expect(await target.app.evaluate(({ globalShortcut }) => globalShortcut.isRegistered('Control+Alt+D'))).toBe(false);
  } finally { await target?.app.close(); await holder.close(); }
  const normal = await launchDesktop('release');
  expect(await normal.app.evaluate(({ globalShortcut }) => globalShortcut.isRegistered('Control+Alt+D'))).toBe(true);
  await Promise.all([normal.app.waitForEvent('close'), normal.page.getByRole('button', { name: '退出', exact: true }).click()]);
  const after = await _electron.launch({ args: ['tests/support/shortcut-holder.cjs'], env });
  try { expect(await after.evaluate(({ globalShortcut }) => globalShortcut.isRegistered('Control+Alt+D'))).toBe(true); }
  finally { await after.close(); }
});
