"use client";
// Rotating client logo inside the corner-ticked badge (module 81941).
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TRUSTED_CLIENTS } from "@/lib/site";

export default function TrustedLogos({ clients }: { clients?: string[] }) {
  const ref = useRef<HTMLImageElement>(null);
  const list = (clients ?? []).filter((c) => TRUSTED_CLIENTS.includes(c));
  const order = list.length ? list : TRUSTED_CLIENTS;
  const key = order.join("|");
  useEffect(() => {
    const el = ref.current;
    if (!el || !order.length) return;
    const tl = gsap.timeline({ repeat: -1 });
    for (const c of order) {
      tl.call(() => {
        el.setAttribute("src", `/icons/clients/${c}.svg`);
      })
        .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" })
        .to(el, { opacity: 0, duration: 0.5, ease: "power2.in", delay: 1.4 });
    }
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <img ref={ref} className="trusted-logo" alt="" aria-hidden="true" width={115} height={64} src={`/icons/clients/${order[0]}.svg`} />;
}
