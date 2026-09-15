"use client";
// Vertical strip of project tiles with side tick rails — module 84084.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useProjects } from "@/lib/projects";
import { playTick } from "@/lib/sound";
import * as C from "@/lib/constants";
import { lensCellScale, visibleSize, worldRectToScreen } from "./lens";
import { applyTileCover, type TileCover } from "./tileCover";
import { isMotionPreviewPlaying, previewTextureFor } from "./motionPreview";
import Stage, { useIdleFrameloop, useProjectTextures, WAKE_GRACE_MS } from "./Stage";

const SLOTS = Array.from({ length: 25 }, (_, i) => i - 12);

function listCell(aspect: number) {
  const { visibleW, visibleH } = visibleSize(aspect);
  const { w, h } = C.tileWorldSize(visibleW, visibleH, lensCellScale());
  return { cellW: w, cellH: h };
}
function poolSize() {
  const a = window.innerWidth / Math.max(1, window.innerHeight);
  return C.tilePool(visibleSize(a).visibleH, listCell(a).cellH);
}

interface Sim {
  pos: number; target: number; items: number[]; n: number; fade: number; filterT: number; interactive: boolean;
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
    const { cellW, cellH } = listCell(aspect);
    const rel = gsap.utils.wrap(-pool / 2, pool / 2, slot - s.pos);
    const idx = Math.round(s.pos + rel);
    const project = s.items[C.mod(idx, s.items.length)] ?? 0;
    group.current.position.set(0, -rel * cellH, 0);
    const tex = previewTextureFor(project) ?? textures[project] ?? textures[0];
    if (mat.current.map !== tex) {
      mat.current.map = tex;
      mat.current.color.set("#ffffff");
      mat.current.needsUpdate = true;
    }
    const { visibleH } = visibleSize(aspect);
    const onScreen = Math.abs(rel * cellH) < visibleH / 2 + cellH;
    mesh.current.visible = onScreen && s.fade > 0.01;
    if (!mesh.current.visible) return;
    ensure(project);
    mesh.current.scale.set(cellW, cellH, 1);
    const near = gsap.utils.clamp(0, 1, 1 - Math.abs(rel));
    mat.current.opacity = s.fade * s.filterT * (C.INACTIVE_OPACITY + (1 - C.INACTIVE_OPACITY) * near);
    cover.current.setSaturation(C.INACTIVE_SAT + (1 - C.INACTIVE_SAT) * near);
    cover.current.set(cellW / cellH);
    cover.current.setParallax(0, -C.parallaxNorm(rel * cellH, visibleH / 2));
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

function Column({ sim, hiddenRef, onTick }: { sim: React.RefObject<Sim>; hiddenRef: React.RefObject<boolean>; onTick: (pos: number) => void }) {
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
    s.pos += (s.target - s.pos) * C.easeFactor(1000 * dt);
    if (!hiddenRef.current) onTick(s.pos);
    const r = Math.round(s.pos);
    const sub = gsap.utils.clamp(-3, 3, Math.round((s.pos - r) * (C.TICK_PITCH / 14)));
    const t = r * C.TICKS_PER_GROUP + sub;
    if (!hiddenRef.current && lastTick.current !== null && t !== lastTick.current && Math.abs(t - lastTick.current) <= 3) playTick();
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

export interface ListHandle {
  isReady: () => boolean;
  renderNow: () => void;
  setCenterProject: (i: number) => void;
  activeProject: () => number;
  centerRect: () => { x: number; y: number; w: number; h: number };
  dragBy: (dy: number) => void;
  settle: () => void;
  stepBy: (n: number) => void;
  fade: (to: number, opts?: { delay?: number }) => gsap.core.Tween;
  setInteractive: (v: boolean) => void;
  setItems: (items: number[], animate: boolean) => void;
}

interface LeftRefs { el: HTMLDivElement; label: HTMLElement; name: HTMLElement; ticks: HTMLElement[]; project: number }
interface RightRefs { el: HTMLDivElement; ticks: HTMLElement[] }

export default function ListView({ ref, hidden }: { ref: Ref<ListHandle>; hidden: boolean }) {
  const projects = useProjects();
  const root = useRef<HTMLDivElement>(null);
  const leftRail = useRef<HTMLDivElement>(null);
  const rightRail = useRef<HTMLDivElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const left = useRef<(LeftRefs | null)[]>([]);
  const right = useRef<(RightRefs | null)[]>([]);
  const hiddenRef = useRef(hidden);
  const settleTimer = useRef(0);
  const sim = useRef<Sim>({ pos: 0, target: 0, items: projects.map((_, i) => i), n: projects.length, fade: 1, filterT: 1, interactive: true });

  const isMoving = useCallback(() => isMotionPreviewPlaying() || Math.abs(sim.current.target - sim.current.pos) > 5e-4 || gsap.isTweening(sim.current), []);
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
  const layTicks = (ticks: HTMLElement[], w: number, sc: number, active: boolean) => {
    for (let k = 0; k < ticks.length; k++) {
      const centre = k === (C.TICKS_PER_GROUP - 1) / 2;
      ticks[k].style.width = `${centre ? 32 * sc : w}px`;
      if (centre) ticks[k].classList.toggle("is-active", active);
    }
  };

  useImperativeHandle(ref, () => ({
    isReady: () => ready.current,
    renderNow: () => advance.current?.(performance.now()),
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
      const { cellW, cellH } = listCell(w / Math.max(1, h));
      const rel = Math.round(sim.current.pos) - sim.current.pos;
      return worldRectToScreen(0, -rel * cellH, cellW, cellH, w, h);
    },
    dragBy: (dy) => {
      if (!sim.current.interactive) return;
      const w = window.innerWidth, h = window.innerHeight;
      const { cellH } = listCell(w / Math.max(1, h));
      const { visibleH } = visibleSize(w / Math.max(1, h));
      sim.current.target -= dy / ((cellH / visibleH) * h);
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
          const o = String(sim.current.fade);
          if (leftRail.current) leftRail.current.style.opacity = o;
          if (rightRail.current) rightRail.current.style.opacity = o;
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
  }));

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  useEffect(() => {
    const el = root.current;
    if (!el || hidden) return;
    let down = false, ly = 0;
    const onDown = (e: PointerEvent) => {
      if (!sim.current.interactive || (e.pointerType === "mouse" && e.button !== 0)) return;
      down = true; ly = e.clientY;
      el.classList.add("is-dragging");
      wake();
      window.clearTimeout(settleTimer.current);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const w = window.innerWidth, h = window.innerHeight;
      const { cellH } = listCell(w / Math.max(1, h));
      const { visibleH } = visibleSize(w / Math.max(1, h));
      sim.current.target -= ((e.clientY - ly) * C.DRAG_GAIN) / ((cellH / visibleH) * h);
      ly = e.clientY;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
      settleAfter(80);
    };
    const onWheel = (e: WheelEvent) => {
      if (!sim.current.interactive) return;
      e.preventDefault();
      sim.current.target += 0.0016 * gsap.utils.clamp(-140, 140, e.deltaY);
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
    const h = window.innerHeight;
    const sc = C.tickScale(window.innerWidth);
    const pitch = C.TICK_PITCH * sc;
    const gw = C.tickRowWidth(pitch);
    const r = Math.round(pos);
    const frac = pos - r;
    for (let i = 0; i < SLOTS.length; i++) {
      const l = left.current[i], rr = right.current[i];
      const d = SLOTS[i] - frac;
      if (Math.abs(d) * pitch > h / 2 + pitch) {
        if (l) l.el.style.visibility = "hidden";
        if (rr) rr.el.style.visibility = "hidden";
        continue;
      }
      const near = gsap.utils.clamp(0, 1, 1 - Math.abs(d));
      const tf = `translate3d(0, ${h / 2 + d * pitch - gw / 2}px, 0)`;
      const tw = (12 + 4 * near) * sc;
      const active = near > 0.5;
      const p = sim.current.items[C.mod(r + SLOTS[i], sim.current.items.length)];
      if (l) {
        l.el.style.visibility = "visible";
        l.el.style.transform = tf;
        l.el.style.height = `${gw}px`;
        if (l.project !== p) {
          l.project = p;
          l.name.textContent = projects[p].name;
        }
        l.label.style.opacity = `${gsap.utils.clamp(0, 1, (near - 0.55) / 0.45)}`;
        layTicks(l.ticks, tw, sc, active);
      }
      if (rr) {
        rr.el.style.visibility = "visible";
        rr.el.style.transform = tf;
        rr.el.style.height = `${gw}px`;
        layTicks(rr.ticks, tw, sc, active);
      }
    }
  };

  return (
    <Stage
      className="list-view"
      hidden={hidden}
      awake={awake}
      onContentReady={onContentReady}
      onAdvance={onAdvance}
      rootRef={root}
      overlay={
        <>
          <div className="vticker" ref={leftRail} aria-hidden="true">
            <span className="vticker-caret" ref={caret} />
            <div className="vticker-strip">
              {SLOTS.map((slot, i) => (
                <div
                  key={slot}
                  className="vtick-group"
                  ref={(el) => {
                    left.current[i] = el
                      ? { el, label: el.querySelector(".vtick-label")!, name: el.querySelector(".vtick-name")!, ticks: Array.from(el.querySelectorAll<HTMLElement>(".vtick-col i")), project: -1 }
                      : null;
                  }}
                >
                  <div className="vtick-col">
                    {Array.from({ length: C.TICKS_PER_GROUP }, (_, k) => (
                      <i key={k} />
                    ))}
                  </div>
                  <div className="vtick-label">
                    <p className="vtick-name" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="vticker vticker-right" ref={rightRail} aria-hidden="true">
            <div className="vticker-strip">
              {SLOTS.map((slot, i) => (
                <div
                  key={slot}
                  className="vtick-group"
                  ref={(el) => {
                    right.current[i] = el ? { el, ticks: Array.from(el.querySelectorAll<HTMLElement>(".vtick-col i")) } : null;
                  }}
                >
                  <div className="vtick-col">
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
      <Column sim={sim} hiddenRef={hiddenRef} onTick={onTick} />
    </Stage>
  );
}
