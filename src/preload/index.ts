import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi, DesktopEvent } from '../shared/contracts';
const api: DesktopApi = {
  ready: () => ipcRenderer.send('p0:ready'),
  hide: () => ipcRenderer.invoke('p0:hide'),
  quit: () => ipcRenderer.invoke('p0:quit'),
  savePng: (png) => ipcRenderer.invoke('p0:save-png', png),
  savePdf: (png) => ipcRenderer.invoke('p0:save-pdf', png),
  onEvent(listener) {
    const callback = (_event: Electron.IpcRendererEvent, value: DesktopEvent) => listener(value);
    ipcRenderer.on('p0:event', callback);
    return () => ipcRenderer.removeListener('p0:event', callback);
  },
};
contextBridge.exposeInMainWorld('desktop', api);
