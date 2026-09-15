// Momentum for hand drags (module 29740): velocity EMA on push, exponential decay on release.
import gsap from "gsap";

export function createHandInertia({ apply, settle, guard }: { apply: (dx: number, dy: number) => void; settle: () => void; guard?: () => boolean }) {
  let vx = 0, vy = 0, lastT = 0, samples = 0, running = false;
  const reset = () => {
    vx = 0; vy = 0; lastT = 0; samples = 0;
  };
  const tick = (_t: number, dtMs: number) => {
    if (guard && !guard()) return stop();
    const dt = Math.min(0.1, dtMs / 1000);
    apply(vx * dt, vy * dt);
    const k = Math.exp(-dt / 0.34);
    vx *= k; vy *= k;
    if (Math.hypot(vx, vy) < 40) {
      stop();
      settle();
    }
  };
  function stop() {
    if (running) {
      gsap.ticker.remove(tick);
      running = false;
    }
    reset();
  }
  return {
    push(dx: number, dy: number) {
      if (running) stop();
      const now = performance.now();
      const dt = lastT ? (now - lastT) / 1000 : 0;
      lastT = now;
      if (dt <= 0) return;
      if (dt > 0.14) {
        reset();
        lastT = now;
        return;
      }
      vx += (dx / dt - vx) * 0.35;
      vy += (dy / dt - vy) * 0.35;
      samples++;
    },
    release() {
      if ((lastT && (performance.now() - lastT) / 1000 > 0.14) || samples < 3 || Math.hypot(vx, vy) < 90) {
        stop();
        settle();
        return;
      }
      if (!running) {
        running = true;
        gsap.ticker.add(tick);
      }
    },
    cancel: stop,
    dispose: stop,
  };
}
