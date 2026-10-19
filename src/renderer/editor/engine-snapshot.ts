import { ENGINE_COMMIT, type EngineScene, type EngineFile, type EngineElement } from '../../shared/contracts';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function decodeScene(json: string): EngineScene {
  const value: unknown = JSON.parse(json);
  if (!record(value) || value.schemaVersion !== 1 || value.engine !== 'excalidraw') {
    throw new Error('不支持的画布版本，请保留原文件。');
  }
  if (typeof value.sourceCommit !== 'string' || !Array.isArray(value.elements) ||
      !record(value.files) || typeof value.viewBackgroundColor !== 'string') {
    throw new Error('画布数据不完整。');
  }
  const ids = new Set<string>();
  const elements: EngineElement[] = value.elements.map((item: unknown) => {
    if (!record(item) || typeof item.id !== 'string' || typeof item.type !== 'string' || ids.has(item.id)) {
      throw new Error('画布对象无效或 ID 重复。');
    }
    ids.add(item.id);
    return { ...item, id: item.id, type: item.type };
  });
  const files: Record<string, EngineFile> = {};
  for (const [id, file] of Object.entries(value.files)) {
    if (!record(file) || file.id !== id || typeof file.dataURL !== 'string' ||
        typeof file.mimeType !== 'string' || typeof file.created !== 'number') {
      throw new Error('图片资源无效。');
    }
    files[id] = { ...file, id, dataURL: file.dataURL, mimeType: file.mimeType, created: file.created };
  }
  for (const element of elements) {
    if (element.type === 'image' && typeof element.fileId === 'string' && !files[element.fileId]) {
      throw new Error('画布缺少图片资源。');
    }
  }
  return { schemaVersion: 1, engine: 'excalidraw', sourceCommit: value.sourceCommit,
    elements, files, viewBackgroundColor: value.viewBackgroundColor };
}

export function encodeScene(scene: unknown): string {
  return JSON.stringify(decodeScene(JSON.stringify(scene)));
}

export function emptyScene(): EngineScene {
  return { schemaVersion: 1, engine: 'excalidraw', sourceCommit: ENGINE_COMMIT,
    elements: [], files: {}, viewBackgroundColor: '#ffffff' };
}
