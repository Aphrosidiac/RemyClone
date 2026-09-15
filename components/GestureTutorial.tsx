"use client";
// Three-step gesture primer shown the first time gestures are switched on (module 63909).
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Roll from "./Roll";

const STEPS = [
  { gesture: "grab to drag", effect: "close your hand and move it — the gallery follows", clip: "/videos/gesture-drag.mp4", from: 8.5, to: 11, hand: "drag" },
  { gesture: "pinch to view", effect: "pinch on the centre tile to open the project", clip: "/videos/gesture-view.mp4", from: 0.4, to: 3, hand: "view" },
  { gesture: "pinch to click", effect: "pinch to press anything in the chrome — views, filters, sound", clip: "/videos/gesture-click.mp4", from: 4, to: 8, hand: "click" },
] as const;
const SEEN_KEY = "rs-gesture-tutorial";
let seen: boolean | null = null;

function Clip({ step, onFail }: { step: (typeof STEPS)[number]; onFail: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    const loop = () => {
      if (el.currentTime >= step.to || el.currentTime < step.from - 0.1) el.currentTime = step.from;
    };
    const start = () => {
      el.currentTime = step.from;
      el.play().catch(() => {});
    };
    el.addEventListener("timeupdate", loop);
    el.addEventListener("loadedmetadata", start);
    if (el.readyState >= 1) start();
    return () => {
      el.removeEventListener("timeupdate", loop);
      el.removeEventListener("loadedmetadata", start);
    };
  }, [step]);
  return <video key={step.clip} ref={v} className="gesture-tutorial-video" src={step.clip} muted playsInline autoPlay onError={onFail} />;
}

function Hand({ kind }: { kind: string }) {
  return (
    <div className={`gt-hand gt-hand-${kind}`} aria-hidden="true">
      <span className="gt-hand-body">
        <img className="gt-open" src="/icons/hand-open.svg" alt="" />
        <img className="gt-closed" src="/icons/hand-closed.svg" alt="" />
        <img className="gt-point" src="/icons/hand-point.svg" alt="" />
        <i className="gt-pulse" />
      </span>
    </div>
  );
}

export default function GestureTutorial({ active }: { active: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [closed, setClosed] = useState(false);
  const [step, setStep] = useState(0);
  const [videoOk, setVideoOk] = useState(true);
  const [forced] = useState(() => new URLSearchParams(window.location.search).has("tutorial"));
  if (seen === null) {
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
  }
  const open = (active || forced) && !seen && !closed;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    gsap.killTweensOf(el);
    if (open) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {}
      gsap.fromTo(el, { autoAlpha: 0, y: 12, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" });
    } else gsap.to(el, { autoAlpha: 0, y: 12, duration: 0.3, ease: "power2.in" });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosed(true);
      if (e.key === "ArrowRight") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cur = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <>
      <div className={`gesture-tutorial-scrim${open ? " is-on" : ""}`} aria-hidden="true" onClick={() => setClosed(true)} />
      <div className="gesture-tutorial-wrap">
        <div className="gesture-tutorial" ref={box} role="dialog" aria-modal="true" aria-label="How to use gestures" style={{ visibility: "hidden", opacity: 0 }}>
          <header className="gesture-tutorial-head">
            <p className="gesture-tutorial-kicker">gestures</p>
            <button type="button" className="gesture-tutorial-close" onClick={() => setClosed(true)}>
              <Roll>close</Roll>
            </button>
          </header>
          <div className="gesture-tutorial-stage">
            {videoOk ? <Clip step={cur} onFail={() => setVideoOk(false)} /> : <div className="gesture-tutorial-fallback" aria-hidden="true" />}
            <Hand key={cur.hand} kind={cur.hand} />
            <span className="gesture-tutorial-step">
              {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
            </span>
          </div>
          <div className="gesture-tutorial-copy">
            <p className="gesture-tutorial-gesture">{cur.gesture}</p>
            <p className="gesture-tutorial-effect">{cur.effect}</p>
          </div>
          <footer className="gesture-tutorial-foot">
            <div className="gesture-tutorial-dots">
              {STEPS.map((s, i) => (
                <button key={s.gesture} type="button" className={`gesture-tutorial-dot${i === step ? " is-on" : ""}`} aria-label={s.gesture} aria-current={i === step} onClick={() => setStep(i)} />
              ))}
            </div>
            <button type="button" className="gesture-tutorial-next" onClick={() => (last ? setClosed(true) : setStep(step + 1))}>
              <Roll>{last ? "start" : "next"}</Roll>
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
