"use client";
// Entry gate (module 63909 / Loader): preloads every cover image, drives the percentage and
// the tick strip, then asks whether to enter with sound.
import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import HapticSwitch from "./HapticSwitch";
import Roll from "./Roll";
import { useProjects } from "@/lib/projects";
import { ENTRANCE_DURATION, ENTRANCE_EASE } from "@/lib/entrance";
import { COMPACT_BP, easeFactor, tickScale } from "@/lib/constants";
import { LOADER_COPY, SITE_NAME } from "@/lib/site";

const GROUPS = Array.from({ length: 41 }, (_, i) => i);

export default function Loader({ onEnter, onDone, preloadViews }: { onEnter: (withSound: boolean) => void; onDone: () => void; preloadViews?: () => void }) {
  const projects = useProjects();
  const root = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLParagraphElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLImageElement>(null);
  const ticks = useRef<{ el: HTMLElement; x: number }[]>([]);
  const [ready, setReady] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const t = gsap.fromTo(el.querySelectorAll(".loader-line"), { yPercent: 110, y: 0 }, { yPercent: 0, duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE });
    return () => {
      t.kill();
    };
  }, []);

  useEffect(() => {
    const images = projects.map((p) => p.image).filter(Boolean);
    const total = images.length + 1;
    const measure = () => {
      const s = strip.current;
      if (!s) return;
      s.style.setProperty("--lt-s", String(tickScale()));
      ticks.current = Array.from(s.querySelectorAll<HTMLElement>(".lt-group i")).map((el) => {
        const r = el.getBoundingClientRect();
        return { el, x: r.left + r.width / 2 };
      });
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    let loaded = 0;
    let shown = -1;
    const bump = () => {
      loaded += 100 / total;
    };
    fetch("/tick.mp3").then(bump, bump);
    let cancelled = false;
    let idle = 0;
    const preload = () => {
      if (cancelled || !images.length) return;
      let i = 0, inflight = 0;
      const next = () => {
        while (inflight < 4 && i < images.length) {
          const src = images[i++];
          inflight++;
          const img = new Image();
          const done = () => {
            inflight--;
            bump();
            next();
          };
          img.onload = done;
          img.onerror = done;
          img.src = src;
        }
      };
      next();
    };
    const hasIdle = typeof window.requestIdleCallback === "function";
    idle = hasIdle ? window.requestIdleCallback(preload, { timeout: 1200 }) : window.setTimeout(preload, 400);
    const t0 = performance.now();
    let value = 0;
    const tick = (_t: number, dt: number) => {
      const target = Math.min(100, Math.min(((performance.now() - t0) / 2000) * 100, loaded + 0.5));
      value += (target - value) * easeFactor(dt);
      if (target >= 100 && value > 99.6) value = 100;
      const n = Math.floor(value);
      if (n !== shown && pct.current) {
        shown = n;
        pct.current.textContent = `${String(n).padStart(2, "0")}%`;
      }
      const x = (value / 100) * window.innerWidth;
      const hx = Math.max(0, Math.min(window.innerWidth - 14, x - 7));
      if (head.current) head.current.style.transform = `translate3d(${hx}px, 0, 0)`;
      for (const t of ticks.current) t.el.classList.toggle("is-filled", t.x <= x);
      if (value >= 100) {
        gsap.ticker.remove(tick);
        if (head.current) gsap.to(head.current, { opacity: 0, duration: 0.5, ease: "power2.out" });
        setReady(true);
      }
    };
    gsap.ticker.add(tick);
    return () => {
      cancelled = true;
      if (idle) {
        if (hasIdle) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
      gsap.ticker.remove(tick);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [projects]);

  const enter = (withSound: boolean) => {
    const el = root.current;
    if (!el || leaving.current) return;
    leaving.current = true;
    const compact = window.matchMedia(`(max-width: ${COMPACT_BP}px)`).matches;
    el.querySelectorAll(".lt-group i.is-filled").forEach((e) => e.classList.remove("is-filled"));
    const tl = gsap.timeline();
    tl.set(el, { pointerEvents: "none" }, 0)
      .to(el.querySelectorAll(".loader-line"), { yPercent: -110, duration: 0.8, ease: "power3.in" }, 0)
      .to(el.querySelectorAll(".loader-actions, .loader-pct, .loader-head"), { opacity: 0, duration: 0.4, ease: "power2.in" }, 0)
      .call(() => onEnter(withSound))
      .to(el, { backgroundColor: "rgba(17, 17, 17, 0)", duration: 0.9, ease: "power2.inOut" })
      .set(el, { display: "none" })
      .call(onDone);
    if (compact) tl.to(el.querySelectorAll(".loader-strip"), { opacity: 0, duration: 0.45, ease: "power2.in" }, 0);
  };

  return (
    <div className="loader" ref={root}>
      <div className="loader-inner">
        <h1 className="loader-title">
          <span className="reveal-mask">
            <span className="loader-line">
              {SITE_NAME}
              <sup>®</sup>
            </span>
          </span>
        </h1>
        <p className="loader-copy">
          {LOADER_COPY.map((line, i) => (
            <Fragment key={line}>
              {i > 0 && <br />}
              <span className="reveal-mask">
                <span className="loader-line">{line}</span>
              </span>
            </Fragment>
          ))}
        </p>
        <div className={`loader-actions${ready ? " is-ready" : ""}`}>
          <button type="button" className="loader-enter" onPointerEnter={preloadViews} onClick={() => enter(true)}>
            <HapticSwitch />
            <Roll>enter with sound</Roll>
          </button>
          <button type="button" className="loader-enter-quiet" onPointerEnter={preloadViews} onClick={() => enter(false)}>
            <HapticSwitch />
            <Roll>[enter without]</Roll>
          </button>
        </div>
      </div>
      <p className="loader-pct" ref={pct}>
        00%
      </p>
      <div className="loader-strip" ref={strip} aria-hidden="true">
        <div className="loader-ticks">
          {GROUPS.map((g) => (
            <div key={g} className={`lt-group${g === 20 ? " lt-active" : ""}`}>
              {Array.from({ length: 7 }, (_, k) => (
                <i key={k} />
              ))}
            </div>
          ))}
        </div>
        <img className="loader-head" ref={head} src="/icons/playhead.svg" alt="" />
      </div>
    </div>
  );
}
