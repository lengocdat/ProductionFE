/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'img.vietqr.io' }],
  },
  // /di-chua was briefly announced for a temple page; it now leads to Thả Thiên Đăng.
  async redirects() {
    return [{ source: '/di-chua', destination: '/tha-den', permanent: false }]
  },
}

export default nextConfig
