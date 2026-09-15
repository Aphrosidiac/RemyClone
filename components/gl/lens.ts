// Fisheye projection maths shared by the GLSL pass and the DOM overlay (module 67929).
import { lensAmount } from "@/lib/lens";

export const FISHEYE_CAM_Z = 10;
export const FISHEYE_FOV = 48;
export const FISHEYE_ZOOM = 0.72;

/** mirror-sphere radius in px */
export function lensRadiusPx(w: number, h: number): number {
  return 0.86 * Math.hypot(w, h);
}
/** perspective focal length in px for a viewport height */
export function focalPx(h: number, fov = FISHEYE_FOV): number {
  return h / (2 * Math.tan(((fov * Math.PI) / 180) / 2));
}
export function lensCellScale(): number {
  return 1 + 1.35 * lensAmount();
}
export function visibleSize(aspect: number, z = FISHEYE_CAM_Z, fov = FISHEYE_FOV) {
  const h = 2 * Math.tan(((fov * Math.PI) / 180) / 2) * z;
  return { visibleW: h * aspect, visibleH: h };
}

function screenRadius(theta: number, w: number, h: number, amount = lensAmount()): number {
  if (amount <= 0) return focalPx(h) * Math.tan(theta);
  const curved = lensRadiusPx(w, h) * Math.sin(theta / 2);
  if (amount >= 1) return curved;
  const straight = focalPx(h) * Math.tan(theta);
  return straight + (curved - straight) * amount;
}

function project(x: number, y: number, w: number, h: number, z: number) {
  const d = Math.hypot(x, y);
  if (d < 1e-6) return { x: w / 2, y: h / 2 };
  const r = screenRadius(Math.atan(d / z), w, h);
  return { x: w / 2 + (r * x) / d, y: h / 2 - (r * y) / d };
}

/** world-space rect (centre cx,cy size cw,ch at z=0) → screen rect in px */
export function worldRectToScreen(cx: number, cy: number, cw: number, ch: number, w: number, h: number, z = FISHEYE_CAM_Z) {
  const c = project(cx, cy, w, h, z);
  const r = project(cx + cw / 2, cy, w, h, z);
  const l = project(cx - cw / 2, cy, w, h, z);
  const t = project(cx, cy + ch / 2, w, h, z);
  const b = project(cx, cy - ch / 2, w, h, z);
  const sw = Math.hypot(r.x - l.x, r.y - l.y);
  const sh = Math.hypot(t.x - b.x, t.y - b.y);
  return { x: c.x - sw / 2, y: c.y - sh / 2, w: sw, h: sh };
}
