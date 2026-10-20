import { restoreElements, CaptureUpdateAction, exportScene, viewportCoordsToSceneCoords, sceneCoordsToViewportCoords } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement, ExcalidrawTextElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFileData } from '@excalidraw/excalidraw/types';
import { decodeScene, encodeScene } from './engine-snapshot';
import { ENGINE_COMMIT, type EngineScene, type StrokeSample, type Candidate, type Point } from '../../shared/contracts';
import { createStrokeElement } from './stroke-element';
import { newTextElement, newElementWith, isArrowElement, isTextElement } from '@excalidraw/element';
import { attachLine } from './connection-policy';
import type { TextSession } from '../input/TextEditor';

export function createEditorAdapter(api: ExcalidrawImperativeAPI) {
  return {
    api,
    toWorld(point: Point): Point { return viewportCoordsToSceneCoords({ clientX: point.x, clientY: point.y }, api.getAppState()); },
    toScreen(point: Point): Point { return sceneCoordsToViewportCoords({ sceneX: point.x, sceneY: point.y }, api.getAppState()); },
    commitStroke(samples: readonly StrokeSample[], candidate: Candidate | null) {
      let element: ExcalidrawElement = createStrokeElement(samples, candidate);
      let elements: ExcalidrawElement[] = [...api.getSceneElements()];
      if (isArrowElement(element)) { const bound = attachLine(element, elements, api.getAppState().zoom.value); element = bound.arrow; elements = [...bound.elements]; }
      api.updateScene({ elements: [...elements, element], captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      return element.id;
    },
    commitText(session: TextSession, value: string) {
      const elements = [...api.getSceneElements()];
      const old = elements.filter(isTextElement).find((e) => e.id === session.textId);
      const parent = elements.find((e) => e.id === session.containerId);
      if (!value && !old) return;
      const at = parent ? { x: parent.x + parent.width / 2, y: parent.y + parent.height / 2 } : session.position;
      const measured = newTextElement({ ...at, text: value, fontSize: 20, fontFamily: 2, strokeColor: '#252b2a',
        textAlign: parent ? 'center' : 'left', verticalAlign: parent ? 'middle' : 'top', containerId: parent?.id ?? null });
      const text = old ? newElementWith<ExcalidrawTextElement>(old, { text: value, originalText: value, width: measured.width, height: measured.height, x: measured.x, y: measured.y, isDeleted: !value }) : measured;
      const updated = elements.map((e) => e.id === old?.id ? text : e.id === parent?.id ? newElementWith(e, { boundElements: [...(e.boundElements ?? []).filter((r) => r.id !== old?.id), ...(!value ? [] : [{ id: text.id, type: 'text' as const }])] }) : e);
      if (!old) updated.push(text);
      api.updateScene({ elements: updated, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
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
