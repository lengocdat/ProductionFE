import type { MetadataRoute } from 'next'

const APP_URL = 'https://coduyen.net'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/home', '/lesson', '/review', '/me', '/auth/callback', '/api/'],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
