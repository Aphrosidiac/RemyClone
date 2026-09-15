"use client";
// Webcam hand tracking → cursor / grab / pinch events (module 56029). MediaPipe HandLandmarker
// runs on the GPU from our own /mediapipe/wasm + model; the toggle rolls its label out, shows the
// mirrored camera preview, and rolls back in when turned off.
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import gsap from "gsap";
import Roll, { playRollAll } from "./Roll";
import { isOverHandPreview } from "./GestureCursor";
import { gesturesSupported, gesturesWanted, setGesturesOn } from "@/lib/gestures";
import { playTick } from "@/lib/sound";

type Phase = "toggle" | "rolling-out" | "loading" | "preview" | "preview-out" | "rolling-in";
type Status = "off" | "loading" | "on" | "error";
const PHASE_CLASS: Record<Phase, string> = {
  toggle: "",
  "rolling-out": "is-hand-rolling-out",
  loading: "is-hand-loading",
  preview: "is-hand-live",
  "preview-out": "is-hand-live is-hand-leaving",
  "rolling-in": "is-hand-rolling-in",
};
const LABEL: Record<Status, string> = { off: "[off]", loading: "[…]", on: "[on]", error: "[n/a]" };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const twoFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
async function videoReady(v: HTMLVideoElement) {
  if (v.readyState >= 2 && v.videoWidth > 0) return;
  await new Promise<void>((r) => {
    const f = () => {
      v.removeEventListener("loadeddata", f);
      r();
    };
    v.addEventListener("loadeddata", f, { once: true });
  });
}

type Pt = { x: number; y: number };
/** hysteresis on finger reach: clenched below 1.25, open above 1.55 */
export function createClenchDetector(onClench?: () => void) {
  let clenched = false;
  return {
    reset() {
      clenched = false;
    },
    sample: (reach: number) => {
      if (!clenched && reach < 1.25) {
        clenched = true;
        onClench?.();
      } else if (clenched && reach > 1.55) clenched = false;
      return clenched;
    },
  };
}
function handMetrics(l: Pt[]) {
  const size = Math.hypot(l[0].x - l[9].x, l[0].y - l[9].y) || 1;
  const tips = [8, 12, 16, 20];
  const reach = tips.reduce((a, i) => a + Math.hypot(l[i].x - l[0].x, l[i].y - l[0].y), 0) / (tips.length * size);
  return { handSize: size, reach };
}
function palmCentre(l: Pt[]): Pt {
  return { x: (l[0].x + l[5].x + l[9].x + l[13].x + l[17].x) / 5, y: (l[0].y + l[5].y + l[9].y + l[13].y + l[17].y) / 5 };
}
/** index + thumb out at a right angle, other fingers curled — the "frame" gesture */
function isSquareHand(l: Pt[]): boolean {
  const size = Math.hypot(l[0].x - l[9].x, l[0].y - l[9].y) || 1;
  const d = (a: number, b: number) => Math.hypot(l[a].x - l[b].x, l[a].y - l[b].y) / size;
  const indexOut = d(8, 0) > 1.55;
  const restIn = d(12, 0) < 1.3 && d(16, 0) < 1.25 && d(20, 0) < 1.25;
  const thumbOut = d(4, 5) > 0.65;
  if (!indexOut || !restIn || !thumbOut) return false;
  const i = { x: l[8].x - l[5].x, y: l[8].y - l[5].y };
  const t = { x: l[4].x - l[2].x, y: l[4].y - l[2].y };
  const cos = (i.x * t.x + i.y * t.y) / (Math.hypot(i.x, i.y) * Math.hypot(t.x, t.y) || 1);
  return Math.abs(cos) < 0.65;
}

export interface HandControlHandle {
  toggle: () => void;
  aimHint: (x: number, y: number, show?: boolean) => void;
  capture: () => HTMLCanvasElement | null;
}
export interface HandControlProps {
  ref: Ref<HandControlHandle>;
  /** normalised palm x/y (camera space), tracked, clenched */
  onFrame: (x: number, y: number, tracked: boolean, clenched: boolean) => void;
  onSecondClench: () => void;
  onPinch: () => void;
  onSquareGesture: () => void;
  onStatus?: (on: boolean) => void;
}

export default function HandControl({ ref, onFrame, onSecondClench, onPinch, onSquareGesture, onStatus }: HandControlProps) {
  const [status, setStatus] = useState<Status>("off");
  const [phase, setPhaseState] = useState<Phase>("toggle");
  const statusRef = useRef(status);
  statusRef.current = status;
  const phaseRef = useRef<Phase>("toggle");
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const root = useRef<HTMLDivElement>(null);
  const toggleBtn = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLButtonElement>(null);
  const previewFresh = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const stopFn = useRef<(() => void) | null>(null);
  const cbSecond = useRef(onSecondClench);
  const cbPinch = useRef(onPinch);
  const cbSquare = useRef(onSquareGesture);
  const seq = useRef(0);
  const runSeq = useRef(0);
  useEffect(() => {
    cbSecond.current = onSecondClench;
    cbPinch.current = onPinch;
    cbSquare.current = onSquareGesture;
  }, [onSecondClench, onPinch, onSquareGesture]);
  useEffect(() => () => stopFn.current?.(), []);

  // on project pages the running control must not inherit the entrance's opacity 0
  useLayoutEffect(() => {
    const el = root.current;
    const page = el?.closest(".project-page");
    if (!el || !page) return;
    const fix = () => {
      if (page.classList.contains("gestures-on") && el.classList.contains("is-running")) gsap.set(el, { opacity: 1, y: 0, yPercent: 0 });
    };
    fix();
    const a = new MutationObserver(fix);
    a.observe(page, { attributes: true, attributeFilter: ["class"] });
    const b = new MutationObserver(fix);
    b.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, []);
  useEffect(() => {
    if (phase !== "preview") hint.current?.classList.remove("is-visible");
  }, [phase]);
  useLayoutEffect(() => {
    if (phase !== "rolling-in") return;
    const el = toggleBtn.current;
    if (!el || reducedMotion()) return;
    el.querySelectorAll<HTMLElement>(".roll-inner").forEach((e) => {
      e.style.transition = "none";
      e.style.transitionDelay = "";
      e.style.transform = "translateY(110%)";
    });
  }, [phase]);
  useLayoutEffect(() => {
    const el = preview.current;
    if (!el) return;
    if (phase !== "preview") {
      if (phase !== "preview-out") {
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: "scale,opacity,transformOrigin" });
      }
      return;
    }
    if (!previewFresh.current) return;
    previewFresh.current = false;
    if (reducedMotion()) {
      gsap.set(el, { scale: 1, opacity: 1 });
      return;
    }
    gsap.fromTo(el, { scale: 0, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.6, ease: "power3.out", overwrite: true });
  }, [phase]);

  const report = (s: Status) => {
    setStatus(s);
    onStatus?.(s === "on");
  };
  const stopTracking = () => {
    stopFn.current?.();
    stopFn.current = null;
  };

  const start = async (fromToggle: boolean) => {
    const my = ++runSeq.current;
    let stream: MediaStream | null = null;
    try {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } });
      if (my !== runSeq.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const v = video.current;
      if (!v) throw new Error("video element missing");
      v.srcObject = stream;
      await v.play();
      await videoReady(v);
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
      });
      if (my !== runSeq.current) {
        landmarker.close();
        stream.getTracks().forEach((t) => t.stop());
        v.srcObject = null;
        return;
      }
      let stopped = false, raf = 0, lastTime = -1, skip = 0;
      const primary = createClenchDetector();
      const secondary = createClenchDetector(() => cbSecond.current());
      let lastPalm: Pt | null = null;
      let pinched = false, squareFrames = 0, lastSquare = -Infinity;
      const loop = () => {
        if (stopped) return;
        if (document.hidden) {
          raf = requestAnimationFrame(loop);
          return;
        }
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          // every other frame
          if ((skip ^= 1)) {
            lastTime = v.currentTime;
            raf = requestAnimationFrame(loop);
            return;
          }
          lastTime = v.currentTime;
          const now = performance.now();
          const hands = (landmarker.detectForVideo(v, now).landmarks ?? []) as Pt[][];
          if (hands.length > 0) {
            const palms = hands.map(palmCentre);
            let main = 0;
            if (lastPalm && palms.length > 1) {
              const d = palms.map((p) => Math.hypot(p.x - lastPalm!.x, p.y - lastPalm!.y));
              main = d[1] < d[0] ? 1 : 0;
            }
            const hand = hands[main];
            const squares = hands.map(isSquareHand);
            const { handSize, reach } = handMetrics(hand);
            const clenched = primary.sample(squares[main] ? 99 : reach);
            const pinch = Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y) / handSize;
            if (!pinched && !clenched && reach > 1.35 && pinch < 0.28) {
              pinched = true;
              cbPinch.current();
            } else if (pinched && (pinch > 0.5 || clenched)) pinched = false;
            const other = hands[1 - main];
            if (other) secondary.sample(squares[1 - main] ? 99 : handMetrics(other).reach);
            else secondary.reset();
            if (squares.some(Boolean)) {
              if (++squareFrames >= 8 && now - lastSquare > 4000) {
                lastSquare = now;
                squareFrames = 0;
                cbSquare.current();
              }
            } else squareFrames = 0;
            lastPalm = palms[main];
            onFrame(lastPalm.x, lastPalm.y, true, clenched);
          } else {
            primary.reset();
            secondary.reset();
            lastPalm = null;
            pinched = false;
            onFrame(0.5, 0.5, false, false);
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      stopFn.current = () => {
        stopped = true;
        cancelAnimationFrame(raf);
        landmarker.close();
        stream?.getTracks().forEach((t) => t.stop());
        v.srcObject = null;
        onFrame(0.5, 0.5, false, false);
      };
      previewFresh.current = true;
      setPhase("preview");
      report("on");
    } catch (e) {
      console.warn("Hand control unavailable:", e);
      stream?.getTracks().forEach((t) => t.stop());
      if (video.current) video.current.srcObject = null;
      onFrame(0.5, 0.5, false, false);
      if (my !== runSeq.current) return;
      if (fromToggle) setGesturesOn(false);
      report("error");
      if (fromToggle) await rollIn();
      else setPhase("toggle");
    }
  };

  const rollIn = async (token?: number) => {
    const my = token ?? ++seq.current;
    setPhase("rolling-in");
    await twoFrames();
    const el = toggleBtn.current;
    if (!el || my !== seq.current) {
      if (my === seq.current) setPhase("toggle");
      return;
    }
    if (reducedMotion()) setPhase("toggle");
    else {
      await playRollAll(el, "in", { force: true });
      if (my === seq.current) {
        await twoFrames();
        setPhase("toggle");
      }
    }
  };
  const turnOn = async () => {
    const my = ++seq.current;
    runSeq.current += 1;
    if (statusRef.current === "error") report("off");
    setPhase("rolling-out");
    const el = toggleBtn.current;
    if (!el || reducedMotion()) {
      if (my !== seq.current) return;
      setPhase("loading");
      report("loading");
      await start(true);
      return;
    }
    await playRollAll(el, "out", { force: true });
    if (my !== seq.current) return;
    setPhase("loading");
    report("loading");
    await twoFrames();
    if (my === seq.current) await start(true);
  };
  const turnOff = async () => {
    const my = ++seq.current;
    runSeq.current += 1;
    setPhase("preview-out");
    hint.current?.classList.remove("is-visible");
    const el = preview.current;
    if (!el || reducedMotion()) {
      if (my !== seq.current) return;
      stopTracking();
      report("off");
      await rollIn(my);
      return;
    }
    await new Promise<void>((r) => {
      gsap.to(el, { scale: 0, opacity: 0, duration: 0.5, ease: "power3.inOut", transformOrigin: "50% 50%", onComplete: r });
    });
    if (my !== seq.current) return;
    stopTracking();
    gsap.set(el, { scale: 0, opacity: 0 });
    report("off");
    await twoFrames();
    if (my === seq.current) await rollIn(my);
  };

  // resume a session where gestures were left on
  const booted = useRef(false);
  useEffect(() => {
    if (!booted.current && gesturesWanted() && gesturesSupported()) {
      booted.current = true;
      setPhase("loading");
      report("loading");
      start(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const p = phaseRef.current;
    if (p !== "toggle" && p !== "preview") return;
    if (p === "preview") {
      setGesturesOn(false);
      turnOff();
    } else {
      setGesturesOn(true);
      turnOn();
    }
  };

  useImperativeHandle(ref, () => ({
    toggle,
    aimHint: (x, y, show = true) => {
      const h = hint.current;
      if (!h) return;
      if (phaseRef.current !== "preview" || !show) {
        h.classList.remove("is-visible");
        return;
      }
      if (isOverHandPreview(x, y)) {
        h.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        h.classList.add("is-visible");
      } else h.classList.remove("is-visible");
    },
    capture: () => {
      const v = video.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return null;
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0);
      return c;
    },
  }));

  const running = phase === "preview" || phase === "preview-out" || phase === "rolling-in";
  const live = phase === "preview" || phase === "preview-out";
  const idle = phase === "toggle";
  const showHintAt = (x: number, y: number) => {
    const h = hint.current;
    if (h && phaseRef.current === "preview") {
      h.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      h.classList.add("is-visible");
    }
  };

  return (
    <>
      <div ref={root} className={`hand-control${running ? " is-running" : ""}${PHASE_CLASS[phase] ? ` ${PHASE_CLASS[phase]}` : ""}`} data-reveal="foot">
        <button
          ref={toggleBtn}
          type="button"
          className="hand-toggle"
          onMouseEnter={playTick}
          onClick={() => {
            if (idle) {
              playTick();
              toggle();
            }
          }}
          aria-pressed={false}
          aria-busy={phase === "rolling-out" || phase === "rolling-in"}
          aria-hidden={!idle && phase !== "rolling-out" && phase !== "rolling-in"}
          tabIndex={idle ? 0 : -1}
        >
          <span className="reveal-mask">
            <span data-reveal="line">
              <Roll>gestures:</Roll>
            </span>
          </span>
          <span className="reveal-mask">
            <span data-reveal="line">
              <Roll>{LABEL[status]}</Roll>
            </span>
          </span>
        </button>
        <button
          ref={preview}
          type="button"
          className={`hand-preview${live ? " is-visible" : " is-offscreen"}`}
          onPointerEnter={(e) => {
            if (live) {
              playTick();
              showHintAt(e.clientX, e.clientY);
            }
          }}
          onPointerMove={(e) => {
            if (phaseRef.current === "preview") showHintAt(e.clientX, e.clientY);
          }}
          onPointerLeave={() => hint.current?.classList.remove("is-visible")}
          onClick={() => {
            if (phaseRef.current === "preview") {
              playTick();
              toggle();
            }
          }}
          aria-label="Turn off gestures"
          aria-hidden={!live}
          tabIndex={live ? 0 : -1}
        >
          <video ref={video} className="hand-video" muted playsInline aria-hidden="true" />
        </button>
      </div>
      <span ref={hint} className="hand-preview-hint cursor-hint" aria-hidden="true">
        turn off
      </span>
    </>
  );
}
