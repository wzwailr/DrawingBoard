import { convertToExcalidrawElements, CaptureUpdateAction } from '@excalidraw/excalidraw';
import type { EditorAdapter } from '../../src/renderer/editor/adapter';
import type { EngineScene } from '../../src/shared/contracts';
import type { FileId } from '@excalidraw/excalidraw/element/types';
import { seedPerformance } from './performance-scene';

export interface P0Probe {
  snapshot(): EngineScene;
  load(scene: EngineScene): void;
  clear(): void;
  viewport(): { zoom: number; scrollX: number; scrollY: number };
  seedBasics(): void;
  seedPerformance(mixed?: boolean): number;
  pan(x: number): void;
  setZoom(zoom: number, scrollX?: number, scrollY?: number): void;
  toScreen(point: { x: number; y: number }): { x: number; y: number };
  waitForInkCommit(): Promise<{ at: number; count: number }>;
}

export function attachProbe(adapter: EditorAdapter) {
  const probe = {
    snapshot: () => adapter.serialize(),
    load: (scene: EngineScene) => adapter.load(scene),
    clear() { adapter.api.updateScene({ elements: [], captureUpdate: CaptureUpdateAction.IMMEDIATELY }); },
    viewport: () => ({ zoom: adapter.api.getAppState().zoom.value, scrollX: adapter.api.getAppState().scrollX, scrollY: adapter.api.getAppState().scrollY }),
    seedPerformance: (mixed = false) => seedPerformance(adapter, mixed),
    pan: (x: number) => adapter.api.updateScene({ appState: { scrollX: x } }),
    setZoom: (zoom: number, scrollX = 0, scrollY = 0) => adapter.api.updateScene({ appState: { scrollX, scrollY, zoom: { value: zoom as ReturnType<typeof adapter.api.getAppState>['zoom']['value'] } } }),
    toScreen: (point: { x: number; y: number }) => adapter.toScreen(point),
    waitForInkCommit: () => new Promise<{ at: number; count: number }>((resolve, reject) => {
      const before = new Set(adapter.api.getSceneElements().map((e) => e.id));
      const timer = window.setTimeout(() => { unsubscribe(); reject(new Error('No input commit within 3s')); }, 3000);
      const unsubscribe = adapter.api.onChange((elements) => {
        if (!elements.some((e) => !e.isDeleted && e.type === 'freedraw' && !before.has(e.id))) return;
        window.clearTimeout(timer); unsubscribe(); resolve({ at: performance.timeOrigin + performance.now(), count: elements.filter((e) => !e.isDeleted).length });
      });
    }),
    seedBasics() {
      const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#e3eee8'; ctx.fillRect(0, 0, 120, 80);
      ctx.fillStyle = '#315f51'; ctx.fillRect(18, 22, 84, 12); ctx.fillRect(18, 45, 52, 8);
      const fileId = 'fixture-image' as FileId;
      const elements = convertToExcalidrawElements([
        { id: 'node-a', type: 'rectangle', x: 160, y: 180, width: 180, height: 100, roughness: 0,
          label: { text: '需求', fontFamily: 2 }, customData: { drawingboard: { provenance: { version: 1, points: [[0,0],[180,0],[180,100],[0,100],[0,0]] } } } },
        { id: 'node-b', type: 'ellipse', x: 560, y: 180, width: 180, height: 100, roughness: 0, label: { text: '方案', fontFamily: 2 } },
        { id: 'edge', type: 'arrow', x: 340, y: 230, width: 220, height: 0, start: { id: 'node-a' }, end: { id: 'node-b' }, roughness: 0 },
        { id: 'image', type: 'image', x: 160, y: 380, width: 120, height: 80, fileId },
      ], { regenerateIds: false });
      adapter.api.addFiles([{ id: fileId, mimeType: 'image/png', dataURL: canvas.toDataURL(), created: 1 } as Parameters<typeof adapter.api.addFiles>[0][number]]);
      adapter.api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    },
  };
  window.__p0 = probe;
  return () => { delete window.__p0; };
}
declare global { interface Window { __p0?: P0Probe } }
