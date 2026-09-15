// Fisheye lens state (module 28184). `amount` is the live 0..1 blend, `on` the persisted toggle.
import { VIEW_MOVE_S } from "./constants";

const KEY = "rs-fisheye";
export const LENS_MORPH_S = VIEW_MOVE_S;

let on = false;
try {
  on = sessionStorage.getItem(KEY) === "1";
} catch {}
let amount = on ? 1 : 0;
const subs = new Set<() => void>();

export function setLensAmount(a: number): void {
  const v = a < 0 ? 0 : a > 1 ? 1 : a;
  if (v === amount) return;
  const wasLive = amount > 0;
  amount = v;
  if (wasLive !== v > 0) subs.forEach((f) => f());
}

export function setFisheyeOn(v: boolean): void {
  if (v === on) return;
  on = v;
  try {
    sessionStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  subs.forEach((f) => f());
}

export const getServerLens = () => false;
export const isFisheyeOn = () => on;
export const isLensLive = () => amount > 0;
export const lensAmount = () => amount;
export function snapLens(v: boolean): void {
  setFisheyeOn(v);
  setLensAmount(v ? 1 : 0);
}
export function subscribeLens(f: () => void): () => void {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}
