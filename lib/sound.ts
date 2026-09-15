// UI sound: one decoded tick buffer, re-pitched for the shutter and the print motor.
// The AudioContext is created lazily on the first real gesture (autoplay policy).
import { tapHaptic } from "./haptic";

const UNLOCK_EVENTS = ["touchend", "pointerdown", "mousedown", "keydown"];
let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let bytes: Promise<ArrayBuffer> | null = null;
let decoding = false;
let unlocked = false;
let enabled = true;
let lastAt = 0;
let iosKeepAlive: HTMLAudioElement | null = null;

function fetchTick(): Promise<ArrayBuffer> {
  if (!bytes) bytes = fetch("/tick.mp3").then((r) => r.arrayBuffer());
  return bytes;
}

function context(): AudioContext | null {
  fetchTick();
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  if (!buffer && !decoding && bytes) {
    decoding = true;
    const c = ctx;
    bytes
      .then((b) => new Promise<AudioBuffer>((res, rej) => c.decodeAudioData(b.slice(0), res, rej)))
      .then((b) => {
        buffer = b;
      })
      .catch((e) => console.warn("Tick sound unavailable:", e));
  }
  return ctx;
}

function iosAudioSession() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) {
    try {
      nav.audioSession.type = "playback";
    } catch {}
    return;
  }
  const isIOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  if (isIOS && !iosKeepAlive) {
    iosKeepAlive = new Audio(
      "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQ4AAAAAAAAAAAAAAAAAAAAA",
    );
    iosKeepAlive.loop = true;
    iosKeepAlive.play().catch(() => {
      iosKeepAlive = null;
    });
  }
}

function unlock() {
  const c = context();
  if (!c) return;
  iosAudioSession();
  if (c.state === "suspended") c.resume();
  if (!unlocked) {
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, c.sampleRate);
    s.connect(c.destination);
    s.start(0);
  }
  if (c.state === "running") {
    unlocked = true;
    UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, unlock, true));
  }
}

if (typeof window !== "undefined") {
  const warm = () => {
    fetchTick();
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 2500 });
  else setTimeout(warm, 1500);
  UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ctx?.state === "suspended") ctx.resume();
  });
}

function ready(): AudioContext | null {
  const c = context();
  if (!c || c.state !== "running" || !buffer) return null;
  return c;
}

function voice(c: AudioContext, at: number, rate: number, gain: number) {
  const s = c.createBufferSource();
  const g = c.createGain();
  s.buffer = buffer;
  s.playbackRate.value = rate;
  g.gain.value = gain;
  s.connect(g);
  g.connect(c.destination);
  s.start(at);
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on) unlock();
}

export function playTick(): void {
  tapHaptic();
  if (!enabled) return;
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  if (t - lastAt < 0.02) return;
  lastAt = t;
  voice(c, t, 1, 0.6);
}

export function playShutter(): void {
  tapHaptic();
  if (!enabled) return;
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  lastAt = t;
  voice(c, t, 0.62, 0.5);
  voice(c, t + 0.09, 1, 0.75);
}

export function playPrintMotor(seconds = 2): void {
  tapHaptic();
  if (!enabled) return;
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  for (let d = 0; d < seconds; d += 0.055) voice(c, t + d, 1.9 + 0.3 * Math.random(), 0.11);
}
