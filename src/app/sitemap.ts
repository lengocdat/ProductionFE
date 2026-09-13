import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: process.env.APP_PUBLIC_URL || "https://coduyen.net", changeFrequency: "weekly", priority: 1 }];
}
