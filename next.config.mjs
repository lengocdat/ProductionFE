/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'img.vietqr.io' }],
  },
  // Assets outside /_next keep their names, so cache for a day rather than forever: a viral page
  // then costs the server one image per day per cache, and a replaced file still shows up.
  async headers() {
    return ['/ui/:path*', '/fonts/:path*', '/sfx/:path*', '/chanh-dien/:path*'].map(source => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
    }))
  },
  // /di-chua was briefly announced for a temple page; it now leads to Thả Thiên Đăng.
  async redirects() {
    return [{ source: '/di-chua', destination: '/tha-den', permanent: false }]
  },
}

export default nextConfig
