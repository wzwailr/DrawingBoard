import { useEffect, useRef, useState, type RefObject } from 'react';
import { createGesture, type Clock } from './gesture';
import { recognize } from './recognizer';
import type { EditorAdapter } from '../editor/adapter';
import type { Candidate, Point, StrokeSample } from '../../shared/contracts';
import './ink.css';
import { flushSync } from 'react-dom';
import { hitTest } from '../input/hit-policy';
import type { TextSession } from '../input/TextEditor';

const clock: Clock = { now: () => performance.now(), setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (id) => window.clearTimeout(id as number) };
type Props = { container: RefObject<HTMLElement | null>; editor: EditorAdapter; enabled: boolean; mode: 'ink' | 'selection' | 'text'; beginText(session: TextSession): void };

export function SmartPenLayer({ container, editor, enabled, mode, beginText }: Props) {
  const raw = useRef<SVGPathElement>(null), preview = useRef<SVGPathElement>(null);
  const [hint, setHint] = useState<{ label: string; x: number; y: number } | null>(null);
  useEffect(() => {
    const surface = container.current;
    if (!surface || !enabled) return;
    const pen = createGesture({ holdMs: 500, jitterDip: 3, motionResetDip: 3 }, clock, recognize);
    let candidate: Candidate | null = null;
    const local = (p: Point) => { const v = editor.toScreen(p), bounds = surface.getBoundingClientRect(); return { x: v.x - bounds.x, y: v.y - bounds.y }; };
    const pointText = (p: Point) => { const s = local(p); return `${s.x} ${s.y}`; };
    function candidatePath(shape: Candidate) {
      if (shape.kind === 'line') return `M ${pointText(shape.start)} L ${pointText(shape.end)}`;
      const x0 = shape.center.x - shape.width / 2, y0 = shape.center.y - shape.height / 2;
      if (shape.kind === 'rectangle') return `M ${pointText({ x: x0, y: y0 })} L ${pointText({ x: x0 + shape.width, y: y0 })} L ${pointText({ x: x0 + shape.width, y: y0 + shape.height })} L ${pointText({ x: x0, y: y0 + shape.height })} Z`;
      const left = local({ x: x0, y: shape.center.y }), right = local({ x: x0 + shape.width, y: shape.center.y });
      const zoom = editor.api.getAppState().zoom.value;
      return `M ${left.x} ${left.y} A ${shape.width * zoom / 2} ${shape.height * zoom / 2} 0 1 0 ${right.x} ${right.y} A ${shape.width * zoom / 2} ${shape.height * zoom / 2} 0 1 0 ${left.x} ${left.y}`;
    }
    function redraw() {
      raw.current?.setAttribute('d', pen.getSamples().map((p, i) => `${i ? 'L' : 'M'} ${pointText(p)}`).join(' '));
      raw.current?.setAttribute('opacity', candidate ? '.16' : '1');
      preview.current?.setAttribute('d', candidate ? candidatePath(candidate) : '');
    }
    const sample = (event: PointerEvent): StrokeSample => ({ ...editor.toWorld({ x: event.clientX, y: event.clientY }), timeMs: clock.now(), pressure: event.pressure });
    const unsubscribe = pen.onEffect((effect) => {
      if (effect.type === 'preview') {
        candidate = effect.candidate;
        if (candidate) {
          const at = local(pen.getSamples().at(-1)!);
          setHint({ label: candidate.kind === 'rectangle' ? '矩形' : candidate.kind === 'ellipse' ? '椭圆' : '直线',
            x: Math.max(8, Math.min(at.x + 16, surface.clientWidth - 180)), y: Math.max(72, Math.min(at.y + 16, surface.clientHeight - 42)) });
        } else setHint(null);
      } else {
        editor.commitStroke(effect.samples, effect.type === 'commitShape' ? effect.candidate : null);
        candidate = null; setHint(null);
      }
      redraw();
    });
    let space = false;
    let textPress: { pointerId: number; x: number; y: number; moved: boolean } | null = null;
    const hitAt = (event: MouseEvent) => hitTest(editor.api.getSceneElements(), editor.toWorld({ x: event.clientX, y: event.clientY }), editor.api.getAppState().zoom.value, editor.api.getAppState().selectedElementIds);
    function textAt(event: MouseEvent) {
      const hit = hitAt(event), elements = editor.api.getSceneElements();
      const content = hit.kind !== 'blank' && hit.element.type === 'text' ? elements.find((e) => e.id === hit.element.id && e.type === 'text') : undefined;
      const parentId = content?.type === 'text' ? content.containerId ?? undefined : hit.kind !== 'blank' && ['rectangle', 'ellipse'].includes(hit.element.type) ? hit.element.id : undefined;
      const label = content?.type === 'text' ? content : elements.find((e) => e.type === 'text' && e.containerId === parentId && parentId !== undefined);
      const position = label ? { x: label.x, y: label.y } : editor.toWorld({ x: event.clientX, y: event.clientY });
      beginText({ position, containerId: parentId, textId: label?.id, initial: label?.type === 'text' ? label.text : '' });
    }
    function down(event: PointerEvent) {
      if (event.button !== 0 || !event.isPrimary || !(event.target instanceof HTMLCanvasElement)) return;
      if (space) return;
      if (mode === 'text') { event.preventDefault(); event.stopPropagation(); textAt(event); return; }
      const hit = hitAt(event);
      if (hit.kind !== 'blank') {
        if (hit.element.type === 'text') textPress = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        flushSync(() => editor.api.setActiveTool({ type: 'selection' }));
        return;
      }
      if (editor.api.getAppState().activeTool.type !== 'custom') flushSync(() => editor.api.setActiveTool({ type: 'custom', customType: 'drawingboard-ink', locked: true }));
      event.preventDefault(); event.stopPropagation(); surface!.focus({ preventScroll: true });
      const state = editor.api.getAppState();
      pen.down(event.pointerId, sample(event), { x: state.scrollX, y: state.scrollY, zoom: state.zoom.value });
      surface!.setPointerCapture(event.pointerId); redraw();
    }
    function move(event: PointerEvent) {
      if (textPress?.pointerId === event.pointerId && Math.hypot(event.clientX-textPress.x,event.clientY-textPress.y) >= 3) textPress.moved = true;
      if (pen.isDrawing()) { event.stopPropagation(); pen.move(event.pointerId, sample(event)); redraw(); }
    }
    function up(event: PointerEvent) {
      if (textPress?.pointerId === event.pointerId) {
        // Native selection starts its own WYSIWYG on a stationary selected-text
        // pointer-up. Return to our custom tool before its window listener runs;
        // keep native cleanup and actual text drags, but only our double-click
        // may create the product's IME editor.
        if (!textPress.moved) flushSync(() => editor.api.setActiveTool({ type: 'custom', customType: 'drawingboard-ink', locked: true }));
        textPress = null;
      }
      if (!pen.isDrawing()) return;
      event.stopPropagation(); pen.up(event.pointerId, sample(event)); redraw();
      if (surface!.hasPointerCapture(event.pointerId)) surface!.releasePointerCapture(event.pointerId);
    }
    function lost() { if (pen.isDrawing()) { pen.cancel('capture-lost'); redraw(); } }
    function interrupt(event: Event) {
      // A key released in another application never reaches this document.
      // Wheel navigation cancels ink too, but must retain a still-held Space.
      if (event.type === 'blur') { space = false; textPress = null; }
      if (pen.isDrawing()) { pen.cancel('blur'); redraw(); }
    }
    function doubleClick(event: MouseEvent) {
      // Pointer capture retargets the click/double-click to this surface.
      if (!(event.target instanceof HTMLCanvasElement) && event.target !== surface) return;
      event.preventDefault(); event.stopPropagation(); textAt(event);
    }
    function key(event: KeyboardEvent) {
      if (event.code === 'Space' && !(event.target instanceof HTMLTextAreaElement)) space = true;
      if (!pen.isDrawing() || event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); pen.cancel('escape'); redraw(); }
      else if ((event.ctrlKey || event.metaKey) && /[zy]/i.test(event.key)) { event.preventDefault(); event.stopPropagation(); }
    }
    function keyUp(event: KeyboardEvent) { if (event.code === 'Space') space = false; }
    surface.addEventListener('pointerdown', down, true); surface.addEventListener('pointermove', move, true); surface.addEventListener('pointerup', up, true);
    surface.addEventListener('lostpointercapture', lost); surface.addEventListener('wheel', interrupt, true);
    surface.addEventListener('dblclick', doubleClick, true);
    window.addEventListener('blur', interrupt); document.addEventListener('keydown', key, true); document.addEventListener('keyup', keyUp, true);
    return () => {
      surface.removeEventListener('pointerdown', down, true); surface.removeEventListener('pointermove', move, true); surface.removeEventListener('pointerup', up, true);
      surface.removeEventListener('lostpointercapture', lost); surface.removeEventListener('wheel', interrupt, true);
      surface.removeEventListener('dblclick', doubleClick, true);
      window.removeEventListener('blur', interrupt); document.removeEventListener('keydown', key, true); document.removeEventListener('keyup', keyUp, true);
      pen.cancel('hide'); unsubscribe(); pen.dispose(); raw.current?.setAttribute('d', ''); preview.current?.setAttribute('d', '');
    };
  }, [container, editor, enabled, mode, beginText]);
  return <><svg className="ink-preview" aria-hidden="true"><path ref={raw} fill="none" stroke="#252b2a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><path ref={preview} fill="none" stroke="#4265ae" strokeWidth="2" strokeLinejoin="round" /></svg>
    {hint && <div data-testid="recognition-hint" className="recognition-hint" style={{ left: hint.x, top: hint.y }}>{hint.label}<span>松手确认</span></div>}</>;
}
