import type { Metadata } from "next";
import NotFound from "@/components/NotFound";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `404 — ${SITE_NAME}`,
  description: "The page you are looking for doesn't exist.",
};

export default function NotFoundPage() {
  return <NotFound />;
}
