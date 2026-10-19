import { useEffect, useRef, useState, type RefObject } from 'react';
import { createGesture, type Clock } from './gesture';
import { recognize } from './recognizer';
import type { EditorAdapter } from '../editor/adapter';
import type { Candidate, Point, StrokeSample } from '../../shared/contracts';
import './ink.css';

const clock: Clock = { now: () => performance.now(), setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (id) => window.clearTimeout(id as number) };
type Props = { container: RefObject<HTMLElement | null>; editor: EditorAdapter; enabled: boolean };

export function SmartPenLayer({ container, editor, enabled }: Props) {
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
    function down(event: PointerEvent) {
      if (event.button !== 0 || !event.isPrimary || !(event.target instanceof HTMLCanvasElement)) return;
      event.preventDefault(); event.stopPropagation(); surface!.focus({ preventScroll: true });
      const state = editor.api.getAppState();
      pen.down(event.pointerId, sample(event), { x: state.scrollX, y: state.scrollY, zoom: state.zoom.value });
      surface!.setPointerCapture(event.pointerId); redraw();
    }
    function move(event: PointerEvent) { if (pen.isDrawing()) { event.stopPropagation(); pen.move(event.pointerId, sample(event)); redraw(); } }
    function up(event: PointerEvent) {
      if (!pen.isDrawing()) return;
      event.stopPropagation(); pen.up(event.pointerId, sample(event)); redraw();
      if (surface!.hasPointerCapture(event.pointerId)) surface!.releasePointerCapture(event.pointerId);
    }
    function lost() { if (pen.isDrawing()) { pen.cancel('capture-lost'); redraw(); } }
    function blur() { if (pen.isDrawing()) { pen.cancel('blur'); redraw(); } }
    function key(event: KeyboardEvent) {
      if (!pen.isDrawing() || event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); pen.cancel('escape'); redraw(); }
      else if ((event.ctrlKey || event.metaKey) && /[zy]/i.test(event.key)) { event.preventDefault(); event.stopPropagation(); }
    }
    surface.addEventListener('pointerdown', down, true); surface.addEventListener('pointermove', move, true); surface.addEventListener('pointerup', up, true);
    surface.addEventListener('lostpointercapture', lost); surface.addEventListener('wheel', blur, true);
    window.addEventListener('blur', blur); document.addEventListener('keydown', key, true);
    return () => {
      surface.removeEventListener('pointerdown', down, true); surface.removeEventListener('pointermove', move, true); surface.removeEventListener('pointerup', up, true);
      surface.removeEventListener('lostpointercapture', lost); surface.removeEventListener('wheel', blur, true);
      window.removeEventListener('blur', blur); document.removeEventListener('keydown', key, true);
      pen.cancel('hide'); unsubscribe(); pen.dispose(); raw.current?.setAttribute('d', ''); preview.current?.setAttribute('d', '');
    };
  }, [container, editor, enabled]);
  return <><svg className="ink-preview" aria-hidden="true"><path ref={raw} fill="none" stroke="#252b2a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /><path ref={preview} fill="none" stroke="#4265ae" strokeWidth="2" strokeLinejoin="round" /></svg>
    {hint && <div data-testid="recognition-hint" className="recognition-hint" style={{ left: hint.x, top: hint.y }}>{hint.label}<span>松手确认</span></div>}</>;
}
