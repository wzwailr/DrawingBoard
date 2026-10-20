import { useEffect, useRef, useState, useImperativeHandle, type RefObject } from 'react';
import type { EditorAdapter } from '../editor/adapter';
import type { Point } from '../../shared/contracts';
import './text.css';
export interface TextSession { position: Point; textId?: string; containerId?: string; initial: string }
export interface TextEditorHandle { finishThen(action: () => void): void }
export function TextEditor({ editor, session, onClose, handle }: { editor: EditorAdapter; session: TextSession; onClose(): void; handle: RefObject<TextEditorHandle | null> }) {
  const ref = useRef<HTMLTextAreaElement>(null), composing = useRef(false), pending = useRef<(() => void) | null>(null), closed = useRef(false);
  const [value, setValue] = useState(session.initial);
  const valueRef = useRef(value); valueRef.current = value;
  const finish = (action?: () => void) => {
    if (composing.current) { pending.current = () => finish(action); return; }
    if (!closed.current) { closed.current = true; editor.commitText(session, valueRef.current); onClose(); }
    action?.();
  };
  useImperativeHandle(handle, () => ({ finishThen: (action) => finish(action) }));
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const screen = editor.toScreen(session.position), state = editor.api.getAppState();
  return <textarea ref={ref} className="canvas-text-input" aria-label="画布文字" value={value} spellCheck={false}
    style={{ left: screen.x - state.offsetLeft, top: screen.y - state.offsetTop, fontSize: 20 * state.zoom.value }}
    onChange={(e) => setValue(e.target.value)} onBlur={() => finish()}
    onCompositionStart={() => { composing.current = true; }}
    onCompositionEnd={(e) => { valueRef.current = e.currentTarget.value; composing.current = false; const action = pending.current; pending.current = null; if (action) queueMicrotask(action); }}
    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape' && !e.nativeEvent.isComposing && !composing.current && e.keyCode !== 229) { e.preventDefault(); finish(); } }} />;
}
