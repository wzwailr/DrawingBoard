// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { newElement, newArrowElement } from '@excalidraw/element';
import { pointFrom, type LocalPoint } from '@excalidraw/math';
import { attachLine } from '../../src/renderer/editor/connection-policy';
const a = newElement({ type: 'rectangle', x: 100, y: 100, width: 100, height: 100 });
const b = newElement({ type: 'rectangle', x: 400, y: 100, width: 100, height: 100 });
const line = (endX = 390) => newArrowElement({ type: 'arrow', x: 210, y: 150, width: endX - 210, height: 0,
  points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(endX - 210, 0)], startArrowhead: null, endArrowhead: null, elbowed: false });
test('both_bound_adds_directional_arrow and reciprocal references', () => {
  const result = attachLine(line(), [a, b], 1);
  expect(result.arrow.startBinding?.elementId).toBe(a.id);
  expect(result.arrow.endBinding?.elementId).toBe(b.id);
  expect(result.arrow.endArrowhead).toBe('arrow');
  expect(result.elements.every((e) => e.boundElements?.some((r) => r.id === result.arrow.id))).toBe(true);
});
test('empty_endpoint_creates_no_node and a single bound end has no arrow', () => {
  const result = attachLine(line(330), [a, b], 1);
  expect(result.elements).toHaveLength(2);
  expect(result.arrow.startBinding?.elementId).toBe(a.id);
  expect(result.arrow.endBinding).toBeNull();
  expect(result.arrow.endArrowhead).toBeNull();
});
test('same-node endpoints do not create an automatic self loop', () => {
  const result = attachLine(line(210), [a], 1);
  expect(result.arrow.startBinding && result.arrow.endBinding).toBeFalsy();
});
