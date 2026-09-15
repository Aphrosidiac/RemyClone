// A filter chosen on another page is carried home via sessionStorage / ?filter= (module 89429).
import type { Project } from "./projects";

export type Filter = "works" | "stills" | "motion";
const KEY = "gallery-filter";
let pending: Filter | null = null;

export function clearPendingGalleryFilter(): void {
  pending = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
export function galleryHomeHref(f?: string | null): string {
  return f ? `/?filter=${f}` : "/";
}
export function resolvePendingNavFilter(loc: Location = window.location): "stills" | "motion" | null {
  try {
    const q = new URL(loc.href).searchParams.get("filter");
    if (q === "stills" || q === "motion") return q;
  } catch {}
  let s: string | null = pending;
  if (!s) {
    try {
      const v = sessionStorage.getItem(KEY);
      if (v === "works" || v === "stills" || v === "motion") s = v;
    } catch {}
  }
  return s === "stills" || s === "motion" ? s : null;
}
export function scrubGalleryFilterFromUrl(): void {
  if (window.location.search.includes("filter=")) window.history.replaceState(null, "", "/");
}
export function setPendingGalleryFilter(f: Filter): void {
  pending = f;
  try {
    sessionStorage.setItem(KEY, f);
  } catch {}
}
export function subFilterLabels(projects: Project[]): { label: string; filter: "stills" | "motion" }[] {
  const s = projects.filter((p) => p.type === "stills").length;
  const m = projects.filter((p) => p.type === "motion").length;
  return [
    { label: `stills(${s})`, filter: "stills" },
    { label: `motion(${m})`, filter: "motion" },
  ];
}
