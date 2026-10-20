import { newElementWith } from '@excalidraw/element';
import type { ExcalidrawElement, ExcalidrawArrowElement, FixedPointBinding } from '@excalidraw/element/types';
import { localPoint, outlineDistance } from '../input/hit-policy';
import type { Point } from '../../shared/contracts';
export function attachLine(arrow: ExcalidrawArrowElement, elements: readonly ExcalidrawElement[], zoom: number) {
  const target = (p: Point) => [...elements].reverse().find((e) => !e.isDeleted && ['rectangle', 'ellipse'].includes(e.type) && outlineDistance(e, p) <= 24 / zoom);
  const first = arrow.points[0], last = arrow.points.at(-1)!;
  const start = { x: arrow.x + first[0], y: arrow.y + first[1] }, end = { x: arrow.x + last[0], y: arrow.y + last[1] };
  const a = target(start), hitEnd = target(end), b = hitEnd?.id === a?.id ? undefined : hitEnd;
  const binding = (e: ExcalidrawElement | undefined, p: Point): FixedPointBinding | null => {
    if (!e) return null;
    const q = localPoint(e, p);
    return { elementId: e.id, mode: 'orbit', fixedPoint: [Math.max(0, Math.min(1, (q.x - e.x) / Math.max(1, e.width))), Math.max(0, Math.min(1, (q.y - e.y) / Math.max(1, e.height)))] as FixedPointBinding['fixedPoint'] };
  };
  return {
    arrow: newElementWith(arrow, { startBinding: binding(a, start), endBinding: binding(b, end), endArrowhead: a && b ? 'arrow' : null }),
    elements: elements.map((e) => e.id === a?.id || e.id === b?.id ? newElementWith(e, { boundElements: [...(e.boundElements ?? []).filter((r) => r.id !== arrow.id), { id: arrow.id, type: 'arrow' }] }) : e),
  };
}
