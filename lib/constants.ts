// Gallery constants — measured from the reference bundle (module 21307).
const CELL_W_FRAC = 587.67 / 1728; // slider cell width as a fraction of a 1728px viewport
const CELL_ASPECT = 876.58 / 587.67; // cell height / width

export const COMPACT_BP = 760;
export const DRAG_GAIN = 2.2;
export const FILTER_ENTER_S = 1.6;
export const FLICK_COMMIT_CELLS = 0.1;
export const HAND_GAIN = 1.45;
export const INACTIVE_OPACITY = 0.5;
export const INACTIVE_SAT = 0;
export const INTRO_HOLD_MS = 250;
export const MOBILE_DRAG_BP = 760;
export const MOBILE_DRAG_GAIN = 2.6;
export const PARALLAX_DOM_PCT = 40;
export const PARALLAX_MAX = 0.12;
export const PARALLAX_UV_SCALE = 0.88;
export const SLIDER_CELL_RATIO = 758 / 1116;
export const TICKS_PER_GROUP = 7;
export const TICK_PITCH = 100;
export const TICK_W = 1;
export const VIEW_EASE = "power2.inOut";
export const VIEW_MOVE_S = 1.6;
export const VIEW_ZOOM = 0.75;

/** in-out sextic — the view morph ease */
export function VIEW_MOVE_EASE(t: number): number {
  return t < 0.5 ? 32 * Math.pow(t, 6) : 1 - Math.pow(-2 * t + 2, 6) / 2;
}

/** grid build: rows further from the centre start later and travel from off-screen */
export function bandOffset(t: number, band: number, travel: number, _dir: "in" | "out" = "in"): number {
  if (band === 0) return 0;
  const u = (t - 0.08 * (Math.abs(band) - 1)) / 1.6;
  return Math.sign(band) * travel * (1 - VIEW_MOVE_EASE(Math.max(0, Math.min(1, u))));
}

export function bandedDuration(bands: number, _dir: "in" | "out" = "in"): number {
  return 1.6 + 0.08 * Math.max(0, (bands - 1) / 2 - 1);
}

/** exponential follow: fraction of the remaining distance covered in dtMs */
export function easeFactor(dtMs: number): number {
  return 1 - Math.exp(-((dtMs / 1000) * 7));
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const t = el.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
}

export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

export function parallaxNorm(v: number, half: number): number {
  return Math.max(-1, Math.min(1, half > 0 ? v / half : 0));
}

export function poolSlots(n: number): number[] {
  const h = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => i - h);
}

export function tickRowWidth(pitch: number): number {
  return (6 * pitch) / 7 + 1;
}

export function tickScale(vw: number = window.innerWidth): number {
  return Math.max(0.7, Math.min(1.15, vw / 1728));
}

/** odd pool size big enough to cover `span` world units at `cell` pitch, plus one each side */
export function tilePool(span: number, cell: number, min = 5): number {
  const n = Math.ceil(span / Math.max(1e-6, cell)) + 2;
  return Math.max(min, n % 2 === 0 ? n + 1 : n);
}

export function tileWorldSize(visibleW: number, visibleH: number, lensScale: number): { w: number; h: number } {
  const h = Math.min(CELL_W_FRAC * visibleW * lensScale * 1.15 * CELL_ASPECT, 0.72 * visibleH * lensScale);
  return { w: h / CELL_ASPECT, h };
}
