"use client";
// Photo booth easter egg (module 55261): a "frame" hand gesture starts a 3-2-1 countdown, the
// webcam frame is developed like an instant print, and can be downloaded as a branded card.
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import gsap from "gsap";
import Roll from "./Roll";
import { playPrintMotor, playShutter, playTick } from "@/lib/sound";
import { SITE_NAME } from "@/lib/site";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const PRINT_RATIO = 0.7504132231404959; // 454/605

interface Print {
  url: string;
  w: number;
  h: number;
  stamp: string;
  canvas: HTMLCanvasElement;
}
export interface BoothHandle {
  start: () => void;
  dismiss: () => void;
  isActive: () => boolean;
}

/** crop to the print ratio, then grade: warm contrast, halation, grain, vignette, date burn */
function develop(source: HTMLCanvasElement, when: Date): HTMLCanvasElement {
  const cw = Math.min(source.width, source.height * PRINT_RATIO);
  const ch = cw / PRINT_RATIO;
  const crop = document.createElement("canvas");
  crop.width = Math.round(cw);
  crop.height = Math.round(ch);
  crop.getContext("2d")!.drawImage(source, (source.width - cw) / 2, (source.height - ch) / 2, cw, ch, 0, 0, crop.width, crop.height);

  const out = document.createElement("canvas");
  out.width = crop.width;
  out.height = crop.height;
  const g = out.getContext("2d")!;
  g.filter = "contrast(1.18) saturate(1.3) brightness(1.08) sepia(0.12)";
  g.drawImage(crop, 0, 0);
  g.filter = "blur(6px) brightness(1.35)";
  g.globalCompositeOperation = "lighten";
  g.globalAlpha = 0.28;
  g.drawImage(crop, 0, 0);
  g.filter = "none";
  g.globalAlpha = 1;
  g.globalCompositeOperation = "screen";
  g.fillStyle = "rgba(18, 34, 26, 0.5)";
  g.fillRect(0, 0, out.width, out.height);
  g.globalCompositeOperation = "overlay";
  g.fillStyle = "rgba(255, 168, 54, 0.12)";
  g.fillRect(0, 0, out.width, out.height);
  const grain = document.createElement("canvas");
  grain.width = grain.height = 128;
  const gg = grain.getContext("2d")!;
  const id = gg.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 80 + 96 * Math.random();
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 52;
  }
  gg.putImageData(id, 0, 0);
  g.fillStyle = g.createPattern(grain, "repeat")!;
  g.fillRect(0, 0, out.width, out.height);
  g.globalCompositeOperation = "multiply";
  const vig = g.createRadialGradient(out.width / 2, out.height / 2, 0.38 * Math.min(out.width, out.height), out.width / 2, out.height / 2, 0.58 * Math.hypot(out.width, out.height));
  vig.addColorStop(0, "rgba(255,255,255,1)");
  vig.addColorStop(0.72, "rgba(216,208,200,1)");
  vig.addColorStop(1, "rgba(148,142,138,1)");
  g.fillStyle = vig;
  g.fillRect(0, 0, out.width, out.height);
  g.globalCompositeOperation = "source-over";
  const date = `'${String(when.getFullYear()).slice(2)} ${when.getMonth() + 1} ${String(when.getDate()).padStart(2, "0")}`;
  const fs = Math.round(0.048 * out.width);
  g.font = `700 ${fs}px "Roboto Mono", monospace`;
  g.textAlign = "right";
  g.textBaseline = "alphabetic";
  g.shadowColor = "rgba(255, 120, 20, 0.9)";
  g.shadowBlur = 0.45 * fs;
  g.fillStyle = "#ffb03a";
  g.fillText(date, out.width - 1.4 * fs, out.height - 1.2 * fs);
  g.shadowBlur = 0;
  return out;
}

export default function Booth({ capture, onClose, onActiveChange, ref }: { capture: () => HTMLCanvasElement | null; onClose: () => void; onActiveChange?: (on: boolean) => void; ref: Ref<BoothHandle> }) {
  const [count, setCount] = useState<number | null>(null);
  const [print, setPrint] = useState<Print | null>(null);
  const active = useRef(false);
  const timer = useRef(0);
  const previewEl = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const frameWrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const captureRef = useRef(capture);
  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const dismiss = useCallback(() => {
    window.clearInterval(timer.current);
    active.current = false;
    onActiveChange?.(false);
    if (flash.current) gsap.set(flash.current, { opacity: 0 });
    setCount(null);
    setPrint(null);
  }, [onActiveChange]);

  // the print slides up out of the slot and develops
  useLayoutEffect(() => {
    if (!print) return;
    const root = previewEl.current, wrap = frameWrap.current, img = photo.current, fl = flash.current;
    const dl = root?.querySelector<HTMLElement>(".booth-download");
    if (!root || !wrap || !img || !dl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("is-print-entering");
      if (fl) gsap.set(fl, { opacity: 0 });
      return;
    }
    gsap.set(wrap, { y: window.innerHeight });
    gsap.set(img, { filter: "brightness(0) saturate(0)" });
    gsap.set(dl, { opacity: 0 });
    root.classList.remove("is-print-entering");
    const tl = gsap.timeline();
    if (fl) tl.to(fl, { opacity: 0, duration: 0.9, ease: "power2.out" }, 0);
    tl.add(() => playPrintMotor(2.2), 0.4);
    tl.to(wrap, { y: 0, duration: 2.3, ease: "power3.out" }, 0.4);
    tl.to(img, { filter: "brightness(1) saturate(1)", duration: 2.8, ease: "power1.inOut" }, 2.9);
    tl.to(dl, { opacity: 1, duration: 0.7, ease: "power2.out" }, 3.2);
    return () => {
      tl.kill();
    };
  }, [print]);

  // 3D tilt following the pointer, drag to spin
  useEffect(() => {
    if (!print) return;
    const card = frame.current, root = previewEl.current;
    if (!card || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.7, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.7, ease: "power3.out" });
    let spin = 0, tiltX = 0, tiltY = 0, grabbing = false, lastX = 0;
    const onMove = (e: PointerEvent) => {
      if (grabbing) {
        spin += (e.clientX - lastX) * 0.4;
        lastX = e.clientX;
      }
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      tiltY = 11 * nx;
      tiltX = -(11 * ny);
      ry(spin + tiltY);
      rx(tiltX);
    };
    const onDown = (e: PointerEvent) => {
      grabbing = true;
      lastX = e.clientX;
      card.classList.add("is-grabbing");
    };
    const onUp = () => {
      grabbing = false;
      card.classList.remove("is-grabbing");
    };
    root.addEventListener("pointermove", onMove);
    card.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      root.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [print]);

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        if (active.current) return;
        active.current = true;
        onActiveChange?.(true);
        playTick();
        setCount(3);
        let n = 3;
        timer.current = window.setInterval(() => {
          if (--n > 0) {
            playTick();
            setCount(n);
            return;
          }
          window.clearInterval(timer.current);
          const src = captureRef.current();
          if (!src) return dismiss();
          const now = new Date();
          const dev = develop(src, now);
          playShutter();
          if (flash.current) gsap.set(flash.current, { opacity: 1 });
          setCount(null);
          const p2 = (v: number) => String(v).padStart(2, "0");
          setPrint({
            url: dev.toDataURL("image/jpeg", 0.92),
            w: dev.width,
            h: dev.height,
            stamp: `${p2(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`,
            canvas: dev,
          });
        }, 1000);
      },
      dismiss,
      isActive: () => active.current,
    }),
    [dismiss, onActiveChange],
  );

  const download = () => {
    const src = print?.canvas;
    if (!src) return;
    const c = document.createElement("canvas");
    c.width = 1036;
    c.height = 1402;
    const g = c.getContext("2d")!;
    g.fillStyle = "#111111";
    g.fillRect(0, 0, c.width, c.height);
    const pw = 908, ph = 1210;
    const s = Math.max(pw / src.width, ph / src.height);
    const sw = pw / s, sh = ph / s;
    g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 64, 128, pw, ph);
    g.fillStyle = "#FCF8EF";
    g.font = '600 32px "Roboto Mono", monospace';
    g.textBaseline = "top";
    g.fillText(SITE_NAME.toUpperCase(), 68, 46);
    g.textAlign = "right";
    g.fillText(`${src.width}X${src.height}`, 968, 46);
    g.textAlign = "left";
    g.beginPath();
    g.moveTo(54, 1352);
    g.lineTo(54, 1376);
    g.lineTo(78, 1364);
    g.closePath();
    g.fill();
    g.fillText((print?.stamp ?? "").toUpperCase(), 110, 1350);
    const a = document.createElement("a");
    a.download = `ff-dev-studio-${Date.now()}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  if (count === null && !print) return null;
  return (
    <>
      {count !== null && (
        <div className="booth-countdown" aria-hidden="true">
          <p className="booth-cheese">Say cheese in</p>
          <p className="booth-num">{count}</p>
        </div>
      )}
      {print && (
        <div className="booth-preview is-print-entering" ref={previewEl}>
          <button type="button" className="booth-close" onClick={() => onClose()}>
            close
          </button>
          <div className="booth-frame-wrap" ref={frameWrap}>
            <div className="booth-frame" ref={frame}>
              <div className="booth-face">
                <span className="booth-label">{SITE_NAME}</span>
                <span className="booth-label booth-label-right">{`${print.w}X${print.h}`}</span>
                <img className="booth-photo" ref={photo} src={print.url} alt="Your photobooth capture" draggable={false} />
                <span className="booth-stamp">
                  <i className="booth-play" aria-hidden="true" />
                  {print.stamp}
                </span>
              </div>
              <div className="booth-back" aria-hidden="true" />
            </div>
          </div>
          <button type="button" className="booth-download" onClick={download}>
            <Roll>download</Roll>
          </button>
        </div>
      )}
      <div className="booth-flash" ref={flash} aria-hidden="true" />
    </>
  );
}
