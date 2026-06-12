import { MetadataRoute } from "next";
import { TEMPLATES } from "@/lib/templates-data";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-ai.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const core: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/diagnosis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${APP_URL}/templates`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${APP_URL}/power`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${APP_URL}/marketing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${APP_URL}/onboarding/industry`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/upgrade`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
  const templates: MetadataRoute.Sitemap = TEMPLATES.map((t) => ({
    url: `${APP_URL}/templates/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const ranks: MetadataRoute.Sitemap = ["A", "B", "C", "D", "E"].map((r) => ({
    url: `${APP_URL}/diagnosis/r/${r}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.4,
  }));
  return [...core, ...templates, ...ranks];
}
