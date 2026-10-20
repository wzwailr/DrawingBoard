import { _electron } from '@playwright/test';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export async function launchDesktop(label: string) {
  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) if (value !== undefined && name !== 'ELECTRON_RUN_AS_NODE') env[name] = value;
  env.DRAWINGBOARD_TEST = '1';
  env.DRAWINGBOARD_DATA_DIR = path.resolve('test-results/runtime', `${label}-${randomUUID()}`);
  const app = await _electron.launch({ args: ['dist-electron/main.cjs'], env });
  const page = await app.firstWindow();
  await page.waitForFunction(() => !!window.__p0);
  // A loaded Chromium page is not yet an exposed/focused native window.
  for (let i = 0; i < 100 && !await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()); i++) await page.waitForTimeout(25);
  await page.waitForFunction(() => document.hasFocus());
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return { app, page };
}
