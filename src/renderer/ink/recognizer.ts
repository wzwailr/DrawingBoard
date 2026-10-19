import { recognizeShape } from '@excalidraw/element';
import { pointFrom, type GlobalPoint } from '@excalidraw/math';
import type { Candidate, StrokeSample } from '../../shared/contracts';

export function recognize(samples: readonly StrokeSample[], zoom = 1): Candidate | null {
  if (samples.length < 3 || samples.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const points = samples.map(({ x, y }) => pointFrom<GlobalPoint>(x, y));
  const found = recognizeShape(points, null, zoom);
  if (found.type === 'line') return { kind: 'line', start: { x: points[0][0], y: points[0][1] },
    end: { x: points[points.length - 1][0], y: points[points.length - 1][1] } };
  if (found.type !== 'rectangle' && found.type !== 'ellipse') return null;
  const [x0, y0, x1, y1] = found.boundingBox;
  if (!(x1 > x0 && y1 > y0)) return null;
  return { kind: found.type, center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, width: x1 - x0, height: y1 - y0, rotation: 0 };
}
