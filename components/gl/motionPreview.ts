// 10-second looping preview of a motion project's film as a texture on the centre tile (module 90096).
// The reference streams HLS from Mux; we play our own mp4 from the same origin.
import * as THREE from "three";

interface Preview {
  project: number;
  src: string;
  el: HTMLVideoElement;
  texture: THREE.Texture;
  mirror: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null;
  blocked: boolean;
  start: number;
}
let cur: Preview | null = null;

function teardown() {
  if (!cur) return;
  const { el, texture } = cur;
  try {
    el.pause();
  } catch {}
  texture.dispose();
  el.removeAttribute("src");
  el.load();
  el.remove();
  cur = null;
}

export function isMotionPreviewPlaying(): boolean {
  const p = cur;
  return !!p && !p.blocked && !p.el.paused && p.el.readyState >= 2;
}

export function previewTextureFor(project: number): THREE.Texture | null {
  const p = cur;
  if (!p || p.project !== project || p.blocked || !p.texture) return null;
  if (p.el.readyState < 2 || !p.el.videoWidth || !p.el.videoHeight) return null;
  if (p.mirror && !p.mirror.canvas.width) return null;
  if (p.el.paused || p.el.currentTime < p.start) return null;
  return p.texture;
}

export function requestMotionPreview(project: number, src: string | undefined, start = 0): void {
  if (!src) {
    if (cur) teardown();
    return;
  }
  if (cur && cur.project === project && cur.src === src && cur.start === start) return;
  teardown();
  const el = document.createElement("video");
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  el.loop = false;
  el.crossOrigin = "anonymous";
  el.preload = "auto";
  el.width = 1920;
  el.height = 1080;
  el.style.cssText = "position:fixed;left:0;top:0;width:1920px;height:1080px;opacity:0;pointer-events:none;z-index:-1";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  el.src = src;
  const texture = new THREE.VideoTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 8;
  const s = Number.isFinite(start) && start > 0 ? start : 0;
  cur = { project, src, el, texture, mirror: null, blocked: false, start: s };
  el.addEventListener(
    "loadeddata",
    () => {
      if (s > 0 && Math.abs(el.currentTime - s) > 0.25) el.currentTime = s;
      el.play().catch(() => {
        if (cur?.el === el) cur.blocked = true;
      });
    },
    { once: true },
  );
}

export function stopMotionPreview(): void {
  teardown();
}

/** keep the 10s window looping; returns whether a frame is available */
export function tickMotionPreview(): boolean {
  const p = cur;
  if (!p || p.blocked) return false;
  const end = p.start + 10;
  if (p.el.currentTime >= end || p.el.currentTime < p.start - 0.5) p.el.currentTime = p.start;
  return !p.el.paused && p.el.readyState >= 2;
}
