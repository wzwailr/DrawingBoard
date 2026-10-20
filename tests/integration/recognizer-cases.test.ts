// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { recognize } from '../../src/renderer/ink/recognizer';
import type { StrokeSample } from '../../src/shared/contracts';
const fixture = JSON.parse(readFileSync('tests/fixtures/strokes/classifier-cases.json', 'utf8'));
const pairs = (values: number[][]): StrokeSample[] => values.map(([x,y], i) => ({ x, y, timeMs: i*10 }));
const ellipse = (w: number, h: number) => pairs(Array.from({ length: 129 }, (_, i) => [300 + w/2*Math.cos(i*2*Math.PI/128), 200 + h/2*Math.sin(i*2*Math.PI/128)]));
const polygon = (vertices: number[][]) => pairs([...vertices.flatMap((p, edge) => Array.from({ length: 32 }, (_, i) => {
  const q = vertices[(edge+1)%vertices.length]; return [p[0]+(q[0]-p[0])*i/32, p[1]+(q[1]-p[1])*i/32];
})), vertices[0]]);
test('circle_maps_to_ellipse', () => {
  const found = recognize(ellipse(200,200));
  expect(found).toMatchObject({ kind: 'ellipse', width: 200, height: 200, center: { x: 300, y: 200 } });
});
for (const [w,h] of fixture.ellipse.sizes.slice(1,4)) test(`elongated_ellipse_preserves_aspect ${w}x${h}`, () => {
  const found = recognize(ellipse(w,h));
  expect(found?.kind).toBe('ellipse');
  if (!found || found.kind === 'line') throw new Error('Missing ellipse');
  expect(found.width).toBeCloseTo(w, 1); expect(found.height).toBeCloseTo(h, 1);
  expect(found.width / found.height).toBeCloseTo(w/h, 2);
});
test('reverse_line_preserves_direction', () => {
  const line = fixture.reverseLine;
  const found = recognize(pairs(Array.from({ length: line.segments+1 }, (_, i) => [line.start[0]+line.step[0]*i,line.start[1]+line.step[1]*i])));
  expect(found).toEqual({ kind: 'line', start: { x: 400, y: 300 }, end: { x: 144, y: 172 } });
});
test('unsupported_candidate_never_becomes_polygon', () => {
  expect(recognize(polygon(fixture.diamond.vertices))).toBeNull();
});
test('rectangle baseline and explicit small-circle rejection boundary', () => {
  expect(recognize(polygon(fixture.rectangle.vertices))).toMatchObject({ kind: 'rectangle', width: 300, height: 160 });
  // Characterize scale policy without borrowing the GazBoard classifier's world-size gate.
  expect(recognize(ellipse(12,12))).toBeNull();
});
