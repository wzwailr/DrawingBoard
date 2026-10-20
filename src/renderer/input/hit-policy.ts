import type { Point } from '../../shared/contracts';
export interface HitElement { id: string; type: string; x: number; y: number; width: number; height: number; angle?: number; isDeleted?: boolean; points?: readonly (readonly number[])[] }
export type Hit = { kind: 'blank' } | { kind: 'border' | 'content' | 'handle'; element: HitElement };
export function localPoint(element: HitElement, p: Point): Point {
  const cx = element.x + element.width / 2, cy = element.y + element.height / 2, a = -(element.angle || 0);
  return { x: cx + (p.x - cx) * Math.cos(a) - (p.y - cy) * Math.sin(a), y: cy + (p.x - cx) * Math.sin(a) + (p.y - cy) * Math.cos(a) };
}
const distanceSegment = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
export function outlineDistance(e: HitElement, p: Point): number {
  const q = localPoint(e, p), x0 = e.x, y0 = e.y, x1 = e.x + e.width, y1 = e.y + e.height;
  if (e.type === 'ellipse') {
    const rx = Math.max(e.width / 2, .01), ry = Math.max(e.height / 2, .01), dx = q.x - x0 - rx, dy = q.y - y0 - ry;
    if (!dx && !dy) return Math.min(rx, ry);
    const angle = Math.atan2(dy / ry, dx / rx);
    return Math.hypot(dx - rx * Math.cos(angle), dy - ry * Math.sin(angle));
  }
  if (e.type === 'rectangle') return Math.min(distanceSegment(q, { x: x0, y: y0 }, { x: x1, y: y0 }), distanceSegment(q, { x: x1, y: y0 }, { x: x1, y: y1 }), distanceSegment(q, { x: x1, y: y1 }, { x: x0, y: y1 }), distanceSegment(q, { x: x0, y: y1 }, { x: x0, y: y0 }));
  if (e.points?.length) {
    let distance = Infinity;
    for (let i = 1; i < e.points.length; i++) distance = Math.min(distance, distanceSegment(q, { x: e.x + e.points[i-1][0], y: e.y + e.points[i-1][1] }, { x: e.x + e.points[i][0], y: e.y + e.points[i][1] }));
    return distance;
  }
  return Infinity;
}
export function hitTest(elements: readonly HitElement[], point: Point, zoom: number, selected: Record<string, boolean> = {}): Hit {
  const tolerance = 6 / zoom;
  for (let i = elements.length - 1; i >= 0; i--) {
    const e = elements[i]; if (e.isDeleted || !selected[e.id]) continue;
    const q = localPoint(e, point);
    for (const x of [e.x, e.x + e.width / 2, e.x + e.width]) for (const y of [e.y, e.y + e.height / 2, e.y + e.height]) {
      if (x === e.x + e.width / 2 && y === e.y + e.height / 2) continue;
      if (Math.abs(q.x - x) <= 8 / zoom && Math.abs(q.y - y) <= 8 / zoom) return { kind: 'handle', element: e };
    }
  }
  for (let i = elements.length - 1; i >= 0; i--) {
    const e = elements[i]; if (e.isDeleted) continue;
    const q = localPoint(e, point);
    if (['text', 'image'].includes(e.type) && q.x >= e.x && q.x <= e.x + e.width && q.y >= e.y && q.y <= e.y + e.height) return { kind: 'content', element: e };
    if (outlineDistance(e, point) <= tolerance) return { kind: 'border', element: e };
  }
  return { kind: 'blank' };
}
