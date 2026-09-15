"use client";
// The red caret that slides to whichever nav item is hovered (module 55375).
import { useCallback, useRef } from "react";
import gsap from "gsap";
import { playTick } from "@/lib/sound";

type Axis = "x" | "y" | "xy";

export function useSlidingCaret(axis: Axis | (() => Axis), mode: "center" | "before" = "center") {
  const caret = useRef<HTMLSpanElement>(null);
  const current = useRef<HTMLElement | null>(null);
  const lastAxis = useRef<Axis | null>(null);
  const moveTo = useCallback(
    (target: HTMLElement | null, immediate = false) => {
      const c = caret.current;
      const parent = c?.parentElement;
      if (!target || !c || !parent) return;
      const ax = typeof axis === "function" ? axis() : axis;
      if (lastAxis.current && lastAxis.current !== ax && lastAxis.current !== "xy" && ax !== "xy") {
        gsap.set(c, { [lastAxis.current]: 0 });
      }
      lastAxis.current = ax;
      const pr = parent.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      const targetLeft = tr.left + (parseFloat(getComputedStyle(target).paddingLeft) || 0);
      const cr = c.getBoundingClientRect();
      const curX = Number(gsap.getProperty(c, "x")) || 0;
      const curY = Number(gsap.getProperty(c, "y")) || 0;
      const baseLeft = cr.left - pr.left - curX;
      const baseTop = cr.top - pr.top - curY;
      let prevRight = 0;
      if (mode === "before") {
        prevRight = [...parent.children]
          .flatMap((e) => (getComputedStyle(e).display === "contents" ? [...e.children] : [e]))
          .filter((e) => e !== c)
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.right <= targetLeft + 0.5)
          .reduce((m, r) => Math.max(m, r.right), pr.left);
      }
      const x =
        mode === "before"
          ? Math.max(prevRight + 4, targetLeft - 8 - cr.width) - pr.left - baseLeft
          : tr.left + tr.width / 2 - pr.left - baseLeft - cr.width / 2;
      const y = tr.top + tr.height / 2 - pr.top - baseTop - cr.height / 2;
      const to = ax === "xy" ? { x, y } : ax === "x" ? { x } : { y };
      if (immediate) {
        current.current = target;
        gsap.set(c, to);
        return;
      }
      if (current.current !== target) playTick();
      current.current = target;
      gsap.to(c, { ...to, duration: 0.35, ease: "power3.out", overwrite: "auto" });
    },
    [axis, mode],
  );
  return [caret, moveTo] as const;
}
