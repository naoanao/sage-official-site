import { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-app.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/onboarding/industry", "/upgrade", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard", "/complete/", "/onboarding/business", "/onboarding/customer", "/onboarding/problem", "/onboarding/goal", "/dev"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
