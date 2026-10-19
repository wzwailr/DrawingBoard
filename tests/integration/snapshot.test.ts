import { describe, expect, it } from 'vitest';
import { decodeScene, encodeScene } from '../../src/renderer/editor/engine-snapshot';

describe('engine snapshot boundary', () => {
  const scene = {
    schemaVersion: 1,
    engine: 'excalidraw',
    sourceCommit: 'e1b7aacb356a492aa1e0fc6eb57b8896124027f0',
    elements: [
      { id: 'node-a', type: 'rectangle', x: 10, y: 20, width: 120, height: 80,
        customData: { drawingboard: { provenance: { version: 1, points: [[0, 0], [120, 1], [119, 80], [0, 0]] } } },
        boundElements: [{ id: 'label', type: 'text' }, { id: 'edge', type: 'arrow' }] },
      { id: 'label', type: 'text', text: '需求', containerId: 'node-a' },
      { id: 'edge', type: 'arrow', points: [[0, 0], [200, 0]], startBinding: { elementId: 'node-a', focus: 0, gap: 1 }, endBinding: null },
      { id: 'image-a', type: 'image', fileId: 'asset-a' },
    ],
    files: { 'asset-a': { id: 'asset-a', mimeType: 'image/png', dataURL: 'data:image/png;base64,AAAA', created: 1 } },
    viewBackgroundColor: '#ffffff',
  };
  it('round trips IDs, Chinese labels, bindings, image data and original ink', () => {
    const actual = decodeScene(encodeScene(scene));
    expect(actual.elements.map((e) => e.id)).toEqual(['node-a', 'label', 'edge', 'image-a']);
    expect(actual).toEqual(scene);
  });
  it('rejects an unknown schema instead of replacing it with an empty board', () => {
    expect(() => decodeScene(JSON.stringify({ ...scene, schemaVersion: 2 }))).toThrow(/版本/);
  });
  it('rejects malformed or dangling image resources', () => {
    expect(() => decodeScene('{broken')).toThrow();
    expect(() => decodeScene(JSON.stringify({ ...scene, files: {} }))).toThrow(/图片/);
  });
});
