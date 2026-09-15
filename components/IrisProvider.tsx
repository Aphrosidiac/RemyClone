"use client";
// Iris wipe between routes (module 88342): a radial mask closes (0.6s), the route changes,
// the new page reports `iris-page-ready`, the mask opens (0.8s). Project→project moves use
// the View Transitions API instead (slide types).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { HANDOFF } from "@/lib/entrance";

export const SLIDE_TYPE = "project-slide";
export const SLIDE_BACK_TYPE = "project-slide-back";
export const CROSS_TO_MOTION = "project-cross-motion";
export const CROSS_TO_STILLS = "project-cross-stills";

let slideArrival: string | null = null;
export function claimSlideArrival(href: string): boolean {
  if (slideArrival === href) {
    slideArrival = null;
    return true;
  }
  return false;
}

interface IrisApi {
  runIris: (mid: () => void, done?: () => void) => void;
  navigateWithIris: (href: string, done?: () => void) => void;
  navigateWithSlide: (href: string, type?: string) => void;
  navigateWithSlideBack: (href: string) => void;
}
const Ctx = createContext<IrisApi | null>(null);
const CLOSE_EASE = "power2.in";
const OPEN_EASE = "power2.out";

type RouterWithTypes = ReturnType<typeof useRouter> & {
  push: (href: string, opts?: { transitionTypes?: string[] }) => void;
  replace: (href: string, opts?: { transitionTypes?: string[] }) => void;
};

export default function IrisProvider({ children }: { children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null);
  const router = useRouter() as RouterWithTypes;
  const busy = useRef(false);
  const tl = useRef<gsap.core.Timeline | null>(null);

  const show = useCallback(() => {
    const el = layer.current;
    if (el) {
      el.style.display = "block";
      document.documentElement.classList.add("is-iris-active");
    }
  }, []);
  const hide = useCallback(() => {
    const el = layer.current;
    if (el) el.style.display = "none";
    document.documentElement.classList.remove("is-iris-active");
  }, []);
  useEffect(() => () => document.documentElement.classList.remove("is-iris-active"), []);

  const paint = (el: HTMLElement, r: number) => {
    el.style.background = `radial-gradient(circle at 50% 50%, rgba(17,17,17,0) ${Math.max(0, r - 45)}%, rgba(17,17,17,0.7) ${Math.max(0, r - 18)}%, #111111 ${r}%)`;
  };

  const runIris = useCallback(
    (mid: () => void, done?: () => void) => {
      const el = layer.current;
      if (!el) {
        mid();
        done?.();
        return;
      }
      tl.current?.kill();
      const s = { r: 165 };
      const upd = () => paint(el, s.r);
      upd();
      show();
      tl.current = gsap
        .timeline({
          onComplete: () => {
            hide();
            tl.current = null;
            done?.();
          },
        })
        .to(s, { r: 0, duration: 0.6, ease: CLOSE_EASE, onUpdate: upd })
        .add(mid)
        .to(s, { r: 165, duration: 0.8, ease: OPEN_EASE, onUpdate: upd, delay: 0.12 });
    },
    [show, hide],
  );

  const navigateWithIris = useCallback(
    (href: string, done?: () => void) => {
      try {
        sessionStorage.setItem("iris-nav", href);
        if (new URL(href, window.location.origin).pathname === "/") sessionStorage.setItem("rs-entered", "1");
      } catch {}
      busy.current = true;
      const el = layer.current;
      const finish = () => {
        busy.current = false;
        done?.();
        window.dispatchEvent(new CustomEvent("iris-opened", { detail: { href } }));
        try {
          sessionStorage.removeItem("iris-nav");
        } catch {}
      };
      const go = () => {
        if (href === "/") router.replace(href);
        else router.push(href);
      };
      if (!el) {
        go();
        finish();
        return;
      }
      tl.current?.kill();
      const s = { r: 165 };
      const upd = () => paint(el, s.r);
      upd();
      show();
      let timer = 0;
      const open = () => {
        window.removeEventListener("iris-page-ready", onReady);
        window.clearTimeout(timer);
        window.dispatchEvent(new CustomEvent("iris-open-start", { detail: { href, duration: 0.8, delay: 0.08 } }));
        tl.current = gsap
          .timeline({
            onComplete: () => {
              hide();
              tl.current = null;
              finish();
            },
          })
          .to(s, { r: 165, duration: 0.8, ease: OPEN_EASE, onUpdate: upd, delay: 0.08 })
          .call(
            () => {
              window.dispatchEvent(new CustomEvent("iris-opening", { detail: { href } }));
            },
            undefined,
            0.88 * HANDOFF,
          );
      };
      const onReady = (e: Event) => {
        if ((e as CustomEvent).detail?.href === href) open();
      };
      tl.current = gsap.timeline().to(s, {
        r: 0,
        duration: 0.6,
        ease: CLOSE_EASE,
        onUpdate: upd,
        onComplete: () => {
          go();
          window.addEventListener("iris-page-ready", onReady);
          timer = window.setTimeout(open, 2500);
        },
      });
    },
    [router, show, hide],
  );

  /** project→project: a native View Transition typed for the CSS keyframes; the old sheet is
   *  held on screen until the next page reports its media ready */
  const slide = useCallback(
    (href: string, type: string, replace: boolean) => {
      tl.current?.kill();
      tl.current = null;
      hide();
      slideArrival = href;
      const go = () => (replace ? router.replace(href, { transitionTypes: [type] }) : router.push(href, { transitionTypes: [type] }));
      const doc = document as Document & { startViewTransition?: (opts: { update: () => Promise<void>; types: string[] }) => { finished: Promise<void> } };
      if (typeof doc.startViewTransition !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        go();
        return;
      }
      doc.startViewTransition({
        types: [type],
        update: () =>
          new Promise<void>((resolve) => {
            let t = 0;
            const onReady = (e: Event) => {
              if ((e as CustomEvent).detail?.href !== href) return;
              window.removeEventListener("iris-page-ready", onReady);
              window.clearTimeout(t);
              resolve();
            };
            window.addEventListener("iris-page-ready", onReady);
            t = window.setTimeout(() => {
              window.removeEventListener("iris-page-ready", onReady);
              resolve();
            }, 2500);
            go();
          }),
      });
    },
    [router, hide],
  );
  const navigateWithSlide = useCallback((href: string, type: string = SLIDE_TYPE) => slide(href, type, false), [slide]);
  const navigateWithSlideBack = useCallback((href: string) => slide(href, SLIDE_BACK_TYPE, true), [slide]);

  const api = useMemo(() => ({ runIris, navigateWithIris, navigateWithSlide, navigateWithSlideBack }), [runIris, navigateWithIris, navigateWithSlide, navigateWithSlideBack]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="iris-layer" ref={layer} aria-hidden="true" />
    </Ctx.Provider>
  );
}

export function useIris(): IrisApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIris must be used within IrisProvider");
  return v;
}
