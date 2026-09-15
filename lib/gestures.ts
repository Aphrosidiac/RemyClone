// Hand-gesture preference (module 14707): wanted in sessionStorage, supported = wide + camera.
const KEY = "rs-gestures";
let wanted = false;
try {
  wanted = sessionStorage.getItem(KEY) === "1";
} catch {}
const subs = new Set<() => void>();

export function gesturesSupported(): boolean {
  return window.matchMedia("(min-width: 901px)").matches && !!navigator.mediaDevices?.getUserMedia;
}
export const gesturesWanted = () => wanted;
export const getServerGestures = () => false;
export const isGesturesOn = () => wanted && gesturesSupported();
export function setGesturesOn(v: boolean): void {
  if (v === wanted) return;
  wanted = v;
  try {
    sessionStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  subs.forEach((f) => f());
}
export function subscribeGestures(f: () => void): () => void {
  subs.add(f);
  const mq = window.matchMedia("(min-width: 901px)");
  const onChange = () => f();
  mq.addEventListener("change", onChange);
  return () => {
    subs.delete(f);
    mq.removeEventListener("change", onChange);
  };
}
