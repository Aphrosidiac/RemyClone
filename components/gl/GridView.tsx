"use client";
// Infinite 2D grid of project tiles with edge tick rails — module 51735.
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
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

const X_SLOTS = Array.from({ length: 41 }, (_, i) => i - 20);
const Y_SLOTS = Array.from({ length: 25 }, (_, i) => i - 12);
const ZOOM = C.VIEW_ZOOM;
const ZOOM_GESTURES = 0.81 * ZOOM;

function cellAt(aspect: number, zoom: number) {
  const { visibleW, visibleH } = visibleSize(aspect);
  const t = C.tileWorldSize(visibleW, visibleH, lensCellScale());
  return { cellW: t.w * zoom, cellH: t.h * zoom, pitchX: t.w * zoom, pitchY: t.h * zoom, visibleW };
}
function pitchPx(aspect: number, zoom: number, w: number, h: number) {
  const { pitchX, pitchY } = cellAt(aspect, zoom);
  const { visibleW, visibleH } = visibleSize(aspect);
  return { pitchXpx: (pitchX / visibleW) * w, pitchYpx: (pitchY / visibleH) * h };
}
function ring() {
  const a = window.innerWidth / Math.max(1, window.innerHeight);
  const { visibleW, visibleH } = visibleSize(a);
  const { cellW, cellH } = cellAt(a, ZOOM);
  return { cols: C.tilePool(visibleW, cellW), rows: C.tilePool(visibleH, cellH) };
}

interface Sim {
  gx: number; gy: number; gxTarget: number; gyTarget: number;
  zoom: number; zoomTarget: number;
  n: number; items: number[]; filter: number[]; filterT: number; filterUntil: number;
  fade: number; interactive: boolean;
  buildT: number; buildAxis: "x" | "y"; buildDir: "in" | "out";
}
const itemAt = (s: Sim, col: number, row: number) => C.mod(col + row, s.items.length || 1);

function Tile({ col, row, cols, rows, sim, textures, ensure }: { col: number; row: number; cols: number; rows: number; sim: React.RefObject<Sim>; textures: THREE.Texture[]; ensure: (i: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const cover = useRef<TileCover | null>(null);
  const local = useRef({ o: 1, s: 1 });
  useFrame(() => {
    if (!group.current || !mesh.current || !mat.current) return;
    cover.current ||= applyTileCover(mat.current);
    const s = sim.current;
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const { cellW, cellH, pitchX, pitchY } = cellAt(aspect, s.zoom);
    const rx = gsap.utils.wrap(-cols / 2, cols / 2, col - s.gx);
    const ry = gsap.utils.wrap(-rows / 2, rows / 2, row - s.gy);
    const { visibleW, visibleH } = visibleSize(aspect);
    const alongX = s.buildAxis === "x";
    const band = C.bandOffset(s.buildT, Math.round(alongX ? rx : ry), alongX ? visibleW / 2 + cellW : visibleH / 2 + cellH, s.buildDir);
    const y = -(ry * pitchY + (alongX ? 0 : band));
    const gcol = Math.round(s.gx + rx);
    const grow = Math.round(s.gy + ry);
    const project = s.items[itemAt(s, gcol, grow)] ?? 0;
    local.current.o = s.filterT;
    local.current.s = 1;
    const x = rx * pitchX + (alongX ? band : 0);
    group.current.position.set(x, y, 0);
    ensure(project);
    const centre = gcol === Math.round(s.gx) && grow === Math.round(s.gy);
    const tex = (centre ? previewTextureFor(project) : null) ?? textures[project] ?? textures[0];
    if (mat.current.map !== tex) {
      mat.current.map = tex;
      mat.current.color.set("#ffffff");
      mat.current.needsUpdate = true;
    }
    const onScreen = !(Math.abs(x) > visibleW / 2 + cellW || Math.abs(y) > visibleH / 2 + cellH || (!(s.filterT > 0.01) && local.current.o < 0.01));
    mesh.current.visible = onScreen && local.current.o * s.fade > 0.01;
    if (!mesh.current.visible) return;
    cover.current.setParallax(C.parallaxNorm(x, visibleW / 2), C.parallaxNorm(y, visibleH / 2));
    mesh.current.scale.set(cellW * local.current.s, cellH * local.current.s, 1);
    const near = gsap.utils.clamp(0, 1, 1 - Math.max(Math.abs(rx), Math.abs(ry)));
    mat.current.opacity = local.current.o * s.fade * (C.INACTIVE_OPACITY + (1 - C.INACTIVE_OPACITY) * near);
    cover.current.setSaturation(C.INACTIVE_SAT + (1 - C.INACTIVE_SAT) * near);
    cover.current.set(cellW / cellH);
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

function Field({ sim, hiddenRef, ringRef, onTick }: { sim: React.RefObject<Sim>; hiddenRef: React.RefObject<boolean>; ringRef: React.RefObject<{ cols: number; rows: number }>; onTick: (gx: number, gy: number) => void }) {
  const last = useRef({ c: 0, r: 0 });
  const { textures, ensure } = useProjectTextures();
  const [size, setSize] = useState(ring);
  useEffect(() => {
    const f = () => {
      const r = ring();
      setSize((s) => (s.cols === r.cols && s.rows === r.rows ? s : r));
    };
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const cols = useMemo(() => C.poolSlots(size.cols), [size.cols]);
  const rows = useMemo(() => C.poolSlots(size.rows), [size.rows]);
  useEffect(() => {
    ringRef.current = size;
  }, [size, ringRef]);
  useFrame((_, dt) => {
    const s = sim.current;
    const k = C.easeFactor(1000 * dt);
    s.gx += (s.gxTarget - s.gx) * k;
    s.gy += (s.gyTarget - s.gy) * k;
    s.zoom += (s.zoomTarget - s.zoom) * k;
    if (!hiddenRef.current) onTick(s.gx, s.gy);
    const c = Math.round(s.gx), r = Math.round(s.gy);
    if (c !== last.current.c || r !== last.current.r) {
      const jump = Math.abs(c - last.current.c) + Math.abs(r - last.current.r);
      if (!hiddenRef.current && jump <= 2) playTick();
      last.current = { c, r };
    }
  });
  return (
    <group>
      {cols.map((c) => rows.map((r) => <Tile key={`${c}:${r}`} col={c} row={r} cols={cols.length} rows={rows.length} sim={sim} textures={textures} ensure={ensure} />))}
    </group>
  );
}

export interface GridHandle {
  isReady: () => boolean;
  renderNow: () => void;
  setCenterProject: (i: number) => void;
  activeProject: () => number;
  setItems: (items: number[], animate: boolean) => void;
  centerRect: () => { x: number; y: number; w: number; h: number };
  dragBy: (dx: number, dy: number) => void;
  settle: () => void;
  stepBy: (dx: number, dy: number) => void;
  setGesturesActive: (on: boolean) => void;
  fade: (to: number, opts?: { delay?: number }) => gsap.core.Tween;
  setInteractive: (v: boolean) => void;
  buildIn: (from: "slider" | "list", animate?: boolean) => number;
  flyOut: (to: "slider" | "list") => number;
}

interface Rail {
  el: HTMLDivElement;
  groups: HTMLElement[];
  marks: HTMLElement[][];
}

export default function GridView({ ref, hidden }: { ref: Ref<GridHandle>; hidden: boolean }) {
  const projects = useProjects();
  const root = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef(hidden);
  const settleTimer = useRef(0);
  const ringRef = useRef({ cols: 5, rows: 5 });
  const rails = useRef<{ top: Rail | null; bottom: Rail | null; left: Rail | null; right: Rail | null }>({ top: null, bottom: null, left: null, right: null });
  const sim = useRef<Sim>({
    gx: 0, gy: 0, gxTarget: 0, gyTarget: 0, zoom: ZOOM, zoomTarget: ZOOM, n: projects.length,
    items: projects.map((_, i) => i), filter: [], filterT: 1, filterUntil: 0, fade: 1, interactive: true,
    buildT: 1e4, buildAxis: "y", buildDir: "in",
  });

  const layRail = (rail: Rail | null, v: number, axis: "x" | "y") => {
    if (!rail) return;
    const r = rail.el.getBoundingClientRect();
    const span = axis === "x" ? r.width : r.height;
    if (span <= 0) return;
    const sc = C.tickScale(window.innerWidth);
    const pitch = C.TICK_PITCH * sc;
    const gw = C.tickRowWidth(pitch);
    const rv = Math.round(v);
    const frac = v - rv;
    const slots = axis === "x" ? X_SLOTS : Y_SLOTS;
    for (let i = 0; i < slots.length; i++) {
      const g = rail.groups[i];
      if (!g) continue;
      const d = slots[i] - frac;
      if (Math.abs(d) * pitch > span / 2 + pitch) {
        g.style.visibility = "hidden";
        continue;
      }
      const pos = span / 2 + d * pitch - gw / 2;
      g.style.visibility = "visible";
      if (axis === "x") {
        g.style.width = `${gw}px`;
        g.style.transform = `translate3d(${pos}px, 0, 0)`;
      } else {
        g.style.height = `${gw}px`;
        g.style.transform = `translate3d(0, ${pos}px, 0)`;
      }
      const marks = rail.marks[i];
      if (!marks) continue;
      const step = (gw - C.TICK_W) / (C.TICKS_PER_GROUP - 1);
      for (let k = 0; k < marks.length; k++) {
        const p = pos + k * step;
        marks[k].style.visibility = p < 0 || p > span - C.TICK_W ? "hidden" : "visible";
      }
    }
  };
  const onTick = useCallback((gx: number, gy: number) => {
    layRail(rails.current.top, gx, "x");
    layRail(rails.current.bottom, gx, "x");
    layRail(rails.current.left, gy, "y");
    layRail(rails.current.right, gy, "y");
  }, []);

  const isMoving = useCallback(() => {
    const s = sim.current;
    return isMotionPreviewPlaying() || Math.abs(s.gxTarget - s.gx) > 5e-4 || Math.abs(s.gyTarget - s.gy) > 5e-4 || Math.abs(s.zoomTarget - s.zoom) > 5e-4 || performance.now() < s.filterUntil || gsap.isTweening(s);
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

  /** the build/fly animation between the strip views and the grid */
  const build = useCallback(
    (other: "slider" | "list", dir: "in" | "out", animate = true) => {
      const s = sim.current;
      s.buildAxis = other === "slider" ? "y" : "x";
      s.buildDir = dir;
      const bands = other === "slider" ? ringRef.current.rows : ringRef.current.cols;
      const dur = C.bandedDuration(Math.max(3, bands - 2), dir);
      const isIn = dir === "in";
      gsap.killTweensOf(s, "buildT,zoom,zoomTarget");
      s.buildT = isIn ? 0 : dur;
      s.zoom = s.zoomTarget = isIn ? 1 : ZOOM;
      if (!animate) {
        wake();
        return dur;
      }
      gsap.to(s, { buildT: isIn ? dur : 0, duration: dur, ease: "none" });
      const z = isIn ? ZOOM : 1;
      gsap.to(s, { zoom: z, zoomTarget: z, duration: dur, ease: C.VIEW_EASE });
      wake({ graceMs: 1000 * dur + 200 });
      return dur;
    },
    [wake],
  );
  const settleAfter = useCallback(
    (ms = 600) => {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        if (sim.current.zoom < 1.2) {
          sim.current.gxTarget = Math.round(sim.current.gxTarget);
          sim.current.gyTarget = Math.round(sim.current.gyTarget);
        }
        wake();
      }, ms);
    },
    [wake],
  );

  useImperativeHandle(ref, () => ({
    isReady: () => ready.current,
    renderNow: () => advance.current?.(performance.now()),
    setCenterProject: (project) => {
      const s = sim.current;
      const n = s.items.length || 1;
      const c = Math.round(s.gx);
      let r = Math.round(s.gy);
      const i = s.items.indexOf(project);
      if (i >= 0) {
        let d = C.mod(i - C.mod(c + r, n), n);
        if (d > n / 2) d -= n;
        r += d;
      }
      s.gx = s.gxTarget = c;
      s.gy = s.gyTarget = r;
      wake();
    },
    activeProject: () => {
      const s = sim.current;
      return s.items[itemAt(s, Math.round(s.gx), Math.round(s.gy))] ?? 0;
    },
    setItems: (items, animate) => {
      const s = sim.current;
      gsap.killTweensOf(s);
      const swap = () => {
        s.items = items;
        s.gx = s.gxTarget = 0;
        s.gy = s.gyTarget = 0;
      };
      if (!animate) {
        swap();
        s.filterT = 1;
        wake();
        return;
      }
      s.filterUntil = performance.now() + (C.FILTER_ENTER_S + 0.3) * 1000;
      wake({ graceMs: (C.FILTER_ENTER_S + 0.3) * 1000 });
      gsap.to(s, {
        filterT: 0, duration: C.FILTER_ENTER_S / 2, ease: C.VIEW_MOVE_EASE,
        onComplete: () => {
          swap();
          gsap.to(s, { filterT: 1, duration: C.FILTER_ENTER_S / 2, ease: C.VIEW_MOVE_EASE, onUpdate: () => wake() });
        },
      });
    },
    centerRect: () => {
      const s = sim.current;
      const w = window.innerWidth, h = window.innerHeight;
      const { cellW, cellH, pitchX, pitchY } = cellAt(w / Math.max(1, h), s.zoom);
      return worldRectToScreen((Math.round(s.gx) - s.gx) * pitchX, -(Math.round(s.gy) - s.gy) * pitchY, cellW, cellH, w, h);
    },
    dragBy: (dx, dy) => {
      if (!sim.current.interactive) return;
      const w = window.innerWidth, h = window.innerHeight;
      const { pitchXpx, pitchYpx } = pitchPx(w / Math.max(1, h), sim.current.zoom, w, h);
      sim.current.gxTarget -= dx / pitchXpx;
      sim.current.gyTarget -= dy / pitchYpx;
      wake();
      settleAfter(500);
    },
    settle: () => {
      sim.current.gxTarget = Math.round(sim.current.gxTarget);
      sim.current.gyTarget = Math.round(sim.current.gyTarget);
      wake();
    },
    stepBy: (dx, dy) => {
      if (!sim.current.interactive) return;
      sim.current.gxTarget = Math.round(sim.current.gxTarget) + dx;
      sim.current.gyTarget = Math.round(sim.current.gyTarget) + dy;
      wake();
    },
    setGesturesActive: (on) => {
      gsap.killTweensOf(sim.current, "zoom,zoomTarget");
      sim.current.zoomTarget = on ? ZOOM_GESTURES : ZOOM;
      if (!on) {
        sim.current.gxTarget = Math.round(sim.current.gxTarget);
        sim.current.gyTarget = Math.round(sim.current.gyTarget);
      }
      wake();
    },
    fade: (to, opts) => {
      wake();
      return gsap.to(sim.current, { fade: to, duration: 0.55, ease: "power2.inOut", delay: opts?.delay ?? 0 });
    },
    setInteractive: (v) => {
      sim.current.interactive = v;
    },
    buildIn: (from, animate) => build(from, "in", animate ?? true),
    flyOut: (to) => build(to, "out"),
  }));

  useEffect(() => {
    hiddenRef.current = hidden;
    if (hidden) {
      gsap.killTweensOf(sim.current, "buildT,zoom,zoomTarget");
      sim.current.buildT = 1e4;
      sim.current.zoom = sim.current.zoomTarget = ZOOM;
    }
  }, [hidden]);

  useEffect(() => {
    const el = root.current;
    if (!el || hidden) return;
    let down = false, lx = 0, ly = 0;
    const onDown = (e: PointerEvent) => {
      if (!sim.current.interactive || (e.pointerType === "mouse" && e.button !== 0)) return;
      down = true; lx = e.clientX; ly = e.clientY;
      el.classList.add("is-dragging");
      wake();
      window.clearTimeout(settleTimer.current);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const w = window.innerWidth, h = window.innerHeight;
      const { pitchXpx, pitchYpx } = pitchPx(w / Math.max(1, h), sim.current.zoom, w, h);
      sim.current.gxTarget -= ((e.clientX - lx) * C.DRAG_GAIN) / pitchXpx;
      sim.current.gyTarget -= ((e.clientY - ly) * C.DRAG_GAIN) / pitchYpx;
      lx = e.clientX; ly = e.clientY;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
      settleAfter(250);
    };
    const onWheel = (e: WheelEvent) => {
      if (!sim.current.interactive) return;
      e.preventDefault();
      const w = window.innerWidth, h = window.innerHeight;
      const { pitchXpx, pitchYpx } = pitchPx(w / Math.max(1, h), sim.current.zoom, w, h);
      sim.current.gxTarget += (gsap.utils.clamp(-80, 80, e.deltaX) / pitchXpx) * 1.4;
      sim.current.gyTarget += (gsap.utils.clamp(-80, 80, e.deltaY) / pitchYpx) * 1.4;
      wake();
      settleAfter(350);
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

  const railDefs: [keyof typeof rails.current, "x" | "y"][] = [["top", "x"], ["bottom", "x"], ["left", "y"], ["right", "y"]];
  return (
    <Stage
      className="grid-view"
      hidden={hidden}
      awake={awake}
      onContentReady={onContentReady}
      onAdvance={onAdvance}
      rootRef={root}
      overlay={
        <>
          {railDefs.map(([side, axis]) => (
            <div key={side} className={`gticker gticker-${side}`} aria-hidden="true">
              <div
                className="gticker-strip"
                ref={(el) => {
                  if (!el) {
                    rails.current[side] = null;
                    return;
                  }
                  const groups = Array.from(el.querySelectorAll<HTMLElement>(".gtick-group"));
                  rails.current[side] = { el, groups, marks: groups.map((g) => Array.from(g.querySelectorAll<HTMLElement>("i"))) };
                }}
              >
                {(axis === "x" ? X_SLOTS : Y_SLOTS).map((slot) => (
                  <div key={slot} className="gtick-group">
                    <div className={axis === "x" ? "tick-row" : "vtick-col"}>
                      {Array.from({ length: C.TICKS_PER_GROUP }, (_, k) => (
                        <i key={k} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      }
    >
      <Field sim={sim} hiddenRef={hiddenRef} ringRef={ringRef} onTick={onTick} />
    </Stage>
  );
}
