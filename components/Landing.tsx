"use client";
// The landing page orchestrator (module 63909): loader → gallery views, filters, meta slots,
// view morphs, fisheye/sound toggles, hand gestures, booth, iris navigation to projects.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import { flushSync } from "react-dom";
import gsap from "gsap";
import HapticSwitch from "./HapticSwitch";
import Roll, { playRoll } from "./Roll";
import TrustedLogos from "./TrustedLogos";
import Loader from "./Loader";
import GestureTutorial from "./GestureTutorial";
import { useSlidingCaret } from "./useSlidingCaret";
import { useIris } from "./IrisProvider";
import { readCursorHit, type GestureCursorHandle } from "./GestureCursor";
import type { HandControlHandle } from "./HandControl";
import type { BoothHandle } from "./Booth";
import type { SliderHandle } from "./gl/SliderView";
import type { GridHandle } from "./gl/GridView";
import type { ListHandle } from "./gl/ListView";
import { projectPath, typeMeta, useProjects, type Project } from "@/lib/projects";
import * as C from "@/lib/constants";
import { claimFirstLanding, HANDOFF, hasLandedBefore, isIrisNavPending, playPageEntrance, revealHeld, rollLines, SOUND_AFTER_META_S, useIsoLayoutEffect, usePageReady } from "@/lib/entrance";
import { getServerLens, isFisheyeOn, lensAmount, LENS_MORPH_S, setFisheyeOn, setLensAmount, snapLens, subscribeLens } from "@/lib/lens";
import { gesturesSupported, getServerGestures, isGesturesOn, subscribeGestures } from "@/lib/gestures";
import { isSoundEnabled, playShutter, playTick, setSoundEnabled } from "@/lib/sound";
import { tapHaptic } from "@/lib/haptic";
import { clearPendingGalleryFilter, resolvePendingNavFilter, scrubGalleryFilterFromUrl, type Filter } from "@/lib/galleryFilter";
import { createHandInertia } from "@/lib/handInertia";
import { requestMotionPreview, stopMotionPreview, tickMotionPreview } from "./gl/motionPreview";
import { ABOUT_HREF, LOGO_MARK, NAV_SITE, TAGLINE } from "@/lib/site";

// the stages are lazy; a set() before they mount is expected, not a defect
gsap.config({ nullTargetWarn: false });

const SliderView = dynamic(() => import("./gl/SliderView"), { ssr: false });
const GridView = dynamic(() => import("./gl/GridView"), { ssr: false });
const ListView = dynamic(() => import("./gl/ListView"), { ssr: false });
const HandControl = dynamic(() => import("./HandControl"), { ssr: false });
const GestureCursor = dynamic(() => import("./GestureCursor"), { ssr: false });
const Booth = dynamic(() => import("./Booth"), { ssr: false });

type View = "slider" | "grid" | "list";
const VIEWS: View[] = ["slider", "grid", "list"];

function Line({ children }: { children: React.ReactNode }) {
  return (
    <span className="reveal-mask">
      <span data-reveal="line">
        <Roll>{children}</Roll>
      </span>
    </span>
  );
}
function filterItems(f: Filter, projects: Project[]): number[] {
  return f === "works" ? projects.map((_, i) => i) : projects.flatMap((p, i) => (p.type === f ? [i] : []));
}
const stage = (sel: string) => `${sel} .stage`;
/** swap which stage is visible after `delay` seconds */
function handoffStage(from: string, to: string, delay: number, then?: () => void) {
  const run = () => {
    then?.();
    gsap.set(stage(to), { opacity: 1 });
    gsap.set(stage(from), { opacity: 0 });
  };
  if (delay <= 0) run();
  else gsap.delayedCall(delay, run);
}
const CHROME_HIT = "button, a, .mobile-menu, .loader, .chrome, .view-toggle, .sound-toggle, .hand-control, .trusted, .menu-btn, .gesture-cursor, .gesture-tutorial, .gesture-tutorial-scrim, .booth-close, .booth-frame-wrap, .booth-download, .booth-countdown";

export default function Landing() {
  const projects = useProjects();
  const stills = projects.filter((p) => p.type === "stills").length;
  const motion = projects.filter((p) => p.type === "motion").length;
  const filters: { label: string; filter: Filter }[] = [
    { label: `works(${projects.length})`, filter: "works" },
    { label: `stills(${stills})`, filter: "stills" },
    { label: `motion(${motion})`, filter: "motion" },
  ];
  const navLinks = NAV_SITE;
  const contact = navLinks[navLinks.length - 1];
  const comma = TAGLINE.indexOf(",");
  const [tag1, tag2] = comma > 0 ? [TAGLINE.slice(0, comma + 1), TAGLINE.slice(comma + 1).trim()] : [TAGLINE, ""];

  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<GridHandle>(null);
  const slider = useRef<SliderHandle>(null);
  const list = useRef<ListHandle>(null);
  const cursor = useRef<GestureCursorHandle>(null);
  const hand = useRef<HandControlHandle>(null);
  const booth = useRef<BoothHandle>(null);
  const [boothOpen, setBoothOpen] = useState(false);
  const { navigateWithIris, runIris } = useIris();

  const [view, setView] = useState<View>("slider");
  const [chromeView, setChromeView] = useState<View>("slider");
  const [morphFrom, setMorphFrom] = useState<View | null>(null);
  const [morphTo, setMorphTo] = useState<View | null>(null);
  const [mounted, setMounted] = useState<Set<View>>(() => new Set());
  const irisPending = useRef(false);
  const entranceDone = useRef(false);
  const [entered, setEntered] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [irisNav, setIrisNav] = useState(false);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const [filter, setFilterState] = useState<Filter>("works");
  const filterRef = useRef<Filter>("works");
  const [menuOpen, setMenuOpen] = useState(false);
  const tap = useRef<{ x: number; y: number; t: number } | null>(null);
  const gesturesOn = useSyncExternalStore(subscribeGestures, isGesturesOn, getServerGestures);
  const gesturesOk = useSyncExternalStore(subscribeGestures, gesturesSupported, getServerGestures);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const fisheye = useSyncExternalStore(subscribeLens, isFisheyeOn, getServerLens);

  const viewRef = useRef<View>("slider");
  const items = useRef<number[]>(filterItems("works", projects));
  const locked = useRef(false);
  const handLast = useRef<{ x: number; y: number; clenched: boolean } | null>(null);
  const hoverTarget = useRef<HTMLElement | null>(null);
  const overCentre = useRef(false);
  const cursorSource = useRef<"hand" | "mouse">("hand");
  const mousePos = useRef<{ x: number; y: number } | null>(null);
  const handPos = useRef<{ x: number; y: number } | null>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const menuEl = useRef<HTMLDivElement>(null);
  const metaIndex = useRef<HTMLParagraphElement>(null);
  const metaName = useRef<HTMLParagraphElement>(null);
  const metaType = useRef<HTMLParagraphElement>(null);
  const metaTag = useRef<HTMLParagraphElement>(null);
  const filterEls = useRef<Record<string, HTMLElement>>({});
  const toggleEls = useRef<Record<string, HTMLElement>>({});
  const [navCaret, moveNavCaret] = useSlidingCaret("xy", "before");
  const [toggleCaret, moveToggleCaret] = useSlidingCaret("x");

  const viewHandle = useCallback((v: View) => (v === "grid" ? grid.current : v === "slider" ? slider.current : list.current), []);
  const inertia = useRef<ReturnType<typeof createHandInertia> | null>(null);
  inertia.current ??= createHandInertia({
    apply: (dx, dy) => {
      const v = viewRef.current;
      if (v === "grid") grid.current?.dragBy(dx, dy);
      else if (v === "slider") slider.current?.dragBy(dx);
      else list.current?.dragBy(dy);
    },
    settle: () => viewHandle(viewRef.current)?.settle(),
    guard: () => !locked.current && !booth.current?.isActive(),
  });
  useEffect(() => () => inertia.current?.dispose(), []);
  const activeProject = useCallback(() => viewHandle(viewRef.current)?.activeProject() ?? items.current[0], [viewHandle]);

  // returning within the session, or arriving through the iris: skip the loader
  useIsoLayoutEffect(() => {
    try {
      const f = resolvePendingNavFilter();
      if (f) {
        filterRef.current = f;
        items.current = filterItems(f, projects);
        setFilterState(f);
      }
      if (isIrisNavPending("/")) {
        irisPending.current = true;
        setIrisNav(true);
        setEntered(true);
        setLoaderGone(true);
        setMounted(new Set(["slider"]));
        return;
      }
      if (sessionStorage.getItem("rs-entered") === "1") {
        setEntered(true);
        setLoaderGone(true);
        setMounted(new Set(["slider"]));
      }
    } catch {}
  }, [projects]);
  usePageReady("/");
  useIsoLayoutEffect(() => {
    root.current?.style.setProperty("--lens-amount", isFisheyeOn() ? "1" : "0");
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const f = () => {
      setCompact(mq.matches);
      if (mq.matches) {
        setView("slider");
        viewRef.current = "slider";
        setMounted((m) => (m.size === 0 ? m : new Set(["slider"])));
      }
    };
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const applyPendingFilter = useCallback(() => {
    const f = resolvePendingNavFilter();
    if (!f) {
      clearPendingGalleryFilter();
      scrubGalleryFilterFromUrl();
      return true;
    }
    if (!slider.current) return false;
    clearPendingGalleryFilter();
    scrubGalleryFilterFromUrl();
    filterRef.current = f;
    const it = filterItems(f, projects);
    items.current = it;
    const animate = !irisPending.current;
    grid.current?.setItems(it, animate);
    slider.current.setItems(it, animate && viewRef.current === "slider");
    list.current?.setItems(it, animate && viewRef.current === "list");
    setFilterState(f);
    moveNavCaret(filterEls.current[f] ?? null, true);
    return true;
  }, [projects, moveNavCaret]);
  const applyPendingRef = useRef(applyPendingFilter);
  applyPendingRef.current = applyPendingFilter;

  // the entrance: wait for the slider to mount, then play the intro + chrome reveal
  useEffect(() => {
    if (!entered || !root.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.set(stage(":is(.grid-view, .slider-view, .list-view)"), { opacity: 1 });
    const run = (animateChrome: boolean, firstVisit: boolean) => {
      if (entranceDone.current || !root.current) return;
      const t0 = performance.now();
      const poll = () => {
        if (!(slider.current || performance.now() - t0 > 2500)) return void requestAnimationFrame(poll);
        if (entranceDone.current || !root.current) return;
        entranceDone.current = true;
        setReady(true);
        const first = claimFirstLanding("/");
        const withIntro = firstVisit && first && !reduced;
        if (withIntro) slider.current?.introPark();
        else slider.current?.intro(false);
        applyPendingRef.current();
        const isCompact = window.matchMedia(`(max-width: ${C.COMPACT_BP}px)`).matches;
        const dialSel = ".dial-name";
        const soundSel = ".sound-toggle [data-reveal='line']";
        const tl = playPageEntrance(root.current, {
          animate: first && !reduced,
          animateChrome: animateChrome && !reduced,
          hold: isCompact ? `${dialSel}, ${soundSel}` : undefined,
        });
        const revealCompact = () => {
          if (isCompact && root.current) {
            revealHeld(root.current, dialSel);
            gsap.delayedCall(SOUND_AFTER_META_S, () => {
              if (root.current) revealHeld(root.current, soundSel);
            });
          }
        };
        if (withIntro) {
          if (tl) tl.call(() => slider.current?.intro(true, revealCompact), undefined, Math.max(0, tl.duration() * HANDOFF - C.INTRO_HOLD_MS / 1000));
          else slider.current?.intro(true, revealCompact);
        } else revealCompact();
      };
      requestAnimationFrame(poll);
    };
    if (irisPending.current) {
      if (hasLandedBefore("/")) return void run(false, false);
      const onOpening = (e: Event) => {
        if ((e as CustomEvent).detail?.href === "/") run(false, false);
      };
      window.addEventListener("iris-opening", onOpening);
      const t = window.setTimeout(() => run(false, false), 1800);
      return () => {
        window.removeEventListener("iris-opening", onOpening);
        window.clearTimeout(t);
      };
    }
    run(true, true);
  }, [entered]);

  const openProject = useCallback(
    (i: number) => {
      const p = projects[i];
      if (!p?.slug || locked.current) return;
      locked.current = true;
      tapHaptic();
      playShutter();
      navigateWithIris(projectPath(p), () => {
        locked.current = false;
      });
    },
    [navigateWithIris, projects],
  );
  const goAbout = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      if (locked.current) return;
      locked.current = true;
      tapHaptic();
      playShutter();
      navigateWithIris(ABOUT_HREF, () => {
        locked.current = false;
      });
    },
    [navigateWithIris],
  );

  // keyboard: enter opens, arrows step
  useEffect(() => {
    if (!entered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || C.isTypingTarget(e.target) || locked.current || menuOpen) return;
      if (e.key === "Enter") {
        e.preventDefault();
        openProject(activeProject());
        return;
      }
      const v = viewRef.current;
      const step: Record<string, (() => void) | undefined> =
        v === "slider"
          ? { ArrowRight: () => slider.current?.stepBy(1), ArrowLeft: () => slider.current?.stepBy(-1) }
          : v === "list"
            ? { ArrowDown: () => list.current?.stepBy(1), ArrowUp: () => list.current?.stepBy(-1) }
            : { ArrowRight: () => grid.current?.stepBy(1, 0), ArrowLeft: () => grid.current?.stepBy(-1, 0), ArrowDown: () => grid.current?.stepBy(0, 1), ArrowUp: () => grid.current?.stepBy(0, -1) };
      const fn = step[e.key];
      const moved = !!fn;
      fn?.();
      if (moved) {
        e.preventDefault();
        playTick();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, menuOpen, openProject, activeProject]);

  // a clean tap on the stage opens the centre project
  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    tap.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  }, []);
  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const t = tap.current;
      tap.current = null;
      if (!t || !entered || locked.current || menuOpen) return;
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 6 || performance.now() - t.t > 400) return;
      if ((e.target as HTMLElement).closest(CHROME_HIT)) return;
      openProject(activeProject());
    },
    [entered, menuOpen, openProject, activeProject],
  );

  const onEnter = useCallback((withSound: boolean) => {
    setSoundOn(withSound);
    setSoundEnabled(withSound);
    setMounted(new Set(["slider"]));
    setEntered(true);
    try {
      sessionStorage.setItem("rs-entered", "1");
    } catch {}
  }, []);
  const openMenu = useCallback(() => {
    setMenuOpen(true);
    const b = menuBtn.current, m = menuEl.current;
    if (b && m) {
      gsap.killTweensOf([b, m]);
      gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power2.out" });
    }
  }, []);
  const closeMenu = useCallback(() => {
    const b = menuBtn.current, m = menuEl.current;
    if (b && m) {
      gsap.killTweensOf([b, m]);
      gsap.to(m, { opacity: 0, duration: 0.14, ease: "power2.in", onComplete: () => setMenuOpen(false) });
    } else setMenuOpen(false);
  }, []);

  // meta slots + motion preview follow the centre tile
  useEffect(() => {
    if (!entered) return;
    let last = "";
    const tick = () => {
      const it = items.current;
      const i = activeProject();
      const p = projects[i];
      const inSet = it.includes(i);
      requestMotionPreview(i, inSet && p?.type === "motion" ? p.video : undefined, p?.previewStart);
      tickMotionPreview();
      if (!p) return;
      const pos = Math.max(0, it.indexOf(i));
      const key = `${i}:${pos}:${it.length}`;
      if (key !== last) {
        last = key;
        if (metaIndex.current) metaIndex.current.textContent = `${String(pos + 1).padStart(2, "0")}.`;
        if (metaName.current) metaName.current.textContent = p.name;
        if (metaType.current) metaType.current.textContent = typeMeta(p);
        if (metaTag.current) metaTag.current.textContent = p.tag;
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      stopMotionPreview();
    };
  }, [entered, projects, activeProject]);

  const lensTween = useRef<gsap.core.Tween | null>(null);
  const toggleFisheye = useCallback(() => {
    const on = !isFisheyeOn();
    lensTween.current?.kill();
    setFisheyeOn(on);
    const to = on ? 1 : 0;
    const from = lensAmount();
    if (from === to) return;
    const o = { a: from };
    lensTween.current = gsap.to(o, {
      a: to,
      duration: LENS_MORPH_S * Math.abs(to - from),
      ease: C.VIEW_MOVE_EASE,
      onUpdate: () => {
        setLensAmount(o.a);
        root.current?.style.setProperty("--lens-amount", `${o.a}`);
      },
      onComplete: () => {
        snapLens(on);
        root.current?.style.setProperty("--lens-amount", on ? "1" : "0");
        lensTween.current = null;
      },
    });
  }, []);

  const metaEls = useCallback(() => [metaIndex, metaName, metaType, metaTag].map((r) => r.current).filter((e): e is HTMLParagraphElement => !!e), []);
  const metaShown = useRef(false);
  useEffect(() => {
    if (!entered) return;
    const show = chromeView !== "slider";
    if (show === metaShown.current) return;
    metaShown.current = show;
    const els = metaEls();
    if (els.length) rollLines(els, show ? "in" : "out");
  }, [chromeView, entered, metaEls]);
  useEffect(() => {
    if (morphFrom === null) gsap.set(stage(":is(.grid-view, .slider-view, .list-view)"), { opacity: 1 });
  }, [morphFrom]);
  useEffect(() => {
    moveToggleCaret(toggleEls.current[view] ?? null);
  }, [view, moveToggleCaret]);
  useEffect(() => {
    moveNavCaret(filterEls.current[filter] ?? null);
  }, [filter, moveNavCaret]);
  useEffect(() => {
    if (!entered) return;
    const place = () => {
      moveToggleCaret(toggleEls.current[viewRef.current] ?? null, true);
      moveNavCaret(filterEls.current[filterRef.current] ?? null, true);
    };
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
    };
  }, [entered, moveToggleCaret, moveNavCaret]);

  /** morph between views: mount the target, sync its centre, then animate the handoff */
  const switchView = useCallback(
    (next: View) => {
      if (locked.current || viewRef.current === next || (compact && next !== "slider")) return;
      const prev = viewRef.current;
      locked.current = true;
      setMounted((m) => {
        if (m.has(next)) return m;
        const s = new Set(m);
        s.add(next);
        return s;
      });
      const t0 = performance.now();
      const poll = () => {
        const to = viewHandle(next);
        const from = viewHandle(prev);
        const elapsed = performance.now() - t0;
        if (!to) {
          if (elapsed < 800) return void requestAnimationFrame(poll);
          setView(next);
          setChromeView(next);
          viewRef.current = next;
          locked.current = false;
          return;
        }
        if (!to.isReady() && elapsed < 8000) return void requestAnimationFrame(poll);
        const it = items.current;
        let dur = 0;
        if (next === "grid") {
          grid.current!.setItems(it, false);
          if (from) grid.current!.setCenterProject(from.activeProject());
          dur = grid.current!.buildIn(prev === "list" ? "list" : "slider", false);
        } else {
          if (next === "slider") slider.current!.setItems(it, false);
          else list.current!.setItems(it, false);
          const centre = prev === "grid" ? Math.max(0, it.indexOf(grid.current!.activeProject())) : Math.max(0, it.indexOf(from?.activeProject() ?? it[0]));
          to.setCenterProject(centre);
          if (next === "slider" && prev === "list") slider.current!.snapRot(1);
        }
        from?.setInteractive(false);
        to.setInteractive(false);
        const fromSel = `.${prev}-view`, toSel = `.${next}-view`;
        let committed = false;
        const commit = () => {
          if (committed) return;
          committed = true;
          flushSync(() => {
            setView(next);
            viewRef.current = next;
          });
        };
        flushSync(() => {
          setMorphFrom(prev);
          setMorphTo(next);
        });
        gsap.set(stage(fromSel), { opacity: 1 });
        gsap.set(stage(toSel), { opacity: 0 });
        to.renderNow();
        from?.settle();
        // a few warm-up renders so the first visible frame of the target is already laid out
        const warm = (n = 5) => {
          to.renderNow();
          if (n <= 1) {
            let done = false, guard = 0;
            const finish = () => {
              if (done) return;
              done = true;
              window.clearTimeout(guard);
              document.removeEventListener("visibilitychange", onVis);
              commit();
              gsap.killTweensOf([stage(fromSel), stage(toSel)]);
              gsap.set(stage(fromSel), { opacity: 0, clearProps: "transform" });
              gsap.set(stage(toSel), { opacity: 1, clearProps: "transform" });
              slider.current?.snapRot(0);
              setChromeView(next);
              setMorphFrom(null);
              setMorphTo(null);
              from?.setInteractive(true);
              to.setInteractive(true);
              locked.current = false;
            };
            const onVis = () => {
              if (document.hidden) finish();
            };
            let total: number;
            if (next === "grid") {
              handoffStage(fromSel, toSel, 0, () => {
                commit();
                grid.current!.buildIn(prev === "list" ? "list" : "slider", true);
              });
              total = dur;
            } else if (prev === "grid") {
              total = grid.current!.flyOut(next === "list" ? "list" : "slider");
              gsap.set(stage(toSel), { opacity: 0 });
              handoffStage(fromSel, toSel, total, commit);
            } else if (next === "list") {
              total = slider.current!.rotate("vertical");
              gsap.set(stage(toSel), { opacity: 0 });
            } else {
              handoffStage(fromSel, toSel, 0, commit);
              total = slider.current!.rotate("flat");
            }
            gsap.delayedCall(total, finish);
            guard = window.setTimeout(finish, 1000 * total + 600);
            document.addEventListener("visibilitychange", onVis);
            return;
          }
          requestAnimationFrame(() => warm(n - 1));
        };
        warm();
      };
      requestAnimationFrame(poll);
    },
    [viewHandle, compact],
  );

  const setFilter = useCallback(
    (f: Filter) => {
      if (filterRef.current === f || locked.current) return;
      filterRef.current = f;
      const it = filterItems(f, projects);
      items.current = it;
      grid.current?.setItems(it, true);
      slider.current?.setItems(it, viewRef.current === "slider");
      list.current?.setItems(it, viewRef.current === "list");
      const els = metaEls();
      if (els.length && metaShown.current) {
        gsap.killTweensOf(els);
        rollLines(els, "out");
        gsap.delayedCall(C.FILTER_ENTER_S / 2 + 0.06, () => rollLines(els, "in"));
      }
      setFilterState(f);
    },
    [projects, metaEls],
  );

  // a filter carried from another page is applied once the slider exists
  useEffect(() => {
    if (!entered) return;
    let stop = false;
    const t0 = performance.now();
    const poll = () => {
      if (stop || applyPendingFilter()) return;
      if (performance.now() - t0 > 8000) return void clearPendingGalleryFilter();
      requestAnimationFrame(poll);
    };
    poll();
    return () => {
      stop = true;
    };
  }, [entered, applyPendingFilter]);
  useEffect(() => {
    const f = (e: Event) => {
      if ((e as CustomEvent).detail?.href === "/") applyPendingFilter();
    };
    window.addEventListener("iris-opened", f);
    return () => window.removeEventListener("iris-opened", f);
  }, [applyPendingFilter]);

  const isOverCentre = useCallback(
    (x: number, y: number, el: Element | null) => {
      const r = viewHandle(viewRef.current)?.centerRect();
      if (!r || x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return false;
      return !!el?.closest(".booth-preview, .booth-countdown") || !!el?.closest(".grid-view, .slider-view, .list-view");
    },
    [viewHandle],
  );
  const onSquare = useCallback(() => {
    if (!locked.current) booth.current?.start();
  }, []);

  const cursorHint = (interactable: HTMLElement | null, boothActive: boolean) =>
    interactable ? "pinch to click" : overCentre.current ? "pinch to view" : boothActive ? "" : "grab to drag";

  // tracked hand → cursor, drag, hints
  const onHandFrame = useCallback(
    (nx: number, ny: number, tracked: boolean, clenched: boolean) => {
      const cur = cursor.current;
      if (!tracked) {
        if (handLast.current?.clenched) inertia.current?.release();
        handLast.current = null;
        handPos.current = null;
        hoverTarget.current = null;
        root.current?.classList.remove("is-grabbing");
        if (cursorSource.current !== "mouse") cur?.set({ visible: false, clenched: false, pointing: false, hint: "grab to drag" });
        return;
      }
      const w = window.innerWidth, h = window.innerHeight;
      const x = gsap.utils.clamp(0, 1, (1 - nx - 0.5) * C.HAND_GAIN + 0.5) * w;
      const y = gsap.utils.clamp(0, 1, (ny - 0.5) * C.HAND_GAIN + 0.5) * h;
      const prev = handPos.current;
      if (cursorSource.current === "mouse" && prev && Math.hypot(x - prev.x, y - prev.y) > 40) cursorSource.current = "hand";
      handPos.current = { x, y };
      const mouse = cursorSource.current === "mouse" && mousePos.current !== null;
      const px = mouse ? mousePos.current!.x : x;
      const py = mouse ? mousePos.current!.y : y;
      if (!mouse) cur?.move(x, y);
      root.current?.classList.toggle("is-grabbing", clenched);
      hand.current?.aimHint(px, py, !clenched);
      const { under, preview, interactable } = readCursorHit(px, py);
      const target = clenched ? null : interactable;
      hoverTarget.current = target;
      overCentre.current = !target && isOverCentre(px, py, under);
      const boothActive = !!booth.current?.isActive();
      if (preview && !clenched) cur?.set({ visible: false, clenched: false, pointing: false, caption: false, hint: "" });
      else
        cur?.set({
          visible: true,
          clenched,
          pointing: !!target,
          arrow: boothActive && !target && !overCentre.current,
          caption: false,
          hint: cursorHint(target, boothActive),
        });
      const last = handLast.current;
      if (clenched && !last?.clenched) inertia.current?.cancel();
      if (clenched && last?.clenched && !locked.current && !booth.current?.isActive()) {
        const dx = (x - last.x) * C.DRAG_GAIN;
        const dy = (y - last.y) * C.DRAG_GAIN;
        if (viewRef.current === "grid") grid.current?.dragBy(dx, dy);
        else if (viewRef.current === "slider") slider.current?.dragBy(dx);
        else list.current?.dragBy(dy);
        inertia.current?.push(dx, dy);
      }
      if (!clenched && last?.clenched) inertia.current?.release();
      if (clenched && !last?.clenched) playTick();
      handLast.current = { x, y, clenched };
    },
    [isOverCentre],
  );

  // while gestures are on the mouse can also drive the same cursor
  useEffect(() => {
    if (!gesturesOn || !gesturesOk) return;
    const onMove = (e: PointerEvent) => {
      cursorSource.current = "mouse";
      mousePos.current = { x: e.clientX, y: e.clientY };
      const cur = cursor.current;
      cur?.move(e.clientX, e.clientY);
      const clenched = handLast.current?.clenched ?? false;
      hand.current?.aimHint(e.clientX, e.clientY, !clenched);
      const { under, preview, interactable } = readCursorHit(e.clientX, e.clientY);
      const target = clenched ? null : interactable;
      hoverTarget.current = target;
      overCentre.current = !target && isOverCentre(e.clientX, e.clientY, under);
      const boothActive = !!booth.current?.isActive();
      if (preview && !clenched) cur?.set({ visible: false, clenched: false, pointing: false, caption: false, hint: "" });
      else cur?.set({ visible: true, clenched, pointing: !!target, arrow: boothActive && !target && !overCentre.current, caption: false, hint: cursorHint(target, boothActive) });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [gesturesOn, gesturesOk, isOverCentre]);

  // gestures supported but off: the cursor is a plain caption ("drag" / "view project")
  useEffect(() => {
    if (gesturesOn || !gesturesOk) return;
    const cur = cursor.current;
    const onMove = (e: PointerEvent) => {
      const c = cursor.current;
      if (!c) return;
      c.move(e.clientX, e.clientY);
      const under = document.elementFromPoint(e.clientX, e.clientY);
      let hint = "";
      if (entered && under && !under.closest("a, button, .loader, .mobile-menu, .iris-layer, .booth-close, .booth-frame-wrap, .booth-download, .booth-countdown") && (under.closest(".grid-view, .slider-view, .list-view") || booth.current?.isActive())) {
        const r = viewHandle(viewRef.current)?.centerRect();
        hint = r && e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h ? "view project" : "drag";
      }
      c.set({ visible: hint !== "", clenched: false, pointing: false, caption: true, hint });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cur?.set({ visible: false, clenched: false, pointing: false, caption: false, hint: "" });
    };
  }, [gesturesOn, gesturesOk, entered, viewHandle]);

  const onGestureStatus = useCallback((on: boolean) => {
    grid.current?.setGesturesActive(on);
    if (!on) {
      cursorSource.current = "hand";
      mousePos.current = null;
      handPos.current = null;
      handLast.current = null;
      hoverTarget.current = null;
      root.current?.classList.remove("is-grabbing");
      hand.current?.aimHint(0, 0, false);
      cursor.current?.set({ visible: false, clenched: false, pointing: false, hint: "grab to drag" });
    }
  }, []);
  const onPinch = useCallback(() => {
    const t = hoverTarget.current;
    if (t) {
      playTick();
      t.click();
      return;
    }
    if (overCentre.current && !locked.current) {
      playTick();
      openProject(activeProject());
    }
  }, [openProject, activeProject]);
  const onBoothClose = useCallback(() => {
    if (booth.current?.isActive()) {
      playShutter();
      runIris(() => {
        booth.current?.dismiss();
      });
    }
  }, [runIris]);
  const preloadGrid = () => void import("./gl/GridView");
  const preloadList = () => void import("./gl/ListView");
  const preloadSlider = () => void import("./gl/SliderView");
  const showsView = (v: View) => v === view || v === morphFrom || v === morphTo;

  return (
    <div
      className={`landing view-${view} chrome-${chromeView}${gesturesOn ? " gestures-on" : ""}${irisNav ? " is-iris-nav" : ""}${ready ? " is-ready" : ""}${menuOpen ? " is-menu-open" : ""}${morphFrom ? " is-morphing" : ""}${boothOpen ? " is-booth-open" : ""}`}
      ref={root}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {entered && !compact && mounted.has("grid") && <GridView ref={grid} hidden={!showsView("grid")} />}
      {entered && mounted.has("slider") && <SliderView ref={slider} hidden={!showsView("slider")} initialItems={items.current} />}
      {entered && !compact && mounted.has("list") && <ListView ref={list} hidden={!showsView("list")} />}
      <header className="chrome" data-reveal="chrome">
        <p className="logo">
          <Line>
            {LOGO_MARK}
            <sup>®</sup>
          </Line>
        </p>
        <p className="tagline">
          <Line>{tag1}</Line>
          {tag2 ? (
            <>
              <br />
              <Line>{tag2}</Line>
            </>
          ) : null}
        </p>
        <nav className="nav-right" aria-label="Primary" onMouseLeave={() => moveNavCaret(filterEls.current[filterRef.current] ?? null)}>
          <span className="nav-site-caret is-visible" ref={navCaret} aria-hidden="true" />
          <div className={`nav-filters${filter !== "works" ? " is-filtering" : ""}`} onMouseLeave={() => moveNavCaret(filterEls.current[filter] ?? null)}>
            <div className="nav-works-row">
              <a
                href="#works"
                className={filter === "works" ? "is-current" : ""}
                ref={(el) => {
                  if (el) filterEls.current.works = el;
                }}
                onMouseEnter={(e) => moveNavCaret(e.currentTarget)}
                onClick={(e) => {
                  e.preventDefault();
                  setFilter("works");
                }}
              >
                <HapticSwitch />
                <Line>{filters[0].label}</Line>
              </a>
            </div>
            <div className="nav-drop">
              {filters.slice(1).map((f) => (
                <a
                  key={f.filter}
                  href={`#${f.filter}`}
                  className={filter === f.filter ? "is-current" : ""}
                  ref={(el) => {
                    if (el) filterEls.current[f.filter] = el;
                  }}
                  onMouseEnter={(e) => moveNavCaret(e.currentTarget)}
                  onClick={(e) => {
                    e.preventDefault();
                    setFilter(f.filter);
                  }}
                >
                  <HapticSwitch />
                  <Line>{f.label}</Line>
                </a>
              ))}
            </div>
          </div>
          <div className="nav-site-group">
            {navLinks.slice(0, -1).map((l) => (
              <a key={l.label} href={l.href} onMouseEnter={(e) => moveNavCaret(e.currentTarget)} onClick={l.href === ABOUT_HREF ? goAbout : undefined}>
                <HapticSwitch />
                <Line>{l.label}</Line>
              </a>
            ))}
          </div>
          {contact && (
            <a className="nav-contact" href={contact.href} onMouseEnter={(e) => moveNavCaret(e.currentTarget)}>
              <HapticSwitch />
              <Line>{contact.label}</Line>
            </a>
          )}
        </nav>
      </header>
      {compact && (
        <>
          <button
            type="button"
            className="menu-btn"
            data-reveal="chrome"
            ref={menuBtn}
            aria-expanded={menuOpen}
            onClick={() => {
              tapHaptic();
              (menuOpen ? closeMenu : openMenu)();
            }}
          >
            <HapticSwitch />
            <span className="reveal-mask">
              <span data-reveal="line">
                <Roll to="close">menu</Roll>
              </span>
            </span>
          </button>
          <div
            className={`mobile-menu${menuOpen ? " is-open" : ""}`}
            ref={menuEl}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeMenu();
            }}
          >
            <nav className="menu-items" aria-label="Primary">
              {filters.map((f) => (
                <a
                  key={f.filter}
                  href={`#${f.filter}`}
                  className={filter === f.filter ? "is-current" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setFilter(f.filter);
                    closeMenu();
                  }}
                >
                  <HapticSwitch />
                  {filter === f.filter && <span className="menu-caret" aria-hidden="true" />}
                  {f.label}
                </a>
              ))}
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => {
                    if (l.href === ABOUT_HREF) {
                      closeMenu();
                      goAbout(e);
                      return;
                    }
                    closeMenu();
                  }}
                >
                  <HapticSwitch />
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        </>
      )}
      <div className="meta-slot meta-index" data-reveal="block">
        <div className="reveal-mask">
          <p className="meta meta-line" ref={metaIndex} />
        </div>
      </div>
      <div className="meta-slot meta-name" data-reveal="block">
        <div className="reveal-mask">
          <p className="meta meta-line" ref={metaName} />
        </div>
      </div>
      <div className="meta-slot meta-type" data-reveal="block">
        <div className="reveal-mask">
          <p className="meta meta-line" ref={metaType} />
        </div>
      </div>
      <div className="meta-slot meta-tag" data-reveal="block">
        <div className="reveal-mask">
          <p className="meta meta-line" ref={metaTag} />
        </div>
      </div>
      {!compact && (
        <div className="view-toggle" data-reveal="block" onMouseLeave={() => moveToggleCaret(toggleEls.current[view] ?? null)}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={view === v ? "is-active" : ""}
              ref={(el) => {
                if (el) toggleEls.current[v] = el;
              }}
              onMouseEnter={(e) => {
                moveToggleCaret(e.currentTarget);
                if (v === "grid") preloadGrid();
                else if (v === "list") preloadList();
              }}
              onClick={() => switchView(v)}
            >
              <HapticSwitch />
              <Line>{v}</Line>
            </button>
          ))}
          <span className="toggle-caret" ref={toggleCaret} aria-hidden="true" />
        </div>
      )}
      <div className="trusted" data-reveal="foot">
        <span className="trusted-badge">
          <TrustedLogos />
        </span>
        <button
          type="button"
          className="fisheye-toggle"
          data-reveal="foot"
          onMouseEnter={playTick}
          onClick={(e) => {
            playRoll(e.currentTarget);
            playTick();
            toggleFisheye();
          }}
          aria-pressed={fisheye}
        >
          <HapticSwitch />
          <Roll>fisheye:{fisheye ? "[on]" : "[off]"}</Roll>
        </button>
      </div>
      <button
        type="button"
        className="sound-toggle"
        onMouseEnter={playTick}
        onClick={(e) => {
          playRoll(e.currentTarget);
          const on = !soundOn;
          setSoundOn(on);
          setSoundEnabled(on);
          playTick();
        }}
        aria-pressed={soundOn}
      >
        <HapticSwitch />
        <Line>sound:{soundOn ? "[on]" : "[off]"}</Line>
      </button>
      {entered && gesturesOk && gesturesOn && (
        <span className="hand-control-spacer" aria-hidden="true">
          <span className="hand-toggle">gestures:[off]</span>
        </span>
      )}
      {entered && gesturesOk && <HandControl ref={hand} onFrame={onHandFrame} onSecondClench={() => {}} onPinch={onPinch} onSquareGesture={onSquare} onStatus={onGestureStatus} />}
      {entered && gesturesOk && <Booth ref={booth} capture={() => hand.current?.capture() ?? null} onClose={onBoothClose} onActiveChange={setBoothOpen} />}
      {entered && gesturesOk && <GestureCursor ref={cursor} />}
      {entered && gesturesOk && <GestureTutorial active={gesturesOn} />}
      {!loaderGone && <Loader onEnter={onEnter} onDone={() => setLoaderGone(true)} preloadViews={preloadSlider} />}
    </div>
  );
}
