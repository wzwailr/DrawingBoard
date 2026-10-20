import { useCallback, useEffect, useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import { createEditorAdapter, type EditorAdapter } from './adapter';
import { SmartPenLayer } from '../ink/SmartPenLayer';
import { TextEditor, type TextSession, type TextEditorHandle } from '../input/TextEditor';

export function EditorHost() {
  const editor = useRef<EditorAdapter | null>(null);
  const surface = useRef<HTMLElement | null>(null);
  const [adapter, setAdapter] = useState<EditorAdapter | null>(null);
  const [text, setText] = useState<TextSession | null>(null);
  const textHandle = useRef<TextEditorHandle | null>(null);
  const beginText = useCallback((session: TextSession) => setText(session), []);
  const closeText = useCallback(() => { setText(null); surface.current?.focus(); }, []);
  const requestHide = useCallback(() => { const hide = () => { void window.desktop?.hide(); }; if (textHandle.current) textHandle.current.finishThen(hide); else hide(); }, []);
  const requestQuit = useCallback(() => { const quit = () => { void window.desktop?.quit(); }; if (textHandle.current) textHandle.current.finishThen(quit); else quit(); }, []);
  useEffect(() => window.desktop?.onEvent((event) => { if (event.kind === 'request-hide') requestHide(); else if (event.kind === 'request-quit') requestQuit(); else if (event.kind === 'notice') setMessage(event.message); }), [requestHide, requestQuit]);
  const [tool, setTool] = useState<'ink' | 'selection' | 'text'>('ink');
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('P0 交互验证 · 自动保存将在后续阶段接入');
  const ready = useCallback((api: ExcalidrawImperativeAPI | null) => {
    if (!api) return;
    editor.current = createEditorAdapter(api);
    if (import.meta.env.MODE === 'validation') {
      void import('../../../tests/support/probe').then(({ attachProbe }) => { if (editor.current) attachProbe(editor.current); });
    }
    api.setActiveTool({ type: 'custom', customType: 'drawingboard-ink', locked: true });
    setAdapter(editor.current);
    void document.fonts.ready.then(() => window.desktop?.ready());
  }, []);
  function choose(next: typeof tool) {
    setTool(next);
    if (next === 'ink') editor.current?.api.setActiveTool({ type: 'custom', customType: 'drawingboard-ink', locked: true });
    else editor.current?.api.setActiveTool({ type: next, locked: true });
  }
  async function output(kind: 'png' | 'pdf') {
    if (!editor.current || !window.desktop) return;
    try {
      const bytes = await editor.current.exportPng();
      const path = await (kind === 'png' ? window.desktop.savePng(bytes) : window.desktop.savePdf(bytes));
      if (path) setMessage(`已导出 ${kind.toUpperCase()}`);
    } catch (error) { setMessage(`导出失败：${error instanceof Error ? error.message : String(error)}`); }
  }
  return <main className="workspace">
    <header className="document-bar"><div className="identity"><span className="brand-mark">▱</span><strong>DrawingBoard</strong><span className="version">P0 交互验证</span></div>
      <div className="document-actions"><button disabled={!count} onClick={() => void output('png')}>导出 PNG</button><button disabled={!count} onClick={() => void output('pdf')}>导出 PDF</button><button onClick={requestHide}>收起</button><button onClick={requestQuit}>退出</button></div></header>
    <section ref={surface} className="canvas-area" aria-label="自由画布" tabIndex={-1}>
      <div className="tool-palette" role="toolbar" aria-label="画布工具">
        <button aria-pressed={tool === 'ink'} onClick={() => choose('ink')}>智能笔</button>
        <button aria-pressed={tool === 'selection'} onClick={() => choose('selection')}>选择</button>
        <button aria-pressed={tool === 'text'} onClick={() => choose('text')}>文字</button>
        <span className="tool-divider" />
        <span className="tool-note">松手留笔迹 · 停顿再规整</span>
      </div>
      <Excalidraw onExcalidrawAPI={ready} onChange={(elements) => setCount(elements.filter((e) => !e.isDeleted).length)}
        langCode="zh-CN" ui={{ enabled: { zoom: true } }} aiEnabled={false} autoFocus handleKeyboardGlobally
        initialData={{ appState: { viewBackgroundColor: '#ffffff', currentItemFontFamily: 2, currentItemRoughness: 0 } }} />
      {adapter && <SmartPenLayer container={surface} editor={adapter} enabled={tool !== 'selection' && !text} mode={tool} beginText={beginText} />}
      {adapter && text && <TextEditor key={`${text.textId ?? 'new'}:${text.position.x}:${text.position.y}`} editor={adapter} session={text} onClose={closeText} handle={textHandle} />}
    </section>
    <footer className="status-bar"><span role="status">{message}</span><span>{count} 个对象</span></footer>
  </main>;
}
