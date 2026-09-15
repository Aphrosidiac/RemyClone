"use client";
// Two-face label that rolls up on hover (desktop) or on tap (compact) — module 67037.
import type { ReactNode } from "react";

const COMPACT = "(max-width: 760px)";

export default function Roll({ children, to }: { children: ReactNode; to?: ReactNode }) {
  return (
    <span className="roll">
      <span className="roll-inner">
        <span className="roll-face">{children}</span>
        <span className="roll-face" aria-hidden="true">
          {to ?? children}
        </span>
      </span>
    </span>
  );
}

/** play one roll on a control (compact only unless forced); onMid fires at the top of the roll */
export function playRoll(el: HTMLElement | null, opts?: { force?: boolean; onMid?: () => void }): void {
  if (!el || (!opts?.force && !window.matchMedia(COMPACT).matches)) return;
  const inner = el.querySelector<HTMLElement>(".roll-inner");
  if (!inner) return;
  window.clearTimeout(Number(el.dataset.rollTimer));
  el.classList.add("is-rolling");
  const t = window.setTimeout(() => {
    opts?.onMid?.();
    inner.style.transition = "none";
    el.classList.remove("is-rolling");
    void inner.offsetWidth;
    inner.style.transition = "";
    delete el.dataset.rollTimer;
  }, 450);
  el.dataset.rollTimer = String(t);
}

/** roll every label inside `root` out (up) or in (from below), 40ms stagger */
export function playRollAll(root: HTMLElement | null, dir: "in" | "out", opts?: { force?: boolean }): Promise<void> {
  if (!root || (!opts?.force && dir === "out" && !window.matchMedia(COMPACT).matches)) return Promise.resolve();
  const inners = [...root.querySelectorAll<HTMLElement>(".roll-inner")];
  if (!inners.length) return Promise.resolve();
  root.classList.add("is-hand-animating");
  window.clearTimeout(Number(root.dataset.rollTimer));
  const total = 450 + (inners.length - 1) * 40;
  if (dir === "out") {
    inners.forEach((e, i) => {
      e.style.transition = "";
      e.style.transitionDelay = `${40 * i}ms`;
      e.style.transform = "translateY(-100%)";
    });
  } else {
    inners.forEach((e) => {
      e.style.transition = "none";
      e.style.transitionDelay = "";
      e.style.transform = "translateY(110%)";
    });
    void inners[0]?.offsetWidth;
    inners.forEach((e, i) => {
      e.style.transition = "";
      e.style.transitionDelay = `${40 * i}ms`;
      e.style.transform = "translateY(0)";
    });
  }
  return new Promise((resolve) => {
    const t = window.setTimeout(() => {
      inners.forEach((e) => {
        e.style.transition = "none";
        e.style.transitionDelay = "";
        e.style.transform = "";
      });
      void inners[0]?.offsetWidth;
      inners.forEach((e) => {
        e.style.transition = "";
      });
      root.classList.remove("is-hand-animating");
      delete root.dataset.rollTimer;
      resolve();
    }, total);
    root.dataset.rollTimer = String(t);
  });
}
