import type { MetadataRoute } from 'next'

const APP_URL = 'https://coduyen.net'

// Only the landing page is public — lesson content, review, and profile all
// sit behind login (see (app)/layout.tsx auth redirect), so there's nothing
// else crawlable to list here yet.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
