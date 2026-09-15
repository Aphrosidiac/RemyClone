"use client";
// Horizontal (or, rotated, vertical) infinite strip of project tiles — module 14935.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useProjects, typeMeta } from "@/lib/projects";
import { lensAmount } from "@/lib/lens";
import { playTick } from "@/lib/sound";
import { ENTRANCE_DURATION, ENTRANCE_EASE, handoffAt } from "@/lib/entrance";
import * as C from "@/lib/constants";
import { FISHEYE_CAM_Z, FISHEYE_ZOOM, lensCellScale, visibleSize, worldRectToScreen } from "./lens";
import { applyTileCover, type TileCover } from "./tileCover";
import { isMotionPreviewPlaying, previewTextureFor } from "./motionPreview";
import Stage, { useIdleFrameloop, useProjectTextures, WAKE_GRACE_MS } from "./Stage";

const TICK_SLOTS = Array.from({ length: 41 }, (_, i) => i - 20);
const DIAL_DEGS = Array.from({ length: 72 }, (_, i) => 5 * i);
const LINE_IN = { yPercent: 0, y: 0, duration: 1.3, ease: "power3.out" };

/** on compact screens under the lens, the cell height that fills the curved viewport */
function lensFillH(frac: number, aspect: number): number {
  const r = frac / ((1 + FISHEYE_ZOOM) * Math.sqrt(aspect * aspect + 1));
  return 2 * FISHEYE_CAM_Z * Math.tan(2 * Math.asin(Math.min(0.999, r)));
}
function introParkX(): number {
  const a = window.innerWidth / Math.max(1, window.innerHeight);
  return 3 * visibleSize(a).visibleW;
}
export function sliderCell(aspect: number): { cellW: number; cellH: number } {
  if (window.innerWidth <= C.COMPACT_BP) {
    const l = lensAmount();
    const vh = visibleSize(aspect).visibleH;
    const h = l <= 0 ? vh : l >= 1 ? lensFillH(1, aspect) : vh + (lensFillH(1, aspect) - vh) * l;
    return { cellW: h * C.SLIDER_CELL_RATIO, cellH: h };
  }
  const { visibleW, visibleH } = visibleSize(aspect);
  const { w, h } = C.tileWorldSize(visibleW, visibleH, lensCellScale());
  return { cellW: w, cellH: h };
}
function poolSize(): number {
  const a = window.innerWidth / Math.max(1, window.innerHeight);
  return C.tilePool(visibleSize(a).visibleW, sliderCell(a).cellW);
}

interface Sim {
  pos: number;
  target: number;
  items: number[];
  n: number;
  fade: number;
  interactive: boolean;
  introX: number;
  introRunning: boolean;
  filterT: number;
  introFrom: number;
  introSpin: number;
  introDetent: number;
  introPasses: number;
  rot: number;
}

function Tile({ slot, pool, sim, textures, ensure }: { slot: number; pool: number; sim: React.RefObject<Sim>; textures: THREE.Texture[]; ensure: (i: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const cover = useRef<TileCover | null>(null);
  useFrame(() => {
    if (!group.current || !mesh.current || !mat.current) return;
    cover.current ||= applyTileCover(mat.current);
    const s = sim.current;
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const { cellW, cellH } = sliderCell(aspect);
    const n = s.items.length || 1;
    const rel = gsap.utils.wrap(-pool / 2, pool / 2, slot - s.pos);
    const ang = s.rot * (Math.PI / 2);
    const idx = Math.round(s.pos + rel);
    const project = s.items[C.mod(idx, n)] ?? 0;
    const d = rel * (cellW + (cellH - cellW) * s.rot);
    group.current.position.set(d * Math.cos(ang) + s.introX, -d * Math.sin(ang), 0);
    const tex = previewTextureFor(project) ?? textures[project] ?? textures[0];
    if (mat.current.map !== tex) {
      mat.current.map = tex;
      mat.current.color.set("#ffffff");
      mat.current.needsUpdate = true;
    }
    const { visibleW } = visibleSize(aspect);
    const onScreen = Math.abs(rel * cellW) < visibleW / 2 + cellW;
    mesh.current.visible = onScreen && s.fade > 0.01;
    if (!mesh.current.visible) return;
    ensure(project);
    mesh.current.scale.set(cellW, cellH, 1);
    const near = gsap.utils.clamp(0, 1, 1 - Math.abs(rel));
    mat.current.opacity = s.fade * s.filterT * (C.INACTIVE_OPACITY + (1 - C.INACTIVE_OPACITY) * near);
    cover.current.setSaturation(C.INACTIVE_SAT + (1 - C.INACTIVE_SAT) * near);
    cover.current.set(cellW / cellH);
    cover.current.setParallax(C.parallaxNorm(d * Math.cos(ang), visibleW / 2), C.parallaxNorm(-d * Math.sin(ang), visibleSize(aspect).visibleH / 2));
  });
  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={mat} color="#111111" transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Strip({ sim, hiddenRef, onTick }: { sim: React.RefObject<Sim>; hiddenRef: React.RefObject<boolean>; onTick: (pos: number) => void }) {
  const lastTick = useRef<number | null>(null);
  const { textures, ensure } = useProjectTextures();
  const [slots, setSlots] = useState(() => C.poolSlots(poolSize()));
  useEffect(() => {
    const f = () => {
      const n = poolSize();
      setSlots((s) => (s.length === n ? s : C.poolSlots(n)));
    };
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  useFrame((_, dt) => {
    const s = sim.current;
    if (s.introRunning) {
      const { cellW } = sliderCell(window.innerWidth / Math.max(1, window.innerHeight));
      s.introX += (0 - s.introX) * (1 - Math.exp(-(4 * dt)));
      const cell = Math.floor(s.introX / cellW);
      if (cell < s.introDetent) {
        s.introDetent = cell;
        playTick();
      }
      if (s.introX < 0.004 * s.introFrom) {
        s.introX = 0;
        s.introRunning = false;
        if (s.introPasses === 0) playTick();
      }
    }
    s.pos += (s.target - s.pos) * C.easeFactor(1000 * dt);
    if (!hiddenRef.current) onTick(s.pos);
    // one tick per cell crossed (the reference ticks on every one of the 7 sub-marks — far too busy)
    const t = Math.round(s.pos);
    if (!hiddenRef.current && lastTick.current !== null && t !== lastTick.current && Math.abs(t - lastTick.current) <= 1) playTick();
    lastTick.current = t;
  });
  return (
    <group>
      {slots.map((slot) => (
        <Tile key={slot} slot={slot} pool={slots.length} sim={sim} textures={textures} ensure={ensure} />
      ))}
    </group>
  );
}

export interface SliderHandle {
  isReady: () => boolean;
  renderNow: () => void;
  rotate: (dir: "vertical" | "flat") => number;
  snapRot: (r: number) => void;
  setCenterProject: (i: number) => void;
  activeProject: () => number;
  centerRect: () => { x: number; y: number; w: number; h: number };
  dragBy: (dx: number) => void;
  settle: () => void;
  stepBy: (n: number) => void;
  fade: (to: number, opts?: { delay?: number }) => gsap.core.Tween;
  setInteractive: (v: boolean) => void;
  setItems: (items: number[], animate: boolean) => void;
  introPark: () => void;
  intro: (animate: boolean, done?: () => void) => void;
}

interface TickRefs {
  el: HTMLDivElement;
  name: HTMLElement;
  meta: HTMLElement;
  metaType: HTMLElement;
  metaTag: HTMLElement;
  row: HTMLElement;
  ticks: HTMLElement[];
  project: number;
}

export default function SliderView({ ref, hidden, initialItems }: { ref: Ref<SliderHandle>; hidden: boolean; initialItems?: number[] }) {
  const projects = useProjects();
  const items0 = initialItems ?? projects.map((_, i) => i);
  const root = useRef<HTMLDivElement>(null);
  const tickerEl = useRef<HTMLDivElement>(null);
  const dialEl = useRef<HTMLDivElement>(null);
  const wheelEl = useRef<HTMLDivElement>(null);
  const dialName = useRef<HTMLParagraphElement>(null);
  const dialMeta = useRef<HTMLParagraphElement>(null);
  const dialType = useRef<HTMLSpanElement>(null);
  const dialTag = useRef<HTMLSpanElement>(null);
  const dialProject = useRef(-1);
  const dialActive = useRef(-1);
  const groups = useRef<(TickRefs | null)[]>([]);
  const hiddenRef = useRef(hidden);
  const settleTimer = useRef(0);
  const sim = useRef<Sim>({
    pos: 0, target: 0, items: items0, n: projects.length, fade: 1, interactive: true,
    introX: 0, introRunning: false, filterT: 1, introFrom: 0, introSpin: 0, introDetent: 0, introPasses: 0, rot: 0,
  });
  useState(() => {
    if (typeof window !== "undefined") {
      sim.current.introX = introParkX();
      sim.current.introFrom = sim.current.introX;
    }
  });

  const isMoving = useCallback(() => {
    const s = sim.current;
    return isMotionPreviewPlaying() || Math.abs(s.target - s.pos) > 5e-4 || s.introX !== 0 || gsap.isTweening(s);
  }, []);
  const ready = useRef(false);
  const advance = useRef<((t: number) => void) | null>(null);
  const onAdvance = useCallback((f: ((t: number) => void) | null) => {
    advance.current = f;
  }, []);
  const { awake, wake } = useIdleFrameloop(isMoving, hidden);
  const onContentReady = useCallback(() => {
    ready.current = true;
    wake({ graceMs: WAKE_GRACE_MS });
  }, [wake]);
  const settleAfter = useCallback(
    (ms: number) => {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        sim.current.target = Math.round(sim.current.target);
        wake();
      }, ms);
    },
    [wake],
  );

  useImperativeHandle(ref, () => ({
    isReady: () => ready.current,
    renderNow: () => advance.current?.(performance.now()),
    rotate: (dir) => {
      const s = sim.current;
      gsap.killTweensOf(s, "rot");
      gsap.to(s, { rot: dir === "vertical" ? 1 : 0, duration: C.VIEW_MOVE_S, ease: C.VIEW_MOVE_EASE });
      wake({ graceMs: 1000 * C.VIEW_MOVE_S + 200 });
      return C.VIEW_MOVE_S;
    },
    snapRot: (r) => {
      gsap.killTweensOf(sim.current, "rot");
      sim.current.rot = r;
      wake();
    },
    setCenterProject: (i) => {
      const n = sim.current.items.length;
      const cur = gsap.utils.wrap(0, n, sim.current.pos);
      const d = gsap.utils.wrap(-n / 2, n / 2, i - cur);
      sim.current.pos = sim.current.target = Math.round(sim.current.pos + d);
      wake();
    },
    activeProject: () => sim.current.items[C.mod(Math.round(sim.current.pos), sim.current.items.length)] ?? 0,
    centerRect: () => {
      const w = window.innerWidth, h = window.innerHeight;
      const { cellW, cellH } = sliderCell(w / Math.max(1, h));
      const rel = Math.round(sim.current.pos) - sim.current.pos;
      return worldRectToScreen(rel * cellW + sim.current.introX, 0, cellW, cellH, w, h);
    },
    dragBy: (dx) => {
      if (!sim.current.interactive) return;
      const w = window.innerWidth, h = window.innerHeight;
      const { cellW } = sliderCell(w / Math.max(1, h));
      const { visibleW } = visibleSize(w / Math.max(1, h));
      sim.current.target -= dx / ((cellW / visibleW) * w);
      wake();
      settleAfter(120);
    },
    settle: () => {
      sim.current.target = Math.round(sim.current.target);
      wake();
    },
    stepBy: (n) => {
      if (!sim.current.interactive) return;
      sim.current.target = Math.round(sim.current.target) + n;
      wake();
    },
    fade: (to, opts) => {
      wake();
      return gsap.to(sim.current, {
        fade: to, duration: 0.55, ease: "power2.inOut", delay: opts?.delay ?? 0,
        onUpdate: () => {
          if (tickerEl.current) tickerEl.current.style.opacity = String(sim.current.fade);
        },
      });
    },
    setInteractive: (v) => {
      sim.current.interactive = v;
    },
    setItems: (items, animate) => {
      wake();
      const s = sim.current;
      gsap.killTweensOf(s);
      const swap = () => {
        s.items = items;
        s.pos = s.target = 0;
      };
      if (!animate) {
        swap();
        s.filterT = 1;
        wake();
        return;
      }
      wake({ graceMs: (C.FILTER_ENTER_S + 0.3) * 1000 });
      gsap.to(s, {
        filterT: 0, duration: C.FILTER_ENTER_S / 2, ease: C.VIEW_MOVE_EASE,
        onComplete: () => {
          swap();
          gsap.to(s, { filterT: 1, duration: C.FILTER_ENTER_S / 2, ease: C.VIEW_MOVE_EASE, onUpdate: () => wake() });
        },
      });
    },
    introPark: () => {
      const x = introParkX();
      sim.current.introX = x;
      sim.current.introFrom = x;
      sim.current.introRunning = false;
      if (window.innerWidth <= C.COMPACT_BP && dialEl.current) {
        gsap.set(dialEl.current, { yPercent: 120 });
        gsap.set(dialMeta.current, { opacity: 0 });
        sim.current.introSpin = 180;
      }
      wake();
    },
    intro: (animate, done) => {
      wake();
      const compact = window.innerWidth <= C.COMPACT_BP;
      const a = window.innerWidth / Math.max(1, window.innerHeight);
      const { visibleW } = visibleSize(a);
      const { cellW } = sliderCell(a);
      const from = 3 * visibleW;
      const lines = groups.current.flatMap((g) => (g ? [g.name, g.meta] : []));
      if (!animate) {
        sim.current.introX = 0;
        sim.current.introRunning = false;
        sim.current.introSpin = 0;
        gsap.set(lines, { yPercent: 0, y: 0 });
        if (compact && dialEl.current) {
          gsap.set(dialEl.current, { yPercent: 0 });
          gsap.set(dialMeta.current, { opacity: 1 });
        }
        done?.();
        playTick();
        return;
      }
      sim.current.introX = from;
      sim.current.introFrom = from;
      sim.current.introPasses = Math.floor(from / cellW);
      sim.current.introDetent = sim.current.introPasses;
      window.setTimeout(() => {
        sim.current.introRunning = true;
        wake();
        gsap.fromTo(lines, { yPercent: 110, y: 0 }, LINE_IN);
        if (compact && dialEl.current) {
          gsap.to(dialEl.current, { yPercent: 0, duration: 1.3, ease: "power3.out" });
          gsap.to(sim.current, { introSpin: 0, duration: 1.3, ease: "power3.out", onUpdate: () => wake() });
          gsap.delayedCall(handoffAt(1.3, "power3.out"), () => {
            gsap.to(dialMeta.current, { opacity: 1, duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE });
            done?.();
          });
        } else done?.();
      }, C.INTRO_HOLD_MS);
    },
  }));

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  // pointer drag with flick, and wheel
  useEffect(() => {
    const el = root.current;
    if (!el || hidden) return;
    let down = false, pid = -1, lastX = 0, lastT = 0, startTarget = 0, vel = 0;
    const onDown = (e: PointerEvent) => {
      if (!sim.current.interactive || (e.pointerType === "mouse" && e.button !== 0)) return;
      down = true; pid = e.pointerId; lastX = e.clientX; lastT = performance.now(); startTarget = sim.current.target; vel = 0;
      el.classList.add("is-dragging");
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      wake();
      window.clearTimeout(settleTimer.current);
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      const w = window.innerWidth, h = window.innerHeight;
      const { cellW } = sliderCell(w / Math.max(1, h));
      const { visibleW } = visibleSize(w / Math.max(1, h));
      const gain = w <= C.MOBILE_DRAG_BP ? C.MOBILE_DRAG_GAIN : C.DRAG_GAIN;
      const d = -((e.clientX - lastX) * gain) / ((cellW / visibleW) * w);
      sim.current.target += d;
      const now = performance.now();
      vel = 0.7 * vel + (d / Math.max(1, now - lastT)) * 0.3;
      lastT = now;
      lastX = e.clientX;
      wake();
    };
    const onUp = (e?: PointerEvent) => {
      if (!down || (e && e.pointerId !== pid)) return;
      down = false; pid = -1;
      el.classList.remove("is-dragging");
      const stale = performance.now() - lastT > 90;
      const moved = sim.current.target + (stale ? 0 : 140 * vel) - startTarget;
      sim.current.target = Math.abs(moved) < C.FLICK_COMMIT_CELLS ? Math.round(startTarget) : Math.round(startTarget) + Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
    };
    const onWheel = (e: WheelEvent) => {
      if (!sim.current.interactive) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      sim.current.target += 0.0016 * gsap.utils.clamp(-140, 140, d);
      wake();
      settleAfter(160);
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(settleTimer.current);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [hidden, settleAfter, wake]);

  const onTick = (pos: number) => {
    const w = window.innerWidth;
    const sc = C.tickScale(w);
    const pitch = C.TICK_PITCH * sc;
    const r = Math.round(pos);
    const frac = pos - r;
    if (w <= 760) {
      if (wheelEl.current) {
        wheelEl.current.style.transform = `translateX(-50%) rotate(${-(60 * pos) + sim.current.introSpin}deg)`;
        const active = 12 * C.mod(Math.round(pos), 6);
        if (dialActive.current !== active) {
          const kids = wheelEl.current.children;
          kids[dialActive.current]?.classList.remove("is-active");
          kids[active]?.classList.add("is-active");
          dialActive.current = active;
        }
      }
      const p = sim.current.items[C.mod(r, sim.current.items.length)];
      if (dialProject.current !== p) {
        dialProject.current = p;
        const pr = projects[p];
        if (dialName.current) dialName.current.textContent = pr.name;
        if (dialType.current) dialType.current.textContent = typeMeta(pr);
        if (dialTag.current) dialTag.current.textContent = pr.tag;
      }
      return;
    }
    for (let i = 0; i < TICK_SLOTS.length; i++) {
      const g = groups.current[i];
      if (!g) continue;
      const d = TICK_SLOTS[i] - frac;
      if (Math.abs(d) * pitch > w / 2 + pitch) {
        g.el.style.visibility = "hidden";
        continue;
      }
      g.el.style.visibility = "visible";
      const near = gsap.utils.clamp(0, 1, 1 - Math.abs(d));
      const gw = (84 + 22 * near) * sc;
      g.el.style.transform = `translate3d(${w / 2 + d * pitch - gw / 2}px, 0, 0)`;
      g.el.style.width = `${gw}px`;
      g.row.style.width = `${C.tickRowWidth(pitch)}px`;
      const p = sim.current.items[C.mod(r + TICK_SLOTS[i], sim.current.items.length)];
      if (g.project !== p) {
        g.project = p;
        const pr = projects[p];
        g.name.textContent = pr.name;
        g.metaType.textContent = typeMeta(pr);
        g.metaTag.textContent = pr.tag;
      }
      const lo = gsap.utils.clamp(0, 1, (near - 0.55) / 0.45);
      g.name.style.opacity = `${lo}`;
      g.meta.style.opacity = `${lo}`;
      const th = (12 + 4 * near) * sc;
      for (let k = 0; k < g.ticks.length; k++) {
        const centre = k === (C.TICKS_PER_GROUP - 1) / 2;
        g.ticks[k].style.height = `${centre ? 32 * sc : th}px`;
        if (centre) g.ticks[k].classList.toggle("is-active", near > 0.5);
      }
    }
  };

  return (
    <Stage
      className="slider-view"
      hidden={hidden}
      awake={awake}
      onContentReady={onContentReady}
      onAdvance={onAdvance}
      rootRef={root}
      overlay={
        <>
          <div className="dial" ref={dialEl} aria-hidden="true">
            <span className="dial-disc" />
            <span className="dial-top-caret" />
            <span className="reveal-mask dial-name-mask">
              <p className="dial-name" data-reveal="line" ref={dialName} />
            </span>
            <p className="dial-meta" ref={dialMeta}>
              <span className="tm-type" ref={dialType} />
              <span className="tm-dot">•</span>
              <span className="tm-tag" ref={dialTag} />
            </p>
            <div className="dial-wheel" ref={wheelEl}>
              {DIAL_DEGS.map((deg) => (
                <i key={deg} className={deg % 60 === 0 ? "major" : undefined} style={{ transform: `rotate(${deg}deg) translateY(-217px)` }} />
              ))}
            </div>
          </div>
          <div className="ticker" ref={tickerEl} aria-hidden="true">
            <span className="ticker-caret" />
            <div className="ticker-strip">
              {TICK_SLOTS.map((slot, i) => (
                <div
                  key={slot}
                  className="tick-group"
                  ref={(el) => {
                    groups.current[i] = el
                      ? {
                          el,
                          name: el.querySelector(".tick-name")!,
                          meta: el.querySelector(".tick-meta")!,
                          metaType: el.querySelector(".tm-type")!,
                          metaTag: el.querySelector(".tm-tag")!,
                          row: el.querySelector(".tick-row")!,
                          ticks: Array.from(el.querySelectorAll<HTMLElement>(".tick-row i")),
                          project: -1,
                        }
                      : null;
                  }}
                >
                  <div className="reveal-mask">
                    <p className="tick-name tick-line" />
                  </div>
                  <div className="reveal-mask">
                    <p className="tick-meta tick-line">
                      <span className="tm-type" />
                      <span className="tm-dot">•</span>
                      <span className="tm-tag" />
                    </p>
                  </div>
                  <div className="tick-row">
                    {Array.from({ length: C.TICKS_PER_GROUP }, (_, k) => (
                      <i key={k} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      }
    >
      <Strip sim={sim} hiddenRef={hiddenRef} onTick={onTick} />
    </Stage>
  );
}
