"use client";
// 404 (module 47373): same chrome, centred code + message + home pill, gesture support.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import HapticSwitch from "./HapticSwitch";
import Roll from "./Roll";
import TrustedLogos from "./TrustedLogos";
import { readCursorHit, type GestureCursorHandle } from "./GestureCursor";
import type { HandControlHandle } from "./HandControl";
import { useProjects } from "@/lib/projects";
import { playPageEntrance, useIsoLayoutEffect } from "@/lib/entrance";
import { isSoundEnabled, playTick, setSoundEnabled } from "@/lib/sound";
import { HAND_GAIN } from "@/lib/constants";
import { LOGO_MARK, NAV_SITE } from "@/lib/site";

const HandControl = dynamic(() => import("./HandControl"), { ssr: false });
const GestureCursor = dynamic(() => import("./GestureCursor"), { ssr: false });

function Line({ children }: { children: React.ReactNode }) {
  return (
    <span className="reveal-mask">
      <span data-reveal="line">
        <Roll>{children}</Roll>
      </span>
    </span>
  );
}

export default function NotFound() {
  const root = useRef<HTMLDivElement>(null);
  const works = `works(${useProjects().length})`;
  const contact = NAV_SITE[NAV_SITE.length - 1];
  const [soundOn, setSoundOn] = useState(false);
  const [gesturesOn, setGesturesOn] = useState(false);
  const [compact, setCompact] = useState(false);
  const hand = useRef<HandControlHandle>(null);
  const cursor = useRef<GestureCursorHandle>(null);
  const hover = useRef<HTMLElement | null>(null);

  useIsoLayoutEffect(() => {
    setSoundOn(isSoundEnabled());
    if (root.current) playPageEntrance(root.current);
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const f = () => {
      setCompact(mq.matches);
      if (mq.matches) setGesturesOn(false);
    };
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const toggleSound = useCallback(() => {
    const on = !soundOn;
    setSoundOn(on);
    setSoundEnabled(on);
    playTick();
  }, [soundOn]);
  const aim = useCallback((x: number, y: number, clenched: boolean) => {
    const c = cursor.current;
    if (!c) return;
    hand.current?.aimHint(x, y, !clenched);
    c.move(x, y);
    const { preview, interactable } = readCursorHit(x, y);
    const t = clenched ? null : interactable;
    hover.current = t;
    if (preview && !clenched) c.set({ visible: false, clenched: false, pointing: false, caption: false, hint: "" });
    else c.set({ visible: true, clenched, pointing: !!t, arrow: !t && !clenched, caption: false, hint: t ? "pinch to click" : "" });
  }, []);
  const onFrame = useCallback(
    (nx: number, ny: number, tracked: boolean, clenched: boolean) => {
      if (!tracked) {
        hover.current = null;
        return;
      }
      aim(gsap.utils.clamp(0, 1, (1 - nx - 0.5) * HAND_GAIN + 0.5) * window.innerWidth, gsap.utils.clamp(0, 1, (ny - 0.5) * HAND_GAIN + 0.5) * window.innerHeight, clenched);
    },
    [aim],
  );
  const onPinch = useCallback(() => {
    const t = hover.current;
    if (t) {
      playTick();
      t.click();
    }
  }, []);
  const onStatus = useCallback((on: boolean) => {
    setGesturesOn(on);
    if (!on) {
      hover.current = null;
      hand.current?.aimHint(0, 0, false);
      cursor.current?.set({ visible: false, clenched: false, pointing: false, hint: "" });
    }
  }, []);
  useEffect(() => {
    if (!gesturesOn) return;
    const f = (e: PointerEvent) => aim(e.clientX, e.clientY, false);
    window.addEventListener("pointermove", f);
    return () => window.removeEventListener("pointermove", f);
  }, [gesturesOn, aim]);

  return (
    <div className={`notfound${gesturesOn ? " gestures-on" : ""}`} ref={root}>
      <header className="chrome" data-reveal="chrome">
        <h1 className="logo">
          <Link href="/">
            <Line>
              {LOGO_MARK}
              <sup>®</sup>
            </Line>
          </Link>
        </h1>
        <p className="tagline">
          <Line>documenting emotion,</Line>
          <br />
          <Line>movement and meaning.</Line>
        </p>
        <nav className="nav-right" aria-label="Primary">
          <div className="nav-filters">
            <div className="nav-works-row">
              <Link href="/" className="nav-works-link">
                <Line>{works}</Line>
              </Link>
            </div>
          </div>
          <div className="nav-site-group">
            {NAV_SITE.slice(0, -1).map((l) => (
              <Link key={l.label} href={l.href}>
                <Line>{l.label}</Line>
              </Link>
            ))}
          </div>
          <Link className="nav-contact" href={contact.href}>
            <Line>{contact.label}</Line>
          </Link>
        </nav>
      </header>
      <div className="nf-block">
        <p className="nf-code">
          <span className="nf-line-mask">
            <span className="nf-line" data-reveal="line">
              404
            </span>
          </span>
        </p>
        <p className="nf-message">
          <span className="nf-line-mask">
            <span className="nf-line" data-reveal="line">
              The page you are looking for doesn&apos;t exist.
            </span>
          </span>
        </p>
        <Link className="nf-home" href="/" data-reveal="block">
          <Roll>go home</Roll>
        </Link>
      </div>
      <div className="trusted" data-reveal="foot">
        <span className="trusted-badge">
          <TrustedLogos />
        </span>
      </div>
      <button type="button" className="sound-toggle" data-reveal="foot" onMouseEnter={playTick} onClick={toggleSound} aria-pressed={soundOn}>
        <HapticSwitch />
        <Line>sound:{soundOn ? "[on]" : "[off]"}</Line>
      </button>
      {!compact && <HandControl ref={hand} onFrame={onFrame} onPinch={onPinch} onStatus={onStatus} onSecondClench={() => {}} onSquareGesture={() => {}} />}
      {!compact && <GestureCursor ref={cursor} />}
    </div>
  );
}
