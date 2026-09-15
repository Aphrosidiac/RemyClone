"use client";
// Project route (module 70879 default): wires the sheet to the iris / slide navigation,
// keyboard, back button, and hand gestures.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import gsap from "gsap";
import Detail, { type DetailHandle } from "./Detail";
import { readCursorHit, type GestureCursorHandle } from "./GestureCursor";
import type { HandControlHandle } from "./HandControl";
import { SLIDE_TYPE, claimSlideArrival, useIris } from "./IrisProvider";
import { projectPath, useProjects, type Project } from "@/lib/projects";
import { isIrisNavPending, useIsoLayoutEffect, usePageReady } from "@/lib/entrance";
import { gesturesSupported, getServerGestures, isGesturesOn, subscribeGestures } from "@/lib/gestures";
import { galleryHomeHref, setPendingGalleryFilter, subFilterLabels } from "@/lib/galleryFilter";
import { isSoundEnabled, playShutter, playTick, setSoundEnabled } from "@/lib/sound";
import { createHandInertia } from "@/lib/handInertia";
import { DRAG_GAIN, HAND_GAIN, isTypingTarget } from "@/lib/constants";
import { ABOUT_HREF, NAV_SITE } from "@/lib/site";

const HandControl = dynamic(() => import("./HandControl"), { ssr: false });
const GestureCursor = dynamic(() => import("./GestureCursor"), { ssr: false });

export default function ProjectPage({ project, next, works }: { project: Project; next: Project | null; works: number }) {
  const href = projectPath(project);
  const projects = useProjects();
  const filters = subFilterLabels(projects);
  const root = useRef<HTMLDivElement>(null);
  const { navigateWithIris, navigateWithSlide, navigateWithSlideBack } = useIris();
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(false);
  const gesturesOn = useSyncExternalStore(subscribeGestures, isGesturesOn, getServerGestures);
  const gesturesOk = useSyncExternalStore(subscribeGestures, gesturesSupported, getServerGestures);
  const [irisNav, setIrisNav] = useState(() => (typeof window !== "undefined" ? isIrisNavPending(href) : false));
  const [arrivedBySlide] = useState(() => (typeof window !== "undefined" ? claimSlideArrival(href) : false));
  const leaving = useRef(false);
  const sliding = useRef(false);
  const sheet = useRef<DetailHandle>(null);
  const hand = useRef<HandControlHandle>(null);
  const cursor = useRef<GestureCursorHandle>(null);
  const hover = useRef<HTMLElement | null>(null);
  const overCell = useRef(false);
  const overVideo = useRef(false);
  const videoEl = useRef<HTMLElement | null>(null);
  const isMotion = project.type === "motion";
  const handLast = useRef<{ x: number; y: number; clenched: boolean } | null>(null);
  const inertia = useRef<ReturnType<typeof createHandInertia> | null>(null);
  inertia.current ??= createHandInertia({ apply: (dx) => sheet.current?.dragBy(dx), settle: () => sheet.current?.settle() });
  useEffect(() => () => inertia.current?.dispose(), []);

  const aim = useCallback(
    (x: number, y: number, clenched: boolean) => {
      const c = cursor.current;
      if (!c) return;
      hand.current?.aimHint(x, y, !clenched);
      c.move(x, y);
      const { under, preview, interactable } = readCursorHit(x, y);
      const t = clenched ? null : interactable;
      hover.current = t;
      if (preview && !clenched) {
        c.set({ visible: false, clenched: false, pointing: false, caption: false, hint: "" });
        overCell.current = false;
        overVideo.current = false;
        videoEl.current = null;
        return;
      }
      overCell.current = !t && !!under?.closest(".detail-cell:not(.detail-next)");
      const onVideo = !t && !!under?.closest(".detail-video");
      const paused = !!document.querySelector(".detail.is-paused");
      overVideo.current = isMotion && onVideo;
      videoEl.current = overVideo.current ? (under?.closest(".detail-video") as HTMLElement | null) : null;
      const zoomable = !isMotion && !t && (overCell.current || !!sheet.current?.isZoomed());
      const hint = t ? "pinch to click" : overVideo.current ? (paused ? "pinch to play" : "pinch to pause") : zoomable ? "pinch to zoom" : "";
      c.set({ visible: true, clenched, pointing: !!t, arrow: !t && !clenched, caption: false, hint });
    },
    [isMotion],
  );
  const onFrame = useCallback(
    (nx: number, ny: number, tracked: boolean, clenched: boolean) => {
      if (!tracked) {
        if (handLast.current?.clenched) inertia.current?.release();
        handLast.current = null;
        hover.current = null;
        return;
      }
      const x = gsap.utils.clamp(0, 1, (1 - nx - 0.5) * HAND_GAIN + 0.5) * window.innerWidth;
      const y = gsap.utils.clamp(0, 1, (ny - 0.5) * HAND_GAIN + 0.5) * window.innerHeight;
      aim(x, y, clenched);
      const last = handLast.current;
      if (clenched && !last?.clenched) inertia.current?.cancel();
      if (clenched && last?.clenched) {
        const dx = (x - last.x) * DRAG_GAIN;
        sheet.current?.dragBy(dx);
        inertia.current?.push(dx, 0);
      }
      if (!clenched && last?.clenched) inertia.current?.release();
      handLast.current = { x, y, clenched };
    },
    [aim],
  );
  const onPinch = useCallback(() => {
    const t = hover.current;
    if (t) {
      playTick();
      t.click();
      return;
    }
    const v = videoEl.current;
    if (v) {
      playTick();
      v.click();
      return;
    }
    const s = sheet.current;
    if (s && (s.isZoomed() || overCell.current)) {
      playTick();
      s.toggleZoom();
    }
  }, []);
  const onStatus = useCallback((on: boolean) => {
    if (!on) {
      handLast.current = null;
      hover.current = null;
      overVideo.current = false;
      videoEl.current = null;
      hand.current?.aimHint(0, 0, false);
      cursor.current?.set({ visible: false, clenched: false, pointing: false, hint: "" });
    }
  }, []);
  useEffect(() => {
    if (!gesturesOn) return;
    const f = (e: PointerEvent) => aim(e.clientX, e.clientY, false);
    window.addEventListener("pointermove", f);
    return () => window.removeEventListener("pointermove", f);
  }, [gesturesOn, aim]);
  useIsoLayoutEffect(() => {
    setSoundOn(isSoundEnabled());
    if (isIrisNavPending(href)) setIrisNav(true);
  }, [href]);
  const [mediaReady, setMediaReady] = useState(false);
  usePageReady(href, mediaReady);

  const goHome = useCallback(
    (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (leaving.current) return;
      leaving.current = true;
      playShutter();
      navigateWithIris("/", () => {
        leaving.current = false;
      });
    },
    [navigateWithIris],
  );
  const goHomeFilter = useCallback(
    (f: "stills" | "motion", e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setPendingGalleryFilter(f);
      if (leaving.current) return;
      leaving.current = true;
      playShutter();
      navigateWithIris(galleryHomeHref(f), () => {
        leaving.current = false;
      });
    },
    [navigateWithIris],
  );
  const goAbout = useCallback(
    (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (leaving.current) return;
      leaving.current = true;
      playShutter();
      navigateWithIris(ABOUT_HREF, () => {
        leaving.current = false;
      });
    },
    [navigateWithIris],
  );
  const openNext = useCallback(() => {
    if (!next || leaving.current || sliding.current) return;
    if (typeof document !== "undefined" && document.getAnimations().some((a) => ((a.effect as KeyframeEffect | null)?.pseudoElement ?? "").startsWith("::view-transition"))) return;
    sliding.current = true;
    navigateWithSlide(projectPath(next), SLIDE_TYPE);
  }, [navigateWithSlide, next]);

  useEffect(() => {
    sliding.current = false;
  }, [href]);
  useEffect(() => {
    if (next) router.prefetch(projectPath(next));
  }, [router, next]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") return void goHome();
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || leaving.current || sliding.current) return;
      if (e.key === "Enter") {
        if (isMotion) return;
        e.preventDefault();
        sheet.current?.toggleZoom();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        sheet.current?.stepBy(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        sheet.current?.stepBy(-1);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [goHome, isMotion]);
  // links home go through the iris; back/forward between projects slide
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || !root.current?.contains(a)) return;
      const u = new URL(a.href, window.location.href);
      if (u.origin !== window.location.origin || u.pathname !== "/" || u.hash) return;
      e.preventDefault();
      e.stopPropagation();
      const f = a.dataset.galleryFilter ?? u.searchParams.get("filter");
      if (f === "stills" || f === "motion") {
        setPendingGalleryFilter(f);
        if (leaving.current) return;
        leaving.current = true;
        playShutter();
        navigateWithIris(galleryHomeHref(f), () => {
          leaving.current = false;
        });
        return;
      }
      goHome();
    };
    const onPopCapture = (e: PopStateEvent) => {
      const p = window.location.pathname;
      if (!p.startsWith("/project/") || p === href || sliding.current) return;
      e.stopImmediatePropagation();
      sliding.current = true;
      navigateWithSlideBack(p);
    };
    const onPop = () => {
      const p = window.location.pathname;
      if (p.startsWith("/project/") && p !== href) return;
      if (p === "/" || p === "") {
        window.history.pushState({ project: href }, "", href);
        goHome();
        return;
      }
      if (p === new URL(href, window.location.origin).pathname) window.history.back();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopCapture, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopCapture, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [goHome, href, navigateWithIris, navigateWithSlideBack]);

  const toggleSound = useCallback(() => {
    const on = !soundOn;
    setSoundOn(on);
    setSoundEnabled(on);
    playTick();
  }, [soundOn]);

  return (
    <div className={`project-page${irisNav ? " is-iris-nav" : ""}${gesturesOn ? " gestures-on" : ""}`} ref={root}>
      <Detail
        ref={sheet}
        project={project}
        next={next}
        href={href}
        works={works}
        homeFilters={filters}
        navLinks={NAV_SITE}
        soundOn={soundOn}
        gesturesOn={gesturesOn}
        arrivedBySlide={arrivedBySlide}
        arrivedByIris={irisNav}
        onClose={goHome}
        onToggleSound={toggleSound}
        onToggleGestures={gesturesOk ? () => hand.current?.toggle() : undefined}
        onOpenNext={openNext}
        onMediaReady={() => setMediaReady(true)}
        onHome={goHome}
        onHomeFilter={goHomeFilter}
        onAbout={goAbout}
      />
      {gesturesOk && <HandControl ref={hand} onFrame={onFrame} onPinch={onPinch} onStatus={onStatus} onSecondClench={() => {}} onSquareGesture={() => {}} />}
      {gesturesOk && <GestureCursor ref={cursor} />}
    </div>
  );
}
