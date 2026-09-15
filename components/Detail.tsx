"use client";
// Project sheet (module 70879 / av): stills strip with zoom and a next-project cell, or the
// motion player with scrubber, idle-hiding chrome and an end card; shared header/footer chrome.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import gsap from "gsap";
import HapticSwitch from "./HapticSwitch";
import Roll, { playRoll } from "./Roll";
import { useSlidingCaret } from "./useSlidingCaret";
import { clientLine, clientNames, projectPath, type Project } from "@/lib/projects";
import { claimFirstLanding, ENTRANCE_DURATION, ENTRANCE_EASE, hasLandedBefore, isIrisNavPending, useIsoLayoutEffect } from "@/lib/entrance";
import { galleryHomeHref } from "@/lib/galleryFilter";
import { playTick } from "@/lib/sound";
import { tapHaptic } from "@/lib/haptic";
import * as C from "@/lib/constants";
import { ABOUT_HREF, LOGO_MARK } from "@/lib/site";

const GROUPS = Array.from({ length: 41 }, (_, i) => i);
const CELL = 758 / 1116;
const isCompact = () => window.matchMedia("(max-width: 760px)").matches;

function clock(s: number): string {
  if (!isFinite(s)) return "00:00";
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export interface DetailHandle {
  isZoomed: () => boolean;
  heroRect: () => { x: number; y: number; w: number; h: number };
  reveal: () => void;
  prepClose: () => void;
  dragBy: (dx: number) => void;
  settle: () => void;
  stepBy: (n: number) => void;
  toggleZoom: () => void;
}
export interface DetailProps {
  ref: Ref<DetailHandle>;
  project: Project;
  next: Project | null;
  href: string;
  works: number;
  homeFilters: { label: string; filter: "stills" | "motion" }[];
  navLinks: { label: string; href: string }[];
  soundOn: boolean;
  gesturesOn: boolean;
  arrivedBySlide?: boolean;
  arrivedByIris?: boolean;
  onClose: (e?: React.MouseEvent) => void;
  onToggleSound: () => void;
  onToggleGestures?: () => void;
  onOpenNext?: () => void;
  onHome?: (e: React.MouseEvent) => void;
  onHomeFilter?: (f: "stills" | "motion", e: React.MouseEvent) => void;
  onAbout?: (e: React.MouseEvent) => void;
  onMediaReady?: () => void;
}

export default function Detail({ ref, project, next, href, works, homeFilters, navLinks, soundOn, gesturesOn, arrivedBySlide = false, arrivedByIris = false, onClose, onToggleSound, onToggleGestures, onOpenNext, onHome, onHomeFilter, onAbout, onMediaReady }: DetailProps) {
  const isMotion = project.type === "motion";
  const gesturesRef = useRef(gesturesOn);
  gesturesRef.current = gesturesOn;
  const [ended, setEnded] = useState(false);
  const endedOnce = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomedState, setZoomed] = useState(false);
  const [compact, setCompact] = useState(false);
  useIsoLayoutEffect(() => {
    setCompact(window.matchMedia(`(max-width: ${C.COMPACT_BP}px)`).matches);
  }, []);
  const siteLinks = navLinks.slice(0, -1);
  const contact = navLinks[navLinks.length - 1];
  const [caret, moveCaret] = useSlidingCaret("xy", "before");
  const [caretOn, setCaretOn] = useState(false);
  const aimCaret = useCallback(
    (el: HTMLElement | null) => {
      if (el) {
        setCaretOn(true);
        moveCaret(el);
      } else setCaretOn(false);
    },
    [moveCaret],
  );

  const root = useRef<HTMLDivElement>(null);
  const videoWrap = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLElement | null)[]>([]);
  const video = useRef<HTMLVideoElement>(null);
  const zoomHint = useRef<HTMLSpanElement>(null);
  const zoomT = useRef(0);
  const dragT = useRef(0);
  const pitchPx = useRef(1);
  const dragged = useRef(false);
  const aimZoomHint = useRef<(x: number, y: number) => void>(() => {});
  const lastPointer = useRef({ x: NaN, y: NaN });
  const tickRow = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLImageElement>(null);
  const countEl = useRef<HTMLParagraphElement>(null);
  const totalEl = useRef<HTMLParagraphElement>(null);
  const playHint = useRef<HTMLSpanElement>(null);
  const pos = useRef(0);
  const target = useRef(0);
  const settleTimer = useRef(0);
  const revealed = useRef(false);
  const nextOpacity = useRef(0);
  const wakeIdle = useRef<() => void>(() => {});
  const zoomed = useRef(false);
  const openNextRef = useRef(onOpenNext);
  useEffect(() => {
    openNextRef.current = onOpenNext;
  }, [onOpenNext]);
  const viaIris = useRef(false);
  useIsoLayoutEffect(() => {
    viaIris.current = !!(href && (arrivedByIris || isIrisNavPending(href)));
  }, [href, arrivedByIris]);
  const mediaReadyRef = useRef(onMediaReady);
  useEffect(() => {
    mediaReadyRef.current = onMediaReady;
  }, [onMediaReady]);
  const [duration, setDuration] = useState(project.duration ?? 0);

  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    if (href) claimFirstLanding(href);
    const hero = isMotion ? videoWrap.current : strip.current;
    if (arrivedBySlide) {
      gsap.set(hero, { opacity: 1 });
      gsap.set(chrome.current, { opacity: 1 });
    } else {
      gsap.to(hero, { opacity: 1, duration: 0.25, ease: "power2.out" });
      gsap.fromTo(chrome.current, { opacity: 0 }, { opacity: 1, duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE });
    }
    if (isMotion) {
      // keep the poster until the visitor presses play (a seek would swap in the first frame)
      const v = video.current;
      if (v) {
        if (v.currentTime > 0) v.currentTime = 0;
        root.current?.classList.add("is-paused");
      }
    } else gsap.to(nextOpacity, { current: 1, duration: 0.6, ease: "power2.out", delay: 0.1 });
  }, [arrivedBySlide, isMotion, href]);

  // arriving through the iris on a stills sheet: the sheet starts dark and warms to white as it opens
  const [irisArriving, setIrisArriving] = useState(false);
  useIsoLayoutEffect(() => {
    if (viaIris.current && !arrivedBySlide && !isMotion) setIrisArriving(true);
  }, [arrivedBySlide, isMotion]);
  useEffect(() => {
    if (!irisArriving) return;
    const el = root.current;
    if (!el) return;
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail;
      gsap.to(el, { backgroundColor: "#ffffff", duration: d?.duration ?? 0.8, delay: d?.delay ?? 0, ease: "power2.out", onComplete: () => setIrisArriving(false) });
    };
    window.addEventListener("iris-open-start", onOpen);
    const t = window.setTimeout(() => {
      gsap.to(el, { backgroundColor: "#ffffff", duration: 0.3, onComplete: () => setIrisArriving(false) });
    }, 3200);
    return () => {
      window.removeEventListener("iris-open-start", onOpen);
      window.clearTimeout(t);
    };
  }, [irisArriving]);
  useEffect(() => {
    if (arrivedBySlide || !viaIris.current || !href || hasLandedBefore(href)) return void reveal();
    const f = (e: Event) => {
      if ((e as CustomEvent).detail?.href === href) reveal();
    };
    window.addEventListener("iris-opening", f);
    const t = window.setTimeout(reveal, 1800);
    return () => {
      window.removeEventListener("iris-opening", f);
      window.clearTimeout(t);
    };
  }, [arrivedBySlide, href, reveal]);

  const toggleZoom = () => {
    if (!revealed.current) return;
    zoomed.current = !zoomed.current;
    setZoomed(zoomed.current);
    wakeIdle.current();
    playTick();
    const dur = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : C.VIEW_MOVE_S;
    const ease = C.VIEW_MOVE_EASE;
    gsap.killTweensOf(chrome.current);
    root.current?.classList.toggle("is-zoomed", zoomed.current);
    gsap.to(chrome.current, { opacity: zoomed.current ? 0 : 1, duration: dur, ease });
    const { x, y } = lastPointer.current;
    if (Number.isFinite(x)) aimZoomHint.current(x, y);
    if (!isMotion) {
      gsap.killTweensOf(zoomT);
      gsap.to(zoomT, { current: zoomed.current ? 1 : 0, duration: dur, ease });
    }
  };

  // motion: play hint, paused state, idle chrome
  useEffect(() => {
    if (!isMotion) return;
    const v = video.current, el = root.current, hint = playHint.current;
    if (!v || !el) return;
    let idleTimer = 0;
    const p = { x: NaN, y: NaN };
    const showHint = (x: number, y: number, on: boolean) => {
      if (!hint) return;
      if (gesturesRef.current) return void hint.classList.remove("is-visible");
      hint.style.transform = isCompact() ? "" : `translate3d(${x}px, ${y}px, 0)`;
      hint.classList.toggle("is-visible", on);
    };
    const hintAt = (x: number, y: number) => {
      const u = document.elementFromPoint(x, y);
      const ctl = !!u?.closest("a, button, .detail-ticker");
      showHint(x, y, !!u?.closest(".detail-video") && !ctl);
    };
    const sync = () => {
      el.classList.toggle("is-paused", v.paused);
      if (!v.paused) return showHint(0, 0, false);
      if (isCompact()) return showHint(0, 0, true);
      let x = p.x, y = p.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        const r = videoWrap.current?.getBoundingClientRect();
        if (r) {
          x = r.left + r.width / 2;
          y = r.top + r.height / 2;
        } else {
          x = window.innerWidth / 2;
          y = window.innerHeight / 2;
        }
        showHint(x, y, true);
        return;
      }
      hintAt(x, y);
    };
    const armIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (!v.paused) el.classList.add("is-idle");
      }, 5000);
    };
    const wake = () => {
      el.classList.remove("is-idle");
      window.clearTimeout(idleTimer);
      if (!v.paused) armIdle();
    };
    wakeIdle.current = wake;
    const onPlay = () => {
      sync();
      armIdle();
    };
    const onPause = () => {
      sync();
      wake();
    };
    const onMove = (e: PointerEvent) => {
      p.x = e.clientX;
      p.y = e.clientY;
      wake();
      if (v.paused && !isCompact()) hintAt(e.clientX, e.clientY);
    };
    sync();
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    const wakeEvents = ["pointerdown", "keydown", "wheel"];
    wakeEvents.forEach((n) => window.addEventListener(n, wake, { passive: true }));
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.clearTimeout(idleTimer);
      wakeIdle.current = () => {};
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      wakeEvents.forEach((n) => window.removeEventListener(n, wake));
      window.removeEventListener("pointermove", onMove);
      showHint(0, 0, false);
    };
  }, [isMotion]);

  useImperativeHandle(ref, () => ({
    isZoomed: () => zoomed.current,
    heroRect: () => {
      if (isMotion) {
        const r = videoWrap.current?.getBoundingClientRect();
        return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: 0, y: 0, w: 0, h: 0 };
      }
      const r = strip.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0, w: 0, h: 0 };
      const w = CELL * r.height;
      return { x: window.innerWidth / 2 - w / 2, y: r.top, w, h: r.height };
    },
    reveal,
    prepClose: () => {
      revealed.current = false;
      video.current?.pause();
      root.current?.classList.remove("is-paused", "is-idle");
      const hero = isMotion ? videoWrap.current : strip.current;
      gsap.to(hero, { opacity: 0, duration: 0.2, ease: "power2.in" });
      gsap.to(chrome.current, { opacity: 0, duration: 0.25, ease: "power2.in" });
      nextOpacity.current = 0;
      if (zoomed.current) {
        zoomed.current = false;
        setZoomed(false);
        root.current?.classList.remove("is-zoomed");
        gsap.killTweensOf(zoomT);
        zoomT.current = 0;
        if (isMotion && video.current) gsap.set(video.current, { scale: 1 });
      }
    },
    dragBy: (dx) => {
      if (isMotion) {
        wakeIdle.current();
        const v = video.current;
        if (v && v.duration) v.currentTime = gsap.utils.clamp(0, v.duration, v.currentTime + (dx / window.innerWidth) * v.duration);
        return;
      }
      if (zoomed.current) return;
      const r = strip.current?.getBoundingClientRect();
      if (!r) return;
      target.current = gsap.utils.clamp(-0.5, project.count - 0.5, target.current - dx / (r.height * CELL));
    },
    settle: () => {
      if (!isMotion) target.current = gsap.utils.clamp(0, project.count - 1, Math.round(target.current));
    },
    stepBy: (n) => {
      if (isMotion) {
        wakeIdle.current();
        const v = video.current;
        if (v?.duration) v.currentTime = gsap.utils.clamp(0, v.duration, v.currentTime + n * v.duration * 0.04);
        return;
      }
      const hasNext = !!next;
      const max = hasNext && !zoomed.current ? project.count : project.count - 1;
      const cur = Math.round(target.current);
      if (n > 0 && hasNext && !zoomed.current && cur >= project.count) return void openNextRef.current?.();
      const to = gsap.utils.clamp(0, max, cur + n);
      if (to !== cur) {
        target.current = to;
        playTick();
      }
    },
    toggleZoom,
  }));

  // sound follows the toggle
  useEffect(() => {
    const v = video.current;
    if (!v || !isMotion) return;
    const apply = () => {
      const mute = !soundOn;
      if (!mute && v.paused) return;
      if (v.muted === mute) return;
      v.muted = mute;
      if (!mute)
        v.play().catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
    };
    apply();
    v.addEventListener("playing", apply);
    return () => v.removeEventListener("playing", apply);
  }, [soundOn, isMotion]);

  // tell the router the first frame is ready
  useIsoLayoutEffect(() => {
    let done = false, raf = 0, off: (() => void) | undefined;
    const fire = () => {
      if (!done) {
        done = true;
        mediaReadyRef.current?.();
      }
    };
    const watch = (img: HTMLImageElement) => {
      if (img.complete) return fire();
      const f = () => fire();
      img.addEventListener("load", f, { once: true });
      img.addEventListener("error", f, { once: true });
      off = () => {
        img.removeEventListener("load", f);
        img.removeEventListener("error", f);
      };
    };
    if (isMotion) {
      const v = video.current;
      if (v && v.readyState >= 2) return void fire();
      if (!project.image) return void fire();
      const img = new Image();
      img.onload = fire;
      img.onerror = fire;
      img.src = project.image;
      const f = () => fire();
      v?.addEventListener("loadeddata", f, { once: true });
      return () => {
        img.onload = null;
        img.onerror = null;
        v?.removeEventListener("loadeddata", f);
      };
    }
    const first = cells.current[0]?.firstElementChild;
    if (first instanceof HTMLImageElement) watch(first);
    else
      raf = requestAnimationFrame(() => {
        if (done) return;
        const el = cells.current[0]?.firstElementChild;
        if (el instanceof HTMLImageElement) watch(el);
        else fire();
      });
    return () => {
      cancelAnimationFrame(raf);
      off?.();
    };
  }, [isMotion]);

  // stills: layout loop, drag/flick/wheel, zoom hints, ticker
  useEffect(() => {
    if (isMotion) return;
    const el = strip.current;
    if (!el) return;
    const hasNext = !!next;
    const maxIndex = () => (hasNext && !zoomed.current ? project.count : project.count - 1);
    let overshoot = 0, lag = 0, opening = false, wheelTimer = 0;
    const resetOvershoot = () => {
      if (!opening) overshoot = 0;
    };
    /** pulling past the last cell opens the next project */
    const pastEnd = (from: number, to: number) => {
      if (opening) return true;
      const m = maxIndex();
      if (!hasNext || to <= m || from < m - 0.01 || pos.current < m - 0.35) return false;
      overshoot += to - Math.max(from, m);
      if (overshoot < 1.25) return false;
      opening = true;
      playTick();
      openNextRef.current?.();
      return true;
    };
    let lastRound = -1;
    const frame = (_t: number, dtMs: number) => {
      pos.current += (target.current - pos.current) * C.easeFactor(dtMs);
      const l = (0.2 * overshoot) / (0.2 + overshoot);
      lag = l > lag ? l : lag + (l - lag) * C.easeFactor(dtMs);
      const moving = Math.abs(target.current - pos.current) > 0.004;
      const dragging = el.classList.contains("is-dragging") || moving ? 1 : 0;
      dragT.current += (dragging - dragT.current) * (1 - Math.exp(-dtMs / 1000 / 0.22));
      // cells
      {
        const vw = window.innerWidth, vh = window.innerHeight;
        const z = zoomT.current;
        const r = el.getBoundingClientRect();
        const cellH = r.height + (vh - r.height) * z;
        const y = -r.top * z;
        const widths: number[] = [];
        for (let i = 0; i < cells.current.length; i++) {
          const c = cells.current[i];
          if (c?.dataset.next) {
            widths.push(vw <= C.MOBILE_DRAG_BP ? 0.86 * vw : Math.min(0.66 * vw, 760));
            continue;
          }
          const img = c?.firstElementChild as HTMLImageElement | null;
          const ratio = CELL + ((img?.naturalWidth || 758) / (img?.naturalHeight || 1116) - CELL) * z;
          widths.push(cellH * ratio);
        }
        const centres: number[] = [];
        let acc = 0;
        for (let i = 0; i < widths.length; i++) {
          centres.push(acc + widths[i] / 2);
          const narrow = Math.min(widths[i], widths[i + 1] ?? widths[i]);
          acc += widths[i] + ((vw - narrow) / 2 + 24) * z;
        }
        const lastPitch = centres.length > 1 ? centres[centres.length - 1] - centres[centres.length - 2] : (widths[0] ?? 1);
        const at = (arr: number[], t: number) => {
          if (!arr.length) return 0;
          const a = gsap.utils.clamp(0, arr.length - 1, Math.floor(t));
          const b = gsap.utils.clamp(0, arr.length - 1, a + 1);
          return arr[a] + (arr[b] - arr[a]) * gsap.utils.clamp(0, 1, t - a);
        };
        const scroll = at(centres, pos.current) + lag * lastPitch;
        const ci = gsap.utils.clamp(0, widths.length - 1, Math.round(pos.current));
        pitchPx.current = (widths[ci] ?? r.height * CELL) + 24;
        for (let i = 0; i < cells.current.length; i++) {
          const c = cells.current[i];
          if (!c) continue;
          const x = vw / 2 + (centres[i] - scroll) - widths[i] / 2;
          if (x > vw + 40 || x + widths[i] < -40) {
            c.style.visibility = "hidden";
            continue;
          }
          c.style.visibility = "visible";
          c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          c.style.width = `${widths[i]}px`;
          c.style.height = `${cellH}px`;
          if (c.dataset.next) {
            c.style.opacity = `${nextOpacity.current}`;
            continue;
          }
          const img = c.firstElementChild as HTMLElement | null;
          if (!img) continue;
          img.style.opacity = `${Math.abs(i - pos.current) < 0.5 ? 1 : nextOpacity.current}`;
          const bleed = 1 - z + z * dragT.current;
          const extra = 10 * bleed;
          img.style.left = `${-extra / 2}%`;
          img.style.top = `${-extra / 2}%`;
          img.style.width = `${100 + extra}%`;
          img.style.height = `${100 + extra}%`;
          const half = vw / 2 + (widths[i] / 2) * z;
          const px = C.parallaxNorm(x + widths[i] / 2 - vw / 2, half) * C.PARALLAX_DOM_PCT * bleed;
          img.style.objectPosition = `${(50 + px).toFixed(2)}% 50%`;
        }
      }
      // ticker
      {
        const vw = window.innerWidth;
        tickRow.current?.style.setProperty("--lt-s", String(C.tickScale(vw)));
        const x = (project.count > 1 ? gsap.utils.clamp(0, 1, pos.current / (project.count - 1)) : 0) * vw;
        if (head.current) head.current.style.transform = `translate3d(${Math.max(0, Math.min(vw - 14, x - 7))}px, 0, 0)`;
        if (tickRow.current) for (const i of tickRow.current.querySelectorAll("i")) i.classList.toggle("is-filled", i.getBoundingClientRect().left <= x);
        const n = Math.min(Math.round(pos.current), project.count - 1);
        if (countEl.current) countEl.current.textContent = String(n + 1).padStart(2, "0");
      }
      const rp = Math.round(pos.current);
      if (rp !== lastRound && lastRound !== -1 && revealed.current) playTick();
      lastRound = rp;
    };
    gsap.ticker.add(frame);
    const settleSoon = () => {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        target.current = gsap.utils.clamp(0, maxIndex(), Math.round(target.current));
      }, 80);
    };
    let startTarget = 0, vel = 0, lastT = 0;
    const flick = () => {
      window.clearTimeout(settleTimer.current);
      const stale = performance.now() - lastT > 90;
      const moved = target.current + (stale ? 0 : 140 * vel) - startTarget;
      const to = Math.abs(moved) < C.FLICK_COMMIT_CELLS ? Math.round(startTarget) : Math.round(startTarget) + Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
      target.current = gsap.utils.clamp(0, maxIndex(), to);
    };
    const zone = (x: number): "prev" | "next" | "middle" => {
      if (!zoomed.current) return "middle";
      const vw = window.innerWidth, cur = Math.round(pos.current);
      if (x < 0.25 * vw) return cur > 0 ? "prev" : "middle";
      if (x > 0.75 * vw && cur < project.count - 1) return "next";
      return "middle";
    };
    const hint = (x: number, y: number) => {
      const h = zoomHint.current;
      if (!h) return;
      if (gesturesRef.current || window.innerWidth <= C.MOBILE_DRAG_BP) return void h.classList.remove("is-visible");
      const onCell = !!document.elementFromPoint(x, y)?.closest(".detail-cell:not(.detail-next)");
      const zn = zone(x);
      h.textContent = zn === "prev" ? "Previous" : zn === "next" ? "Next" : zoomed.current ? "Zoom out" : "Zoom in";
      h.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      h.classList.toggle("is-visible", (zoomed.current && zn !== "middle") || onCell);
    };
    aimZoomHint.current = hint;
    let down = false, moved = false, pid = -1, lastX = 0, start = { x: 0, y: 0 };
    const end = () => {
      down = false;
      moved = false;
      pid = -1;
      el.classList.remove("is-dragging");
      resetOvershoot();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (!t.closest("a, button, .detail-ticker") || t.closest(".detail-next")) {
        down = true;
        moved = false;
        dragged.current = false;
        pid = e.pointerId;
        lastX = e.clientX;
        startTarget = target.current;
        vel = 0;
        lastT = performance.now();
        start = { x: e.clientX, y: e.clientY };
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
        window.clearTimeout(settleTimer.current);
      }
    };
    const onMove = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY };
      hint(e.clientX, e.clientY);
      if (!down || e.pointerId !== pid) return;
      if (!moved) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
        moved = true;
        dragged.current = true;
        el.classList.add("is-dragging");
        lastX = e.clientX;
      }
      const gain = window.innerWidth <= C.MOBILE_DRAG_BP ? C.MOBILE_DRAG_GAIN : 1;
      const d = -((e.clientX - lastX) * gain) / (pitchPx.current > 1 ? pitchPx.current : Math.max(1, el.getBoundingClientRect().height * CELL + 24));
      const to = target.current + d;
      if (pastEnd(target.current, to)) return void end();
      if (d < 0) resetOvershoot();
      target.current = gsap.utils.clamp(-0.5, hasNext ? maxIndex() : maxIndex() + 0.5, to);
      const now = performance.now();
      vel = 0.7 * vel + (d / Math.max(1, now - lastT)) * 0.3;
      lastT = now;
      lastX = e.clientX;
    };
    const onCancel = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      const was = moved;
      end();
      if (was) flick();
      else settleSoon();
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      const was = moved;
      end();
      if (was) return void flick();
      settleSoon();
      const zn = zone(e.clientX);
      if (zn === "prev" || zn === "next") {
        target.current = gsap.utils.clamp(0, project.count - 1, Math.round(target.current) + (zn === "next" ? 1 : -1));
        playTick();
        return;
      }
      const u = document.elementFromPoint(e.clientX, e.clientY);
      if (zoomed.current || u?.closest(".detail-cell:not(.detail-next)")) toggleZoom();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (zoomed.current) return;
      const dd = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const d = 0.0016 * gsap.utils.clamp(-140, 140, dd);
      const to = target.current + d;
      if (pastEnd(target.current, to)) return;
      if (d < 0) resetOvershoot();
      target.current = gsap.utils.clamp(0, maxIndex(), to);
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(resetOvershoot, 400);
      settleSoon();
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      gsap.ticker.remove(frame);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(wheelTimer);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMotion, next]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (fullscreen) {
        e.stopPropagation();
        setFullscreen(false);
        return;
      }
      if (zoomed.current) {
        e.stopPropagation();
        toggleZoom();
      }
    };
    window.addEventListener("keydown", f, true);
    return () => window.removeEventListener("keydown", f, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  // motion: scrubber + end card
  useEffect(() => {
    if (!isMotion) return;
    const v = video.current;
    if (!v) return;
    let raf = 0;
    const loop = () => {
      const vw = window.innerWidth;
      const x = (v.duration ? v.currentTime / v.duration : 0) * vw;
      if (head.current) head.current.style.transform = `translate3d(${Math.max(0, Math.min(vw - 14, x - 7))}px, 0, 0)`;
      if (tickRow.current) for (const i of tickRow.current.querySelectorAll("i")) i.classList.toggle("is-filled", i.getBoundingClientRect().left <= x);
      if (countEl.current) countEl.current.textContent = clock(v.currentTime);
      if (!endedOnce.current && v.duration && v.currentTime >= v.duration - 0.3) {
        endedOnce.current = true;
        setEnded(true);
      }
      raf = requestAnimationFrame(loop);
    };
    const onMeta = () => setDuration(v.duration);
    v.addEventListener("loadedmetadata", onMeta);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [isMotion]);

  const scrubTo = (x: number) => {
    const f = gsap.utils.clamp(0, 1, x / window.innerWidth);
    if (isMotion) {
      const v = video.current;
      if (v?.duration) v.currentTime = f * v.duration;
      return;
    }
    target.current = f * (project.count - 1);
  };

  const nextCard = next && (
    <>
      <span className="detail-next-label">next project</span>
      <span className="detail-next-name">{next.name}</span>
      <span className="detail-next-meta">{clientLine(next) ?? `${next.type} • ${next.tag}`}</span>
    </>
  );

  return (
    <div className={`detail${isMotion ? " is-motion" : ""}${menuOpen ? " is-menu-open" : ""}${fullscreen ? " is-fullscreen" : ""}${irisArriving ? " is-iris-arriving" : ""}`} ref={root}>
      {isMotion ? (
        <div
          className="detail-hero detail-video"
          ref={videoWrap}
          onClick={() => {
            const v = video.current;
            if (!v) return;
            if (v.paused) v.play().catch(() => {});
            else v.pause();
          }}
        >
          <video ref={video} src={project.video} poster={project.image || undefined} muted playsInline loop preload={compact ? "metadata" : "auto"} />
        </div>
      ) : (
        <div className="detail-hero detail-strip" ref={strip}>
          {project.gallery.map((src, i) => (
            <div
              key={i}
              className="detail-cell"
              ref={(el) => {
                cells.current[i] = el;
              }}
            >
              <img src={src} alt={`${project.name} frame ${i + 1}`} draggable={false} />
            </div>
          ))}
          {next && (
            <a
              className="detail-cell detail-next"
              data-next="1"
              href={projectPath(next)}
              ref={(el) => {
                cells.current[project.count] = el;
              }}
              onClick={(e) => {
                e.preventDefault();
                if (!dragged.current) onOpenNext?.();
              }}
              onMouseEnter={playTick}
            >
              <HapticSwitch />
              {nextCard}
            </a>
          )}
        </div>
      )}
      {isMotion && next && (
        <a
          className={`detail-next detail-next-end${ended ? " is-in" : ""}`}
          href={projectPath(next)}
          onClick={(e) => {
            e.preventDefault();
            onOpenNext?.();
          }}
          onMouseEnter={playTick}
          aria-hidden={!ended}
          tabIndex={ended ? undefined : -1}
        >
          <HapticSwitch />
          {nextCard}
        </a>
      )}
      <div className="detail-chrome" ref={chrome}>
        <header className="detail-header">
          <p className="detail-logo">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onClose(e);
              }}
            >
              <HapticSwitch />
              {LOGO_MARK}
              <sup>®</sup>
            </a>
          </p>
          <div className="detail-title">
            <h1>{project.name}</h1>
            {clientNames(project) && <p className="detail-sub">{clientNames(project)}</p>}
          </div>
          <nav className="detail-nav" aria-label="Primary" onMouseLeave={() => aimCaret(null)}>
            <span className={`nav-site-caret${caretOn ? " is-visible" : ""}`} ref={caret} aria-hidden="true" />
            <div className="detail-nav-works nav-filters">
              <div className="nav-works-row">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    (onHome ?? onClose)(e);
                  }}
                  onMouseEnter={(e) => aimCaret(e.currentTarget)}
                >
                  <HapticSwitch />
                  <Roll>works({works})</Roll>
                </a>
              </div>
              {homeFilters.length > 0 && onHomeFilter && (
                <div className="nav-drop nav-drop-hover">
                  {homeFilters.map((f) => (
                    <a
                      key={f.filter}
                      href={galleryHomeHref(f.filter)}
                      data-gallery-filter={f.filter}
                      onClick={(e) => {
                        e.preventDefault();
                        onHomeFilter(f.filter, e);
                      }}
                      onMouseEnter={(e) => aimCaret(e.currentTarget)}
                    >
                      <HapticSwitch />
                      <span className="reveal-mask nav-drop-mask">
                        <span className="nav-drop-reveal">
                          <Roll>{f.label}</Roll>
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            {siteLinks.map((l) => (
              <a key={l.label} href={l.href} onClick={l.href === ABOUT_HREF ? onAbout : undefined} onMouseEnter={(e) => aimCaret(e.currentTarget)}>
                <HapticSwitch />
                <Roll>{l.label}</Roll>
              </a>
            ))}
            {contact && (
              <a href={contact.href} onMouseEnter={(e) => aimCaret(e.currentTarget)}>
                <HapticSwitch />
                <Roll>{contact.label}</Roll>
              </a>
            )}
          </nav>
        </header>
        <div className="detail-footer">
          <button
            type="button"
            className="detail-ctl detail-fullscreen"
            onClick={(e) => {
              playRoll(e.currentTarget);
              tapHaptic();
              if (isMotion) setFullscreen((v) => !v);
              else toggleZoom();
            }}
            onMouseEnter={playTick}
            aria-pressed={isMotion ? fullscreen : zoomedState}
          >
            <HapticSwitch />
            <Roll>{isMotion ? `fullscreen:[${fullscreen ? "on" : "off"}]` : `zoom:[${zoomedState ? "on" : "off"}]`}</Roll>
          </button>
          <div
            className="detail-ticker"
            onPointerDown={(e) => {
              const el = e.currentTarget;
              el.setPointerCapture?.(e.pointerId);
              scrubTo(e.clientX);
              const id = e.pointerId;
              const move = (ev: PointerEvent) => {
                if (ev.pointerId === id) scrubTo(ev.clientX);
              };
              const up = (ev: PointerEvent) => {
                if (ev.pointerId !== id) return;
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                window.removeEventListener("pointercancel", up);
                if (!isMotion) target.current = gsap.utils.clamp(0, project.count - 1, Math.round(target.current));
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
              window.addEventListener("pointercancel", up);
            }}
          >
            <span className="detail-caret" />
            <div className="detail-count">
              <p ref={countEl}>{isMotion ? "00:00" : "01"}</p>
              <span className="detail-count-rule" />
              <p className="detail-count-total" ref={totalEl}>
                {isMotion ? clock(duration) : String(project.count).padStart(2, "0")}
              </p>
            </div>
            <div className="detail-tick-row" ref={tickRow}>
              {GROUPS.map((g) => (
                <div key={g} className={`lt-group${g === 20 ? " lt-active" : ""}`}>
                  {Array.from({ length: 7 }, (_, k) => (
                    <i key={k} />
                  ))}
                </div>
              ))}
            </div>
            <img className="detail-head" ref={head} src="/icons/playhead.svg" alt="" />
          </div>
          <div className="detail-controls">
            <button
              type="button"
              className="detail-ctl"
              onClick={(e) => {
                playRoll(e.currentTarget);
                onToggleSound();
              }}
              onMouseEnter={playTick}
              aria-pressed={soundOn}
            >
              <HapticSwitch />
              <Roll>sound:[{soundOn ? "on" : "off"}]</Roll>
            </button>
            {onToggleGestures && !gesturesOn && (
              <button type="button" className="detail-ctl" onClick={onToggleGestures} onMouseEnter={playTick} aria-pressed={false}>
                <HapticSwitch />
                <Roll>gestures:[off]</Roll>
              </button>
            )}
            {onToggleGestures && gesturesOn && (
              <span className="detail-ctl detail-ctl-spacer" aria-hidden="true">
                gestures:[off]
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="detail-close detail-close-zoom"
        onClick={() => {
          if (fullscreen) setFullscreen(false);
          else toggleZoom();
        }}
        onMouseEnter={playTick}
      >
        <HapticSwitch />
        <Roll>close</Roll>
      </button>
      <button
        type="button"
        className="menu-btn detail-menu-btn"
        aria-expanded={menuOpen}
        onClick={() => {
          tapHaptic();
          setMenuOpen((v) => !v);
        }}
      >
        <HapticSwitch />
        <Roll to="close">menu</Roll>
      </button>
      <div
        className={`mobile-menu${menuOpen ? " is-open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
      >
        <nav className="menu-items" aria-label="Primary">
          <a
            href="/"
            onClick={(e) => {
              setMenuOpen(false);
              (onHome ?? onClose)(e);
            }}
          >
            <HapticSwitch />
            works({works})
          </a>
          {siteLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => {
                setMenuOpen(false);
                if (l.href === ABOUT_HREF) onAbout?.(e);
              }}
            >
              <HapticSwitch />
              {l.label}
            </a>
          ))}
          {contact && (
            <a href={contact.href} onClick={() => setMenuOpen(false)}>
              <HapticSwitch />
              {contact.label}
            </a>
          )}
        </nav>
      </div>
      {isMotion && (
        <span className="detail-play-hint cursor-hint" ref={playHint} aria-hidden="true">
          Click to play
        </span>
      )}
      {!isMotion && <span className="detail-zoom-hint cursor-hint" ref={zoomHint} aria-hidden="true" />}
    </div>
  );
}
