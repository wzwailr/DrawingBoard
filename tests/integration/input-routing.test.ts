import { expect, test } from 'vitest';
import { hitTest, type HitElement } from '../../src/renderer/input/hit-policy';
const box: HitElement = { id: 'box', type: 'rectangle', x: 100, y: 100, width: 200, height: 100, angle: 0 };
for (const zoom of [.5, 1, 2, 4]) {
  test(`inside_draws_border_moves at zoom ${zoom}`, () => {
    expect(hitTest([box], { x: 200, y: 150 }, zoom).kind).toBe('blank');
    expect(hitTest([box], { x: 100 - 4 / zoom, y: 150 }, zoom).kind).toBe('border');
    expect(hitTest([box], { x: 100 - 9 / zoom, y: 150 }, zoom).kind).toBe('blank');
    expect(hitTest([box], { x: 300 + 4 / zoom, y: 200 + 4 / zoom }, zoom, { box: true }).kind).toBe('handle');
  });
}
test('ellipse uses actual outline, rotated outline and frontmost solid text are respected', () => {
  const ellipse = { ...box, type: 'ellipse' };
  expect(hitTest([ellipse], { x: 100, y: 100 }, 1).kind).toBe('blank');
  expect(hitTest([ellipse], { x: 100, y: 150 }, 1).kind).toBe('border');
  expect(hitTest([{ ...box, angle: Math.PI / 2 }], { x: 150, y: 150 }, 1).kind).toBe('border');
  expect(hitTest([box, { ...box, id: 'text', type: 'text' }], { x: 200, y: 150 }, 1)).toMatchObject({ kind: 'content', element: { id: 'text' } });
});
