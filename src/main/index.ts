import { app, BrowserWindow, dialog, ipcMain, session, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

app.setName('DrawingBoard');
if (process.env.DRAWINGBOARD_DATA_DIR) app.setPath('userData', path.resolve(process.env.DRAWINGBOARD_DATA_DIR));
let window: BrowserWindow;
let quitting = false;
let tray: Tray;
let shortcutAvailable = false;
function showWindow() { if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
function requestHide() { window.webContents.send('p0:event', { kind: 'request-hide' }); }
const startedAt = performance.now();
const devUrl = process.env.DRAWINGBOARD_DEV_SERVER_URL;
if (devUrl && !/^http:\/\/127\.0\.0\.1:\d+$/.test(devUrl)) throw new Error('Invalid local development server');
const entry = path.resolve(__dirname, '../dist/index.html');
const trustedUrl = devUrl ?? pathToFileURL(entry).href;

function checkSender(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) {
  if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame ||
      !event.senderFrame.url.startsWith(trustedUrl)) throw new Error('Unsupported sender');
}
function checkedPng(value: unknown): Buffer {
  if (!(value instanceof Uint8Array) || value.byteLength > 32 * 1024 * 1024) throw new Error('Invalid image');
  const buffer = Buffer.from(value);
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG');
  return buffer;
}

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => { if (window) showWindow(); });
  void app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window = new BrowserWindow({
      width: 1280, height: 820, minWidth: 760, minHeight: 540,
      show: false, title: 'DrawingBoard · P0 交互验证', backgroundColor: '#fafaf9',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    window.removeMenu();
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(trustedUrl)) event.preventDefault(); });
    window.on('close', (event) => { if (!quitting) { event.preventDefault(); requestHide(); } });
    const bitmap = Buffer.alloc(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4, line = x >= 7 && x <= 24 && y >= 8 && y <= 23 && (x < 10 || x > 21 || y < 11 || y > 20);
      bitmap[i] = line ? 255 : 157; bitmap[i+1] = line ? 255 : 94; bitmap[i+2] = line ? 255 : 57; bitmap[i+3] = 255;
    }
    tray = new Tray(nativeImage.createFromBitmap(bitmap, { width: 32, height: 32 }));
    tray.setToolTip('DrawingBoard · Ctrl+Alt+D 唤出/收起');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: '显示画板', click: showWindow }, { type: 'separator' }, { label: '退出', click: () => window.webContents.send('p0:event', { kind: 'request-quit' }) }]));
    tray.on('double-click', showWindow);
    shortcutAvailable = globalShortcut.register('Control+Alt+D', () => { if (window.isVisible() && !window.isMinimized()) requestHide(); else showWindow(); });
    ipcMain.on('p0:ready', (event) => { checkSender(event); showWindow();
      if (!shortcutAvailable) window.webContents.send('p0:event', { kind: 'notice', message: 'Ctrl+Alt+D 注册失败，请通过任务栏托盘显示画板。' });
      console.log(JSON.stringify({ metric: 'ready', ms: performance.now() - startedAt })); });
    ipcMain.handle('p0:hide', (event) => { checkSender(event); window.hide(); });
    ipcMain.handle('p0:quit', (event) => { checkSender(event); quitting = true; app.quit(); });
    ipcMain.handle('p0:save-png', async (event, input: unknown) => {
      checkSender(event); const bytes = checkedPng(input);
      const target = await dialog.showSaveDialog(window, { defaultPath: 'DrawingBoard.png', filters: [{ name: 'PNG 图片', extensions: ['png'] }] });
      if (target.canceled || !target.filePath) return null;
      await writeFile(target.filePath, bytes); return target.filePath;
    });
    ipcMain.handle('p0:save-pdf', async (event, input: unknown) => {
      checkSender(event); const bytes = checkedPng(input);
      const target = await dialog.showSaveDialog(window, { defaultPath: 'DrawingBoard.pdf', filters: [{ name: 'PDF 文档', extensions: ['pdf'] }] });
      if (target.canceled || !target.filePath) return null;
      const printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
      try {
        await printWindow.loadFile(path.resolve(__dirname, '../dist/print/index.html'));
        const source = `data:image/png;base64,${bytes.toString('base64')}`;
        await printWindow.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const img=document.querySelector('img');img.onload=()=>resolve(true);img.onerror=()=>reject(new Error('图片无法加载'));img.src=${JSON.stringify(source)};})`);
        const pdf = await printWindow.webContents.printToPDF({ pageSize: 'A4', landscape: true, printBackground: true, margins: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 } });
        await writeFile(target.filePath, pdf); return target.filePath;
      } finally { printWindow.destroy(); }
    });
    if (devUrl) await window.loadURL(devUrl); else await window.loadFile(entry);
  });
}
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); tray?.destroy(); });
app.on('window-all-closed', () => app.quit());
