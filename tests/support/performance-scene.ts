import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { EditorAdapter } from '../../src/renderer/editor/adapter';
import type { FileId } from '@excalidraw/element/types';
import { pointFrom, type LocalPoint } from '@excalidraw/math';
export function seedPerformance(adapter: EditorAdapter, mixed = false) {
  const files: Parameters<typeof adapter.api.addFiles>[0][number][] = [];
  let seed = 2917;
  for (let i = 0; i < 3; i++) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 640;
    const ctx = canvas.getContext('2d')!, pixels = ctx.createImageData(canvas.width, canvas.height);
    for (let n = 0; n < pixels.data.length; n += 4) {
      for (let c = 0; c < 3; c++) { seed = (1664525 * seed + 1013904223) >>> 0; pixels.data[n+c] = seed >>> 24; }
      pixels.data[n+3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    files.push({ id: `perf-image-${i}` as FileId, mimeType: 'image/png', dataURL: canvas.toDataURL(), created: 1 } as typeof files[number]);
  }
  const base = mixed ? 970 : 100;
  const skeletons: Parameters<typeof convertToExcalidrawElements>[0] = [];
  for (let i = 0; i < base; i++) skeletons.push(i % 5 === 0
    ? { id: `perf-${i}`, type: 'text', x: (i%20)*65, y: Math.floor(i/20)*34, text: `功能 ${i}`, fontFamily: 2, fontSize: 12 }
    : { id: `perf-${i}`, type: i%3 === 0 ? 'ellipse' : 'rectangle', x: (i%20)*65, y: Math.floor(i/20)*34, width: 56, height: 26, roughness: 0 });
  for (let i = 0; i < 20; i++) skeletons.push({ type: 'arrow', x: i*45, y: 210 + i%3*40, width: 100, height: 20, points: [pointFrom<LocalPoint>(0,0),pointFrom<LocalPoint>(100,20)], roughness: 0 });
  for (let i = 0; i < (mixed ? 10 : 3); i++) skeletons.push({ type: 'image', x: i*125, y: 400, width: 120, height: 100, fileId: files[i%3].id });
  adapter.api.addFiles(files);
  adapter.api.updateScene({ elements: convertToExcalidrawElements(skeletons, { regenerateIds: false }) });
  return files.reduce((sum, file) => sum + Math.floor((file.dataURL.length - file.dataURL.indexOf(',') - 1) * 3/4), 0);
}
