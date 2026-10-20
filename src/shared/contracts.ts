export const ENGINE_COMMIT = 'e1b7aacb356a492aa1e0fc6eb57b8896124027f0';
export interface Point { x: number; y: number }
export interface Viewport extends Point { zoom: number }
export interface StrokeSample extends Point { timeMs: number; pressure?: number }
export type Candidate =
  | { kind: 'rectangle' | 'ellipse'; center: Point; width: number; height: number; rotation: number }
  | { kind: 'line'; start: Point; end: Point };
export interface EngineElement { id: string; type: string; [key: string]: unknown }
export interface EngineFile { id: string; mimeType: string; dataURL: string; created: number; [key: string]: unknown }
export interface EngineScene {
  schemaVersion: 1;
  engine: 'excalidraw';
  sourceCommit: string;
  elements: EngineElement[];
  files: Record<string, EngineFile>;
  viewBackgroundColor: string;
}
export type DesktopEvent = { kind: 'show' | 'request-hide' | 'request-quit' } | { kind: 'notice'; message: string };
export interface DesktopApi {
  ready(): void;
  hide(): Promise<void>;
  quit(): Promise<void>;
  savePng(png: Uint8Array): Promise<string | null>;
  savePdf(png: Uint8Array): Promise<string | null>;
  onEvent(listener: (event: DesktopEvent) => void): () => void;
}
declare global { interface Window { desktop?: DesktopApi } }
