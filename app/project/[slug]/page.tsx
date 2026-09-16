import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectPage from "@/components/ProjectPage";
import { projects } from "@/data/projects";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = projects.find((x) => x.slug === slug);
  if (!p) return { title: `404 — ${SITE_NAME}` };
  const client = p.clients[0] ? ` for ${p.clients[0]}` : "";
  const tag = p.tag.toLowerCase();
  const article = /^[aeiou]/.test(tag) ? "an" : "a";
  const description =
    p.type === "motion"
      ? `${p.name} — ${article} ${tag} film${client}. ${p.duration ?? 0} seconds by ${SITE_NAME}.`
      : `${p.name} — ${article} ${tag} shoot${client}. ${p.count} frames by ${SITE_NAME}.`;
  return {
    title: `${p.name} — ${SITE_NAME}`,
    description,
    alternates: { canonical: `${SITE_URL}/project/${p.slug}` },
    openGraph: { title: `${p.name} — ${SITE_NAME}`, description, images: [{ url: p.image, alt: p.alt || p.name }] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = projects.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const project = projects[i];
  // the next project is the next one of the same kind (stills follow stills, films follow films)
  const kin = projects.filter((p) => p.type === project.type);
  const k = kin.findIndex((p) => p.slug === slug);
  const next = kin.length > 1 ? kin[(k + 1) % kin.length] : null;
  return <ProjectPage project={project} next={next} works={projects.length} />;
}
