// Page entrance choreography (module 12993): masked line reveals + chrome/block/foot fades,
// once per route per session, with a "hold" list for elements revealed later by the page.
import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";

export const ENTRANCE_DURATION = 0.9;
export const ENTRANCE_EASE = "power3.out";
export const HANDOFF = 0.6;
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** time at which an eased tween of `duration` has covered `fraction` of its distance */
function timeAtProgress(duration: number, fraction: number, ease: string | ((t: number) => number) = ENTRANCE_EASE): number {
  const fn = typeof ease === "function" ? ease : gsap.parseEase(ease);
  if (!fn) return duration * fraction;
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2;
    if (fn(m) < fraction) lo = m; else hi = m;
  }
  return ((lo + hi) / 2) * duration;
}
export const SOUND_AFTER_META_S = timeAtProgress(0.9, 0.8);
export function handoffAt(duration: number, ease: string = ENTRANCE_EASE): number {
  return timeAtProgress(duration, 0.6, ease);
}

/** cubic-bezier(.4,0,.15,1) as a GSAP ease function — the roll ease */
export function rollEase(x: number): number {
  const bz = (p1: number, p2: number, t: number) => {
    const r = 1 - t;
    return 3 * r * r * t * p1 + 3 * r * t * t * p2 + t * t * t;
  };
  let lo = 0, hi = 1;
  for (let i = 0; i < 8; i++) {
    const m = (lo + hi) / 2;
    if (bz(0.4, 0.15, m) < x) lo = m; else hi = m;
  }
  return bz(0, 1, (lo + hi) / 2);
}

const guards = new WeakMap<Element, () => void>();
const held = new WeakMap<Element, Set<Element>>();

/** foot elements added later (e.g. hand control re-mounts) must not sit at opacity 0 */
function guardFoot(root: HTMLElement) {
  guards.get(root)?.();
  const fix = (el: Element) => {
    if (!root.classList.contains("is-ready") || root.classList.contains("project-page")) return;
    if (held.get(root)?.has(el)) return;
    gsap.set(el, { opacity: 1, y: 0, yPercent: 0 });
  };
  const scan = (n: Node) => {
    if (!(n instanceof HTMLElement)) return;
    if (n.matches('[data-reveal="foot"]')) fix(n);
    n.querySelectorAll('[data-reveal="foot"]').forEach(fix);
  };
  scan(root);
  const mo = new MutationObserver((recs) => {
    for (const r of recs) r.addedNodes.forEach(scan);
  });
  mo.observe(root, { childList: true, subtree: true });
  const co = new MutationObserver(() => {
    root.querySelectorAll('[data-reveal="foot"]').forEach(fix);
  });
  co.observe(root, { attributes: true, attributeFilter: ["class"] });
  const off = () => {
    mo.disconnect();
    co.disconnect();
    guards.delete(root);
  };
  guards.set(root, off);
  return off;
}

export function claimFirstLanding(route: string): boolean {
  try {
    const k = `rs-entrance-${route}`;
    if (sessionStorage.getItem(k) === "1") return false;
    sessionStorage.setItem(k, "1");
    return true;
  } catch {
    return true;
  }
}
export function hasLandedBefore(route: string): boolean {
  try {
    return sessionStorage.getItem(`rs-entrance-${route}`) === "1";
  } catch {
    return false;
  }
}
export function isIrisNavPending(route: string): boolean {
  try {
    const v = sessionStorage.getItem("iris-nav");
    if (!v) return false;
    if (v === route) return true;
    if (route === "/") return new URL(v, window.location.origin).pathname === "/";
    return false;
  } catch {
    return false;
  }
}

export interface EntranceOptions {
  animate?: boolean;
  animateChrome?: boolean;
  animateLines?: boolean;
  /** selector of elements to leave hidden until `revealHeld` */
  hold?: string;
}

export function playPageEntrance(root: HTMLElement, opts: EntranceOptions = {}): gsap.core.Timeline | null {
  const chrome = opts.animateChrome !== false;
  const lines = opts.animateLines !== false;
  const animate = opts.animate !== false;
  root.classList.add("is-ready");
  const lineEls = root.querySelectorAll<HTMLElement>(".studio-line, [data-reveal='line']");
  const chromeEls = root.querySelectorAll<HTMLElement>("[data-reveal='chrome']");
  const blockEls = root.querySelectorAll<HTMLElement>("[data-reveal='block']");
  const footEls = root.querySelectorAll<HTMLElement>("[data-reveal='foot']");
  const holdEls = opts.hold ? [...root.querySelectorAll<HTMLElement>(opts.hold)] : [];
  held.set(root, new Set(holdEls));
  const notHeld = (list: NodeListOf<HTMLElement>) => (holdEls.length ? [...list].filter((e) => !holdEls.includes(e)) : [...list]);
  if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set([...lineEls, ...chromeEls, ...blockEls, ...footEls], { opacity: 1, y: 0, yPercent: 0 });
    guardFoot(root);
    return null;
  }
  if (chrome && chromeEls.length) gsap.set(chromeEls, { opacity: 0, y: 28 });
  else if (chromeEls.length) gsap.set(chromeEls, { clearProps: "transform", opacity: 1, y: 0 });
  if (lineEls.length) gsap.set(lineEls, { yPercent: lines ? 110 : 0 });
  if (blockEls.length || footEls.length) gsap.set([...blockEls, ...footEls], { opacity: 0, y: 28 });
  const tl = gsap.timeline({ defaults: { ease: ENTRANCE_EASE, duration: ENTRANCE_DURATION } });
  const l = notHeld(lineEls), c = notHeld(chromeEls), b = notHeld(blockEls), f = notHeld(footEls);
  if (lines && l.length) tl.to(l, { yPercent: 0 }, 0);
  if (chrome && c.length) tl.to(c, { opacity: 1, y: 0 }, 0);
  if (b.length) tl.to(b, { opacity: 1, y: 0 }, 0);
  if (f.length) tl.to(f, { opacity: 1, y: 0 }, 0);
  guardFoot(root);
  return tl;
}

export function revealHeld(root: HTMLElement, selector: string): void {
  const els = root.querySelectorAll<HTMLElement>(selector);
  if (!els.length) return;
  const set = held.get(root);
  if (set) for (const e of els) set.delete(e);
  const lines = [...els].filter((e) => e.matches("[data-reveal='line'], .studio-line"));
  const rest = [...els].filter((e) => !e.matches("[data-reveal='line'], .studio-line"));
  if (lines.length) gsap.to(lines, { yPercent: 0, y: 0, duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE });
  if (rest.length) gsap.to(rest, { opacity: 1, y: 0, yPercent: 0, duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE });
}

export function rollLines(els: HTMLElement[], dir: "in" | "out"): gsap.core.Tween {
  return dir === "in"
    ? gsap.fromTo(els, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 0.45, ease: rollEase })
    : gsap.to(els, { yPercent: -110, y: 0, duration: 0.45, ease: rollEase });
}

/** two frames after mount, tell the iris the new page has painted */
export function usePageReady(href: string, ready = true): void {
  useEffect(() => {
    if (!ready) return;
    let b = 0;
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("iris-page-ready", { detail: { href } }));
      });
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [href, ready]);
}
