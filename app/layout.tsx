import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import IrisProvider from "@/components/IrisProvider";
import { ProjectsProvider } from "@/lib/projects";
import { projects } from "@/data/projects";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL, STUDIO_SOCIALS, TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: "Documenting emotion, movement and meaning. Since ©2016 — the photography portfolio of FF Dev Studio.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_NAME,
    description: "Multi-award winning production studio. Photography and film documenting emotion, movement and meaning — for brands and culture since 2016.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_MY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "Multi-award winning production studio. Photography and film documenting emotion, movement and meaning — for brands and culture since 2016.",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: "FF",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/apple-icon.png`,
  description: TAGLINE,
  email: CONTACT_EMAIL,
  sameAs: STUDIO_SOCIALS.filter((s) => s.href.startsWith("http")).map((s) => s.href),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/2f13ad8e538108e0-s.p.22iyan98j1_2e.woff2" as="font" crossOrigin="" type="font/woff2" />
        <link rel="preload" href="/fonts/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2" as="font" crossOrigin="" type="font/woff2" />
        <link rel="preload" as="image" href="/icons/clients/under-armour.svg" />
        <link rel="preload" as="image" href="/icons/playhead.svg" />
      </head>
      <body className="font-vars">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <ProjectsProvider projects={projects}>
          <IrisProvider>{children}</IrisProvider>
        </ProjectsProvider>
      </body>
    </html>
  );
}
