import type { Candidate, StrokeSample, Viewport } from '../../shared/contracts';

export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export interface GestureConfig { holdMs: number; jitterDip: number; motionResetDip: number }
export type GestureEffect =
  | { type: 'preview'; strokeToken: string; candidate: Candidate | null }
  | { type: 'commitInk'; strokeToken: string; samples: readonly StrokeSample[] }
  | { type: 'commitShape'; strokeToken: string; samples: readonly StrokeSample[]; candidate: Candidate };
type Recognizer = (samples: readonly StrokeSample[], zoom: number) => Candidate | null;
type ActiveStroke = {
  pointerId: number; token: string; samples: StrokeSample[]; viewport: Viewport;
  anchor: StrokeSample; accumulatedDip: number; generation: number;
  timer?: unknown; candidate: Candidate | null;
};

export function createGesture(config: GestureConfig, clock: Clock, recognize: Recognizer) {
  if (config.holdMs <= 0 || config.jitterDip < 0 || config.motionResetDip <= 0) throw new Error('Invalid gesture configuration');
  const listeners = new Set<(effect: GestureEffect) => void>();
  let active: ActiveStroke | null = null;
  let sequence = 0;
  let disposed = false;
  const valid = (sample: StrokeSample) => Number.isFinite(sample.x) && Number.isFinite(sample.y) && Number.isFinite(sample.timeMs);
  function emit(effect: GestureEffect) { for (const listener of [...listeners]) listener(effect); }
  function clearTimer(stroke: ActiveStroke) {
    stroke.generation++;
    if (stroke.timer !== undefined) clock.clearTimeout(stroke.timer);
    stroke.timer = undefined;
  }
  function schedule(stroke: ActiveStroke) {
    clearTimer(stroke);
    const generation = stroke.generation;
    stroke.timer = clock.setTimeout(() => {
      if (disposed || active !== stroke || stroke.generation !== generation) return;
      stroke.timer = undefined;
      const candidate = recognize(stroke.samples.map((s) => ({ ...s })), stroke.viewport.zoom);
      if (active !== stroke || disposed || stroke.generation !== generation) return;
      if (candidate) {
        stroke.candidate = structuredClone(candidate);
        emit({ type: 'preview', strokeToken: stroke.token, candidate: structuredClone(candidate) });
      }
    }, config.holdMs);
  }
  function move(pointerId: number, sample: StrokeSample) {
    const stroke = active;
    if (!stroke || stroke.pointerId !== pointerId || !valid(sample)) return;
    const last = stroke.samples[stroke.samples.length - 1];
    if (sample.timeMs < last.timeMs) return;
    const distance = Math.hypot(sample.x - last.x, sample.y - last.y) * stroke.viewport.zoom;
    if (distance === 0) return;
    stroke.samples.push({ ...sample });
    stroke.accumulatedDip += distance;
    const fromAnchor = Math.hypot(sample.x - stroke.anchor.x, sample.y - stroke.anchor.y) * stroke.viewport.zoom;
    if (fromAnchor > config.jitterDip || stroke.accumulatedDip >= config.motionResetDip) {
      if (stroke.candidate) { stroke.candidate = null; emit({ type: 'preview', strokeToken: stroke.token, candidate: null }); }
      stroke.anchor = { ...sample };
      stroke.accumulatedDip = 0;
      schedule(stroke);
    } else if (stroke.timer === undefined && !stroke.candidate) {
      schedule(stroke);
    }
  }
  function finish(asInk: boolean) {
    const stroke = active;
    if (!stroke) return;
    active = null;
    clearTimer(stroke);
    if (stroke.candidate) emit({ type: 'preview', strokeToken: stroke.token, candidate: null });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of stroke.samples) {
      minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);
    }
    const spread = Math.max(maxX - minX, maxY - minY) * stroke.viewport.zoom;
    if (spread < 3) return; // A click/double click is not a stroke.
    const samples = stroke.samples.map((s) => ({ ...s }));
    if (!asInk && stroke.candidate) emit({ type: 'commitShape', strokeToken: stroke.token, samples, candidate: stroke.candidate });
    else emit({ type: 'commitInk', strokeToken: stroke.token, samples });
  }
  return {
    down(pointerId: number, sample: StrokeSample, viewport: Viewport) {
      if (disposed || active || !valid(sample) || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return;
      active = { pointerId, token: `stroke-${++sequence}`, samples: [{ ...sample }], viewport: { ...viewport },
        anchor: { ...sample }, accumulatedDip: 0, generation: 0, candidate: null };
      schedule(active);
    },
    move,
    up(pointerId: number, sample: StrokeSample) {
      if (!active || active.pointerId !== pointerId) return;
      move(pointerId, sample);
      finish(false);
    },
    cancel(_reason: 'escape' | 'blur' | 'capture-lost' | 'hide') { finish(true); },
    onEffect(listener: (effect: GestureEffect) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSamples(): readonly StrokeSample[] { return active?.samples ?? []; },
    isDrawing() { return active !== null; },
    dispose() { if (active) clearTimer(active); active = null; disposed = true; listeners.clear(); },
  };
}
export type GestureController = ReturnType<typeof createGesture>;
