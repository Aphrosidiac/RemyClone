"use client";
// The WebGL stage every gallery view renders into (module 56910): an R3F canvas that only runs
// its frameloop while something moves, an optional fisheye pass (cube capture + mirror-sphere
// lens, module 67929), the DOM overlay, and the shared texture / idle hooks.
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import * as THREE from "three";
import { Canvas, createPortal, useFrame, useLoader, useThree } from "@react-three/fiber";
import { getServerLens, isFisheyeOn, isLensLive, lensAmount, LENS_MORPH_S, subscribeLens } from "@/lib/lens";
import { useProjects } from "@/lib/projects";
import { focalPx, lensRadiusPx } from "./lens";

export const WAKE_GRACE_MS = 2000;

/** run the frameloop only while `isMoving()` says so; sleep 400ms after motion stops */
export function useIdleFrameloop(isMoving: () => boolean, hidden: boolean) {
  const [awake, setAwake] = useState(true);
  const lastMove = useRef(0);
  const graceUntil = useRef(0);
  const wake = useCallback((opts?: { graceMs?: number }) => {
    const now = performance.now();
    lastMove.current = now;
    if (opts?.graceMs != null && opts.graceMs > 0) graceUntil.current = Math.max(graceUntil.current, now + opts.graceMs);
    setAwake(true);
  }, []);
  useEffect(() => {
    wake({ graceMs: WAKE_GRACE_MS });
    if (hidden) return;
    const onIris = () => wake({ graceMs: WAKE_GRACE_MS });
    window.addEventListener("iris-opened", onIris);
    const iv = window.setInterval(() => {
      if (isMoving()) {
        lastMove.current = performance.now();
        setAwake(true);
      } else if (performance.now() > graceUntil.current && performance.now() - lastMove.current > 400) {
        setAwake(false);
      }
    }, 120);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("iris-opened", onIris);
    };
  }, [hidden, isMoving, wake]);
  return { awake, wake };
}

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAACEhIQAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

export function useProjectTextures() {
  const projects = useProjects();
  const urls = useMemo(() => projects.map((p) => p.image || BLANK), [projects]);
  const unique = useMemo(() => [...new Set(urls)], [urls]);
  const loaded = useLoader(THREE.TextureLoader, unique, (l) => {
    (l as THREE.TextureLoader).setCrossOrigin("anonymous");
  });
  const list = useMemo(() => (Array.isArray(loaded) ? loaded : [loaded]), [loaded]);
  const textures = useMemo(() => {
    const m = new Map(unique.map((u, i) => [u, list[i]]));
    return urls.map((u) => m.get(u)!);
  }, [urls, unique, list]);
  useLayoutEffect(() => {
    for (const t of list) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate = true;
    }
  }, [list]);
  const ensure = useMemo(() => () => {}, []);
  return { textures, ensure };
}

const LENS_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const LENS_FRAG = `
  precision highp float;
  uniform samplerCube uScene;
  uniform vec2 uResolution;
  uniform float uAmount;
  uniform float uRadius;
  uniform float uFocal;
  varying vec2 vUv;
  float radiusAt(float theta) {
    float straight = uFocal * tan(theta);
    float curved = uRadius * sin(theta * 0.5);
    return mix(straight, curved, uAmount);
  }
  const float THETA_MAX = 1.48;
  vec3 toDisplay(vec3 c) {
    return mix(
      pow(c, vec3(0.41666)) * 1.055 - vec3(0.055),
      c * 12.92,
      vec3(lessThanEqual(c, vec3(0.0031308)))
    );
  }
  void main() {
    vec2 px = (vUv - 0.5) * uResolution;
    float sr = length(px);
    if (sr < 1e-4) {
      vec4 c = textureCube(uScene, vec3(0.0, 0.0, -1.0));
      gl_FragColor = vec4(toDisplay(c.rgb), c.a);
      return;
    }
    if (sr > radiusAt(THETA_MAX)) {
      gl_FragColor = vec4(0.0);
      return;
    }
    float lo = 0.0;
    float hi = THETA_MAX;
    for (int i = 0; i < 20; i++) {
      float mid = (lo + hi) * 0.5;
      if (radiusAt(mid) < sr) lo = mid; else hi = mid;
    }
    float theta = (lo + hi) * 0.5;
    vec3 dir = vec3(sin(theta) * (px / sr), -cos(theta));
    vec4 c = textureCube(uScene, dir);
    gl_FragColor = vec4(toDisplay(c.rgb), c.a);
  }
`;

interface LensRig {
  target: THREE.WebGLCubeRenderTarget;
  cubeCamera: THREE.CubeCamera;
  material: THREE.ShaderMaterial;
  pass: THREE.Scene;
  passCamera: THREE.Camera;
}

/** children render into a private scene captured by a cube camera, then warped through the lens */
function LensPass({ resolution, children }: { resolution: number; children: ReactNode }) {
  const camera = useThree((s) => s.camera);
  const [scene] = useState(() => new THREE.Scene());
  const rig = useRef<LensRig | null>(null);
  useEffect(
    () => () => {
      const r = rig.current;
      r?.target.dispose();
      r?.material.dispose();
      r?.pass.clear();
      rig.current = null;
    },
    [],
  );
  useFrame((state) => {
    if (!rig.current) {
      const target = new THREE.WebGLCubeRenderTarget(resolution, { generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      target.texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.ShaderMaterial({
        vertexShader: LENS_VERT,
        fragmentShader: LENS_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uScene: { value: target.texture },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uAmount: { value: lensAmount() },
          uRadius: { value: 1 },
          uFocal: { value: 1 },
        },
      });
      const pass = new THREE.Scene();
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      quad.frustumCulled = false;
      pass.add(quad);
      rig.current = { target, cubeCamera: new THREE.CubeCamera(0.1, 1000, target), material, pass, passCamera: new THREE.Camera() };
    }
    const r = rig.current;
    const u = r.material.uniforms;
    u.uResolution.value.set(state.size.width, state.size.height);
    u.uRadius.value = lensRadiusPx(state.size.width, state.size.height);
    u.uFocal.value = focalPx(state.size.height);
    u.uAmount.value = lensAmount();
    r.cubeCamera.position.copy(camera.position);
    r.cubeCamera.update(state.gl, scene);
    state.gl.render(r.pass, r.passCamera);
  }, 1);
  return <>{createPortal(children, scene)}</>;
}

function Ready({ onReady, children }: { onReady?: () => void; children: ReactNode }) {
  useLayoutEffect(() => {
    onReady?.();
  }, [onReady]);
  return <>{children}</>;
}

function Advancer({ onAdvance }: { onAdvance: (fn: ((t: number) => void) | null) => void }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    onAdvance((t) => advance(t, true));
    return () => onAdvance(null);
  }, [advance, onAdvance]);
  return null;
}

function Kick({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (!active) return;
    let stop = false, n = 0;
    const loop = () => {
      if (stop) return;
      invalidate();
      if (++n < 12) requestAnimationFrame(loop);
    };
    loop();
    return () => {
      stop = true;
    };
  }, [active, invalidate]);
  return null;
}

export interface StageProps {
  className: string;
  hidden: boolean;
  rootRef: Ref<HTMLDivElement>;
  children: ReactNode;
  overlay?: ReactNode;
  awake?: boolean;
  onContentReady?: () => void;
  onAdvance?: (fn: ((t: number) => void) | null) => void;
}

export default function Stage({ className, hidden, rootRef, children, overlay, awake = true, onContentReady, onAdvance }: StageProps) {
  const [docHidden, setDocHidden] = useState(false);
  useEffect(() => {
    const f = () => setDocHidden(document.hidden);
    f();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  const lensLive = useSyncExternalStore(subscribeLens, isLensLive, getServerLens);
  const fisheye = useSyncExternalStore(subscribeLens, isFisheyeOn, getServerLens);
  const [morphing, setMorphing] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setMorphing(true);
    const t = window.setTimeout(() => setMorphing(false), 1000 * LENS_MORPH_S + 400);
    return () => window.clearTimeout(t);
  }, [fisheye]);
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    let t = 0;
    const f = () => {
      setResizing(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setResizing(false), 500);
    };
    window.addEventListener("resize", f);
    window.addEventListener("orientationchange", f);
    return () => {
      window.removeEventListener("resize", f);
      window.removeEventListener("orientationchange", f);
      window.clearTimeout(t);
    };
  }, []);
  const frameloop: "always" | "never" = !hidden && !docHidden && (awake || morphing || resizing) ? "always" : "never";

  const inner = (
    <>
      <Suspense fallback={null}>
        <Ready onReady={onContentReady}>{children}</Ready>
      </Suspense>
    </>
  );

  return (
    <div ref={rootRef} className={className} data-frameloop={frameloop} style={{ visibility: hidden ? "hidden" : "visible", pointerEvents: hidden ? "none" : "auto" }} aria-hidden={hidden}>
      <div className="stage">
        <Canvas
          flat
          dpr={[1, 2]}
          frameloop={frameloop}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping, powerPreference: "high-performance", preserveDrawingBuffer: true }}
          style={{ touchAction: "none" }}
          camera={{ position: [0, 0, 10], fov: 48 }}
        >
          <Kick active={frameloop !== "never"} />
          {onAdvance && <Advancer onAdvance={onAdvance} />}
          {lensLive ? <LensPass resolution={1536}>{inner}</LensPass> : inner}
        </Canvas>
        {lensLive && <div className="stage-vignette" aria-hidden="true" />}
      </div>
      {overlay}
    </div>
  );
}
