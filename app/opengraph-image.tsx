import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_NAME, TAGLINE } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const inter = await readFile(path.join(process.cwd(), "public/fonts/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2"));
  const mono = await readFile(path.join(process.cwd(), "public/fonts/2f13ad8e538108e0-s.p.22iyan98j1_2e.woff2"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ff3131" }}>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 132, letterSpacing: -4, textTransform: "uppercase", display: "flex" }}>
          {SITE_NAME}
          <span style={{ fontSize: 56, marginTop: 8 }}>®</span>
        </div>
        <div style={{ fontFamily: "Roboto Mono", fontSize: 26, color: "#8e8c87", textTransform: "uppercase", letterSpacing: -0.5, marginTop: 18 }}>{TAGLINE}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter", data: inter, weight: 800 }, { name: "Roboto Mono", data: mono, weight: 500 }] },
  );
}
