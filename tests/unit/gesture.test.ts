import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGesture, type Clock, type GestureEffect } from '../../src/renderer/ink/gesture';
import type { Candidate, StrokeSample } from '../../src/shared/contracts';

const config = { holdMs: 500, jitterDip: 3, motionResetDip: 3 };
const rect: Candidate = { kind: 'rectangle', center: { x: 60, y: 50 }, width: 100, height: 60, rotation: 0 };
const pt = (x: number, y: number): StrokeSample => ({ x, y, timeMs: Date.now() });
const clock: Clock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) };
function setup(candidate: Candidate | null = rect) {
  const effects: GestureEffect[] = [];
  const pen = createGesture(config, clock, () => candidate);
  pen.onEffect((effect) => effects.push(effect));
  const draw = () => { pen.down(1, pt(10, 20), { x: 0, y: 0, zoom: 1 }); pen.move(1, pt(110, 20)); pen.move(1, pt(110, 80)); pen.move(1, pt(10, 80)); pen.move(1, pt(10, 20)); };
  return { pen, effects, draw };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('intent controlled single stroke', () => {
  it('release_before_hold_keeps_ink with original ordered samples', () => {
    const { pen, effects, draw } = setup(); draw(); vi.advanceTimersByTime(499); pen.up(1, pt(10, 20));
    expect(effects.filter((e) => e.type === 'commitInk')).toHaveLength(1);
    expect(effects.some((e) => e.type === 'commitShape')).toBe(false);
    const ink = effects.find((e) => e.type === 'commitInk');
    expect(ink?.samples.map(({ x, y }) => [x, y])).toEqual([[10,20],[110,20],[110,80],[10,80],[10,20]]);
  });
  it('hold_without_new_move_previews but changes no document until release', () => {
    const { pen, effects, draw } = setup(); draw(); vi.advanceTimersByTime(500);
    expect(effects.at(-1)).toMatchObject({ type: 'preview', candidate: rect });
    expect(effects.some((e) => e.type.startsWith('commit'))).toBe(false);
    pen.up(1, pt(10, 20));
    expect(effects.filter((e) => e.type === 'commitShape')).toHaveLength(1);
  });
  it('continued_motion_resets_timer even during a long slow stroke', () => {
    const { pen, effects } = setup(); pen.down(1, pt(0, 0), { x: 0, y: 0, zoom: 1 });
    for (let i = 1; i <= 30; i++) { vi.advanceTimersByTime(100); pen.move(1, pt(i * 2, 0)); }
    expect(effects.some((e) => e.type === 'preview' && e.candidate)).toBe(false);
    pen.up(1, pt(60, 0)); expect(effects.filter((e) => e.type === 'commitInk')).toHaveLength(1);
  });
  it('four_strokes_never_merge', () => {
    const { pen, effects, draw } = setup();
    for (let i = 0; i < 4; i++) { draw(); pen.up(1, pt(10, 20)); }
    expect(effects.filter((e) => e.type === 'commitInk')).toHaveLength(4);
    expect(new Set(effects.filter((e) => e.type === 'commitInk').map((e) => e.strokeToken)).size).toBe(4);
  });
  it('stale_timer_cannot_commit_next_stroke or leak after disposal', () => {
    const { pen, effects, draw } = setup(); draw(); pen.up(1, pt(10, 20));
    vi.advanceTimersByTime(400); pen.down(2, pt(400, 400), { x: 0, y: 0, zoom: 1 });
    vi.advanceTimersByTime(100); expect(effects.some((e) => e.type === 'preview' && e.candidate)).toBe(false);
    pen.dispose(); const previous = effects.length; vi.advanceTimersByTime(1000); expect(effects).toHaveLength(previous);
  });
  it('unknown_keeps_ink when released after a failed recognition', () => {
    const { pen, effects, draw } = setup(null); draw(); vi.advanceTimersByTime(1200); pen.up(1, pt(10, 20));
    expect(effects.filter((e) => e.type === 'commitInk')).toHaveLength(1);
    expect(effects.some((e) => e.type === 'commitShape')).toBe(false);
  });
  it('moving_again_cancels_preview and allows another hold in the same stroke', () => {
    const { pen, effects, draw } = setup(); draw(); vi.advanceTimersByTime(500);
    pen.move(1, pt(20, 20)); expect(effects.at(-1)).toMatchObject({ type: 'preview', candidate: null });
    vi.advanceTimersByTime(500); expect(effects.at(-1)).toMatchObject({ type: 'preview', candidate: rect });
    pen.up(1, pt(20, 20)); expect(effects.filter((e) => e.type === 'commitShape')).toHaveLength(1);
  });
  it('capture_lost_keeps_raw_ink and ignores late pointer up', () => {
    const { pen, effects, draw } = setup(); draw(); vi.advanceTimersByTime(500); pen.cancel('capture-lost'); pen.up(1, pt(10, 20));
    expect(effects.filter((e) => e.type === 'commitInk')).toHaveLength(1);
    expect(effects.some((e) => e.type === 'commitShape')).toBe(false);
  });
  it('clicks_do_not_leave_ink_dots before double click text entry', () => {
    const { pen, effects } = setup(); pen.down(1, pt(4, 5), { x: 0, y: 0, zoom: 1 }); pen.up(1, pt(4, 5));
    expect(effects.some((e) => e.type.startsWith('commit'))).toBe(false);
  });
  it('secondary_pointer_cannot_finish_the_active_stroke', () => {
    const { pen, effects, draw } = setup(); draw(); pen.up(2, pt(10, 20));
    expect(effects.some((e) => e.type.startsWith('commit'))).toBe(false);
    pen.up(1, pt(10, 20)); expect(effects.filter((e) => e.type === 'commitInk')).toHaveLength(1);
  });
  it('a_long_stroke_is_committed_without_exceeding_the_javascript_argument_limit', () => {
    const { pen, effects } = setup(null);
    pen.down(1, pt(0, 0), { x: 0, y: 0, zoom: 1 });
    for (let i = 1; i <= 140_000; i++) pen.move(1, pt(i, i % 10));
    pen.up(1, pt(140_000, 0));
    expect(effects.find((e) => e.type === 'commitInk')?.samples).toHaveLength(140_001);
  });
});
