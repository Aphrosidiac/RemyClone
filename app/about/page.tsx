import type { Metadata } from "next";
import Studio from "@/components/Studio";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description: "Multi-award winning production studio. Since ©2016 — documenting emotion, movement and meaning.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return <Studio />;
}
