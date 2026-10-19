import { newArrowElement, newElement, newFreeDrawElement } from '@excalidraw/element';
import { pointFrom, type LocalPoint, type Radians } from '@excalidraw/math';
import type { Candidate, StrokeSample } from '../../shared/contracts';

export function createStrokeElement(samples: readonly StrokeSample[], candidate: Candidate | null) {
  if (!samples.length) throw new Error('Cannot commit empty ink');
  const style = { strokeColor: '#252b2a', backgroundColor: 'transparent', strokeWidth: 2, roughness: 0 };
  if (!candidate) {
    const origin = samples[0];
    let x0 = origin.x, y0 = origin.y, x1 = origin.x, y1 = origin.y;
    for (const p of samples) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    return newFreeDrawElement({ type: 'freedraw', x: origin.x, y: origin.y, width: x1 - x0, height: y1 - y0,
      points: samples.map((p) => pointFrom<LocalPoint>(p.x - origin.x, p.y - origin.y)), pressures: [], simulatePressure: false,
      strokeOptions: { variability: 'constant', streamline: 0 }, ...style });
  }
  const element = candidate.kind === 'line'
    ? newArrowElement({ type: 'arrow', x: candidate.start.x, y: candidate.start.y,
      width: Math.abs(candidate.end.x - candidate.start.x), height: Math.abs(candidate.end.y - candidate.start.y),
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(candidate.end.x - candidate.start.x, candidate.end.y - candidate.start.y)],
      startArrowhead: null, endArrowhead: null, elbowed: false, ...style })
    : newElement({ type: candidate.kind, x: candidate.center.x - candidate.width / 2, y: candidate.center.y - candidate.height / 2,
      width: candidate.width, height: candidate.height, angle: candidate.rotation as Radians, ...style });
  return { ...element, customData: { drawingboard: { provenance: {
    version: 1, points: samples.map((p) => [p.x - element.x, p.y - element.y]),
    baseWidth: element.width, baseHeight: element.height, strokeColor: style.strokeColor, strokeWidth: style.strokeWidth,
  } } } };
}
