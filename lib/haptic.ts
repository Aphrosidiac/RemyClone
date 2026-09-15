// navigator.vibrate(8) on real taps only (needs a prior user gesture), 30ms debounce.
let last = 0;
let armed = false;
if (typeof window !== "undefined") {
  const arm = () => {
    armed = true;
  };
  for (const ev of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(ev, arm, { once: true, capture: true, passive: true });
  }
}

export function tapHaptic(): void {
  if (!armed) return;
  const nav = navigator as Navigator & { vibrate?: (p: number) => boolean };
  if (typeof nav.vibrate !== "function") return;
  const now = performance.now();
  if (now - last < 30) return;
  last = now;
  try {
    nav.vibrate(8);
  } catch {}
}
