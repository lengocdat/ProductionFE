import { MetadataRoute } from 'next'

const SPORTS = [
  'cau-long', 'bong-da', 'tennis', 'pickleball',
  'bong-ro', 'bong-chuyen', 'bong-ban', 'chay-bo',
]

const CITIES = [
  'ho-chi-minh', 'ha-noi', 'da-nang', 'can-tho',
  'binh-duong', 'dong-nai', 'hai-phong', 'nha-trang',
  'hue', 'vung-tau',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://coduyen.net'

  const staticPages: MetadataRoute.Sitemap = [
    { url: base,              lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/login`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // /tim-keo/[sport]/[city] — 80 pages — "tìm người chơi" + "tìm kèo"
  const timKeoPages: MetadataRoute.Sitemap = SPORTS.flatMap(sport =>
    CITIES.map(city => ({
      url: `${base}/tim-keo/${sport}/${city}`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    }))
  )

  // /tim-ban-choi/[sport] — 8 pages — "tìm bạn chơi [sport]" national
  const timBanChoiSportPages: MetadataRoute.Sitemap = SPORTS.map(sport => ({
    url: `${base}/tim-ban-choi/${sport}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  // /tim-ban-choi/[sport]/[city] — 80 pages — "tìm bạn chơi [sport] [city]"
  const timBanChoiCityPages: MetadataRoute.Sitemap = SPORTS.flatMap(sport =>
    CITIES.map(city => ({
      url: `${base}/tim-ban-choi/${sport}/${city}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.88,
    }))
  )

  return [
    ...staticPages,
    ...timKeoPages,
    ...timBanChoiSportPages,
    ...timBanChoiCityPages,
  ]
}
