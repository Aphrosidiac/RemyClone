"use client";
// About page (module 79356): full-bleed hero, three-line headline, about/services/clients
// rail, footer with socials (email copies to clipboard) + sound + gestures.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import gsap from "gsap";
import HapticSwitch from "./HapticSwitch";
import Roll, { playRoll } from "./Roll";
import TrustedLogos from "./TrustedLogos";
import { useSlidingCaret } from "./useSlidingCaret";
import { useIris } from "./IrisProvider";
import { readCursorHit, type GestureCursorHandle } from "./GestureCursor";
import type { HandControlHandle } from "./HandControl";
import { useProjects } from "@/lib/projects";
import { claimFirstLanding, hasLandedBefore, isIrisNavPending, playPageEntrance, useIsoLayoutEffect, usePageReady } from "@/lib/entrance";
import { isSoundEnabled, playShutter, playTick, setSoundEnabled } from "@/lib/sound";
import { gesturesSupported, getServerGestures, subscribeGestures } from "@/lib/gestures";
import { galleryHomeHref, setPendingGalleryFilter, subFilterLabels } from "@/lib/galleryFilter";
import { HAND_GAIN } from "@/lib/constants";
import { ABOUT_HREF, LOGO_MARK, NAV_SITE, STUDIO_ABOUT, STUDIO_CLIENTS, STUDIO_COPYRIGHT, STUDIO_CREDIT, STUDIO_HEADLINE, STUDIO_SERVICES, STUDIO_SOCIALS } from "@/lib/site";

const HandControl = dynamic(() => import("./HandControl"), { ssr: false });
const GestureCursor = dynamic(() => import("./GestureCursor"), { ssr: false });

function Social({ label, href, className }: { label: string; href: string; className: string }) {
  const isMail = href.startsWith("mailto:");
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  const el = useRef<HTMLAnchorElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const external = href.startsWith("http");
  const onClick = isMail
    ? (e: ReactMouseEvent) => {
        const addr = href.replace(/^mailto:/, "").split("?")[0];
        if (!navigator.clipboard?.writeText) return;
        e.preventDefault();
        navigator.clipboard
          .writeText(addr)
          .then(() => {
            playTick();
            if (copied) return;
            playRoll(el.current, {
              force: true,
              onMid: () => {
                setCopied(true);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => {
                  playRoll(el.current, { force: true, onMid: () => setCopied(false) });
                }, 1800);
              },
            });
          })
          .catch(() => {
            window.location.href = href;
          });
      }
    : undefined;
  return (
    <a ref={el} className={className} href={href} data-reveal="foot" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={onClick}>
      <HapticSwitch />
      {isMail ? <Roll to={copied ? label : "Copied"}>{copied ? "Copied" : label}</Roll> : <Roll>{label}</Roll>}
    </a>
  );
}

export default function Studio() {
  const projects = useProjects();
  const works = `works(${projects.length})`;
  const subs = subFilterLabels(projects);
  const contact = NAV_SITE[NAV_SITE.length - 1];
  const aboutLabel = NAV_SITE.find((l) => l.href === ABOUT_HREF)?.label ?? "";
  const root = useRef<HTMLDivElement>(null);
  const navEls = useRef<Record<string, HTMLElement>>({});
  const [caret, moveCaret] = useSlidingCaret("xy", "before");
  const { navigateWithIris } = useIris();
  const [menuOpen, setMenuOpen] = useState(false);
  const entranceDone = useRef(false);
  const viaIris = useRef(false);
  const [irisNav, setIrisNav] = useState(false);
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [gesturesOn, setGesturesOn] = useState(false);
  const gesturesOk = useSyncExternalStore(subscribeGestures, gesturesSupported, getServerGestures);
  const hand = useRef<HandControlHandle>(null);
  const cursor = useRef<GestureCursorHandle>(null);
  const hover = useRef<HTMLElement | null>(null);

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      setSoundEnabled(!v);
      return !v;
    });
  }, []);
  const aim = useCallback((x: number, y: number, clenched: boolean) => {
    const c = cursor.current;
    if (!c) return;
    hand.current?.aimHint(x, y, !clenched);
    c.move(x, y);
    const { preview, interactable } = readCursorHit(x, y);
    const t = clenched ? null : interactable;
    hover.current = t;
    if (preview && !clenched) c.set({ visible: false, clenched: false, pointing: false, caption: false, hint: "" });
    else c.set({ visible: true, clenched, pointing: !!t, arrow: !t, caption: false, hint: t ? "pinch to click" : "" });
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

  useIsoLayoutEffect(() => {
    if (isIrisNavPending(ABOUT_HREF)) {
      viaIris.current = true;
      setIrisNav(true);
    }
  }, []);
  usePageReady(ABOUT_HREF);
  const enter = useCallback(() => {
    if (entranceDone.current || !root.current) return;
    entranceDone.current = true;
    setReady(true);
    playPageEntrance(root.current, { animate: claimFirstLanding(ABOUT_HREF), animateChrome: !viaIris.current });
  }, []);
  useEffect(() => {
    const place = () => moveCaret(navEls.current[aboutLabel] ?? null, true);
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [moveCaret, aboutLabel]);
  useEffect(() => {
    if (!menuOpen) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [menuOpen]);
  // tick on hovering any control outside the nav (the nav caret ticks itself)
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let last: Element | null = null;
    const f = (e: PointerEvent) => {
      const t = (e.target as HTMLElement)?.closest?.("a, button");
      if (!t || !el.contains(t)) {
        last = null;
        return;
      }
      if (!t.closest(".nav-right") && t !== last) {
        last = t;
        playTick();
      }
    };
    el.addEventListener("pointerover", f);
    return () => el.removeEventListener("pointerover", f);
  }, []);
  useEffect(() => {
    if (!viaIris.current) {
      const r = requestAnimationFrame(() => enter());
      return () => cancelAnimationFrame(r);
    }
    if (hasLandedBefore(ABOUT_HREF)) return void enter();
    const f = (e: Event) => {
      if ((e as CustomEvent).detail?.href === ABOUT_HREF) enter();
    };
    window.addEventListener("iris-opening", f);
    const t = window.setTimeout(enter, 1800);
    return () => {
      window.removeEventListener("iris-opening", f);
      window.clearTimeout(t);
    };
  }, [enter]);

  const goHome = useCallback(
    (e?: { preventDefault: () => void; stopPropagation: () => void }) => {
      e?.preventDefault();
      e?.stopPropagation();
      playShutter();
      navigateWithIris("/");
    },
    [navigateWithIris],
  );
  // any link home goes through the iris (with its filter); back button too
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || !root.current?.contains(a)) return;
      const u = new URL(a.href, window.location.href);
      if (u.origin !== window.location.origin || u.pathname !== "/" || u.hash) return;
      e.preventDefault();
      e.stopPropagation();
      const f = a.dataset.galleryFilter ?? u.searchParams.get("filter");
      if (f === "stills" || f === "motion") {
        setPendingGalleryFilter(f);
        playShutter();
        navigateWithIris(galleryHomeHref(f));
        return;
      }
      goHome();
    };
    const onPop = () => {
      window.history.pushState({ about: 1 }, "", ABOUT_HREF);
      goHome();
    };
    window.history.pushState({ about: 1 }, "", ABOUT_HREF);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [goHome, navigateWithIris]);

  return (
    <div className={`studio${irisNav ? " is-iris-nav" : ""}${ready ? " is-ready" : ""}${gesturesOn ? " gestures-on" : ""}${menuOpen ? " is-menu-open" : ""}`} ref={root}>
      <div className="studio-bg" aria-hidden="true">
        <Image src="/images/studio-hero.jpg" alt="" fill priority sizes="100vw" />
      </div>
      <header className="chrome studio-chrome" data-reveal="chrome">
        <p className="logo">
          <a href="/" onClick={goHome}>
            <HapticSwitch />
            {LOGO_MARK}
            <sup>®</sup>
          </a>
        </p>
        <p className="tagline">
          documenting emotion,
          <br />
          movement and meaning.
        </p>
        <nav className="nav-right" aria-label="Primary" onMouseLeave={() => moveCaret(navEls.current[aboutLabel] ?? null)}>
          <span className="nav-site-caret is-visible" ref={caret} aria-hidden="true" />
          <div className="nav-filters" onMouseLeave={() => moveCaret(navEls.current[aboutLabel] ?? null)}>
            <div className="nav-works-row">
              <a
                href="/"
                className="nav-works-link"
                ref={(el) => {
                  if (el) navEls.current.works = el;
                }}
                onMouseEnter={(e) => moveCaret(e.currentTarget)}
                onClick={goHome}
              >
                <HapticSwitch />
                <Roll>{works}</Roll>
              </a>
            </div>
            <div className="nav-drop nav-drop-hover">
              {subs.map((s) => (
                <a
                  key={s.filter}
                  href={galleryHomeHref(s.filter)}
                  data-gallery-filter={s.filter}
                  onMouseEnter={(e) => moveCaret(e.currentTarget)}
                  onClick={(e) => {
                    setPendingGalleryFilter(s.filter);
                    e.preventDefault();
                    playShutter();
                    navigateWithIris(galleryHomeHref(s.filter));
                  }}
                >
                  <HapticSwitch />
                  <span className="reveal-mask nav-drop-mask">
                    <span className="nav-drop-reveal">
                      <Roll>{s.label}</Roll>
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
          <div className="nav-site-group">
            {NAV_SITE.slice(0, -1).map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={l.href === ABOUT_HREF ? "is-current" : undefined}
                ref={(el) => {
                  if (el) navEls.current[l.label] = el;
                }}
                onMouseEnter={(e) => moveCaret(e.currentTarget)}
              >
                <Roll>{l.label}</Roll>
              </Link>
            ))}
          </div>
          <Link
            className="nav-contact"
            href={contact.href}
            ref={(el) => {
              if (el) navEls.current.contact = el;
            }}
            onMouseEnter={(e) => moveCaret(e.currentTarget)}
          >
            <Roll>{contact.label}</Roll>
          </Link>
        </nav>
      </header>
      <button type="button" className="menu-btn studio-menu-btn" data-reveal="chrome" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
        <HapticSwitch />
        <Roll to="close">menu</Roll>
      </button>
      <div
        className={`mobile-menu${menuOpen ? " is-open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
      >
        <nav className="menu-items" aria-label="Primary">
          <a
            href="/"
            onClick={(e) => {
              setMenuOpen(false);
              goHome(e);
            }}
          >
            <HapticSwitch />
            {works}
          </a>
          {NAV_SITE.map((l) => (
            <Link key={l.label} href={l.href} className={l.href === ABOUT_HREF ? "is-current" : undefined} onClick={() => setMenuOpen(false)}>
              {l.href === ABOUT_HREF && <span className="menu-caret" aria-hidden="true" />}
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="studio-main">
        <h1 className="studio-headline">
          {STUDIO_HEADLINE.map((line, i) => (
            <span key={line}>
              {i > 0 ? " " : null}
              <span className="studio-line-mask">
                <span className="studio-line">{line}</span>
              </span>
            </span>
          ))}
        </h1>
        <div className="studio-rail">
          <section className="studio-col studio-about" data-reveal="block">
            <h3>about</h3>
            <p>{STUDIO_ABOUT}</p>
          </section>
          <section className="studio-col studio-services" data-reveal="block">
            <h3>Services</h3>
            <ul>
              {STUDIO_SERVICES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="studio-col studio-clients" data-reveal="block">
            <h3>featured Clients</h3>
            <div className="studio-client-cols">
              {STUDIO_CLIENTS.map((col, i) => (
                <ul key={i}>
                  {col.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ))}
            </div>
          </section>
          <div className="studio-trusted" data-reveal="block">
            <span className="trusted-badge">
              <TrustedLogos />
            </span>
          </div>
          <footer className="studio-footer">
            <span className="studio-copy" data-reveal="foot">
              {STUDIO_COPYRIGHT}
            </span>
            <a className="studio-credit" href={STUDIO_CREDIT.href} target="_blank" rel="noopener noreferrer" data-reveal="foot">
              <HapticSwitch />
              <Roll>{STUDIO_CREDIT.label}</Roll>
            </a>
            <div className="studio-socials">
              {STUDIO_SOCIALS.map((s) => (
                <Social key={s.label} label={s.label} href={s.href} className={`studio-social studio-social-${s.label.toLowerCase()}`} />
              ))}
            </div>
            <button
              type="button"
              className="sound-toggle studio-sound"
              data-reveal="foot"
              onMouseEnter={playTick}
              onClick={(e) => {
                playRoll(e.currentTarget);
                toggleSound();
              }}
              aria-pressed={soundOn}
            >
              <HapticSwitch />
              <Roll>sound:{soundOn ? "[on]" : "[off]"}</Roll>
            </button>
            {gesturesOk && gesturesOn && (
              <span className="hand-control-spacer" aria-hidden="true">
                <span className="hand-toggle">gestures:[off]</span>
              </span>
            )}
            {gesturesOk && <HandControl ref={hand} onFrame={onFrame} onPinch={onPinch} onStatus={onStatus} onSecondClench={() => {}} onSquareGesture={() => {}} />}
          </footer>
        </div>
      </main>
      {gesturesOk && <GestureCursor ref={cursor} />}
    </div>
  );
}
