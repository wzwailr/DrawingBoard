// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { recognize } from '../../src/renderer/ink/recognizer';
import { createStrokeElement } from '../../src/renderer/editor/stroke-element';
import type { StrokeSample } from '../../src/shared/contracts';
import { readFileSync } from 'node:fs';
const samples = (pairs: number[][]): StrokeSample[] => pairs.map(([x, y], i) => ({ x, y, timeMs: i * 10 }));

describe('real pinned engine classification and stroke conversion', () => {
  const rectangle: StrokeSample[] = JSON.parse(readFileSync('tests/fixtures/strokes/rough-rectangle.json', 'utf8')).samples;
  it('recognizes a rough rectangle at its original position and proportions', () => {
    const candidate = recognize(rectangle);
    expect(candidate).toMatchObject({ kind: 'rectangle', center: { x: 160, y: 140 }, width: 124, height: 80 });
    const element = createStrokeElement(rectangle, candidate);
    expect(element).toMatchObject({ type: 'rectangle', x: 98, y: 100, width: 124, height: 80 });
    expect(element.customData?.drawingboard.provenance.points).toHaveLength(5);
  });
  it('recognizes an ellipse without forcing it into a circle', () => {
    const ellipse = samples(Array.from({ length: 65 }, (_, i) => [200 + 90 * Math.cos(i / 64 * 2 * Math.PI), 160 + 40 * Math.sin(i / 64 * 2 * Math.PI)]));
    expect(recognize(ellipse)).toMatchObject({ kind: 'ellipse', width: 180, height: 80 });
  });
  it('keeps unrecognized and very small gestures as ink', () => {
    expect(recognize(samples([[0,0],[100,100],[0,200],[100,300],[0,400]]))).toBeNull();
    expect(recognize(samples([[10,10],[11,11],[10,10]]))).toBeNull();
    expect(recognize(samples([[10,10],[10,10],[10,10]]))).toBeNull();
    const raw = createStrokeElement(rectangle, null);
    expect(raw.type).toBe('freedraw');
    expect('points' in raw && raw.points).toHaveLength(5);
    expect(raw.customData?.drawingboard).toBeUndefined();
  });
  it('recognizes a line but creates no arrow head or binding by itself', () => {
    const line = samples([[20,20],[60,22],[100,21],[160,20]]);
    const candidate = recognize(line); expect(candidate?.kind).toBe('line');
    expect(createStrokeElement(line, candidate)).toMatchObject({ startBinding: null, endBinding: null, endArrowhead: null });
  });
});
