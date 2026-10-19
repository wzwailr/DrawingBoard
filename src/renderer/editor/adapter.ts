import { restoreElements, CaptureUpdateAction, exportScene, viewportCoordsToSceneCoords, sceneCoordsToViewportCoords } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFileData } from '@excalidraw/excalidraw/types';
import { decodeScene, encodeScene } from './engine-snapshot';
import { ENGINE_COMMIT, type EngineScene, type StrokeSample, type Candidate, type Point } from '../../shared/contracts';
import { createStrokeElement } from './stroke-element';

export function createEditorAdapter(api: ExcalidrawImperativeAPI) {
  return {
    api,
    toWorld(point: Point): Point { return viewportCoordsToSceneCoords({ clientX: point.x, clientY: point.y }, api.getAppState()); },
    toScreen(point: Point): Point { return sceneCoordsToViewportCoords({ sceneX: point.x, sceneY: point.y }, api.getAppState()); },
    commitStroke(samples: readonly StrokeSample[], candidate: Candidate | null) {
      const element = createStrokeElement(samples, candidate);
      api.updateScene({ elements: [...api.getSceneElements(), element], captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      return element.id;
    },
    serialize(): EngineScene {
      return decodeScene(JSON.stringify({ schemaVersion: 1, engine: 'excalidraw', sourceCommit: ENGINE_COMMIT,
        elements: api.getSceneElements(), files: api.getFiles(), viewBackgroundColor: api.getAppState().viewBackgroundColor }));
    },
    load(scene: EngineScene) {
      const valid = decodeScene(encodeScene(scene));
      api.addFiles(Object.values(valid.files) as BinaryFileData[]);
      api.updateScene({ elements: restoreElements(valid.elements as ExcalidrawElement[], null),
        appState: { viewBackgroundColor: valid.viewBackgroundColor }, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    },
    onDocumentChange(listener: () => void) { return api.onChange(() => listener()); },
    async exportPng(): Promise<Uint8Array> {
      await document.fonts.ready;
      const blob = await exportScene({ type: 'png', data: { elements: api.getSceneElements(), appState: api.getAppState(), files: api.getFiles() },
        config: { canvasBackgroundColor: api.getAppState().viewBackgroundColor, padding: 24, maxWidthOrHeight: 4096 } });
      return new Uint8Array(await blob.arrayBuffer());
    },
  };
}
export type EditorAdapter = ReturnType<typeof createEditorAdapter>;
