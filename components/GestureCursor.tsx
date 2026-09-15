"use client";
// The on-screen hand that follows a tracked hand or the mouse while gestures are on (module 69956).
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import gsap from "gsap";

export interface CursorState {
  visible: boolean;
  clenched: boolean;
  pointing: boolean;
  arrow?: boolean;
  caption?: boolean;
  hint: string;
}
export interface GestureCursorHandle {
  move: (x: number, y: number) => void;
  set: (s: CursorState) => void;
}

export function isOverHandPreview(x: number, y: number): boolean {
  if (document.elementFromPoint(x, y)?.closest(".hand-preview.is-visible")) return true;
  for (const el of document.querySelectorAll(".hand-preview.is-visible")) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}

export function readCursorHit(x: number, y: number) {
  const under = document.elementFromPoint(x, y);
  const preview = isOverHandPreview(x, y)
    ? ((under?.closest(".hand-preview.is-visible") ?? document.querySelector(".hand-preview.is-visible")) as HTMLElement | null)
    : null;
  if (preview) return { under, preview, interactable: preview };
  const interactable = (under?.closest("a, button") ?? null) as HTMLElement | null;
  return { under, preview: null, interactable };
}

export default function GestureCursor({ ref }: { ref: Ref<GestureCursorHandle> }) {
  const root = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const toX = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const toY = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const state = useRef<CursorState>({ visible: false, clenched: false, pointing: false, arrow: false, caption: false, hint: "" });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.set(el, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    toX.current = gsap.quickTo(el, "x", { duration: 0.25, ease: "power3.out" });
    toY.current = gsap.quickTo(el, "y", { duration: 0.25, ease: "power3.out" });
  }, []);

  useImperativeHandle(ref, () => ({
    move: (x, y) => {
      toX.current?.(x);
      toY.current?.(y);
    },
    set: (s) => {
      const el = root.current;
      if (!el) return;
      if (s.visible !== state.current.visible) gsap.to(el, { opacity: s.visible ? 1 : 0, duration: 0.25, ease: "power2.out" });
      el.classList.toggle("is-clenched", s.clenched);
      el.classList.toggle("is-pointing", s.pointing);
      el.classList.toggle("is-arrow", s.arrow ?? false);
      el.classList.toggle("is-caption", s.caption ?? false);
      if (hint.current && s.hint !== state.current.hint) hint.current.textContent = s.hint;
      state.current = { ...s, arrow: s.arrow ?? false, caption: s.caption ?? false };
    },
  }));

  return (
    <div className="gesture-cursor" ref={root} aria-hidden="true">
      <img className="cursor-hand cursor-hand-open" src="/icons/hand-open.svg" alt="" />
      <img className="cursor-hand cursor-hand-closed" src="/icons/hand-closed.svg" alt="" />
      <img className="cursor-hand cursor-hand-point" src="/icons/hand-point.svg" alt="" />
      <img className="cursor-hand cursor-arrow" src="/icons/cursor-arrow.svg" alt="" />
      <span className="cursor-hint" ref={hint}></span>
    </div>
  );
}
