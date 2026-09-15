"use client";
import { createContext, useContext } from "react";

export type ProjectType = "stills" | "motion";

export interface Project {
  name: string;
  slug: string;
  image: string;
  alt: string;
  type: ProjectType;
  count: number;
  tag: string;
  gallery: string[];
  clients: string[];
  /** motion only — self-hosted mp4 */
  video?: string;
  duration?: number;
  previewStart?: number;
}

export function clientNames(p: Project): string | null {
  const c = (p.clients ?? []).filter(Boolean).slice(0, 2);
  return c.length ? c.join(" X ") : null;
}

export function clientLine(p: Project): string | null {
  const c = clientNames(p);
  return c && `Client: ${c}`;
}

export function projectPath(p: Project): string {
  return `/project/${p.slug}`;
}

export function typeMeta(p: Project): string {
  if (p.type === "motion" && p.duration != null) {
    const m = Math.floor(p.duration / 60);
    const s = Math.floor(p.duration % 60);
    return `motion[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
  }
  return `${p.type}[${p.count}]`;
}

const ProjectsContext = createContext<Project[]>([]);

export function ProjectsProvider({ projects, children }: { projects: Project[]; children: React.ReactNode }) {
  return <ProjectsContext.Provider value={projects}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): Project[] {
  return useContext(ProjectsContext);
}
