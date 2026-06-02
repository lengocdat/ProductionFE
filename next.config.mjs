/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // In Docker, nginx handles /v1/* routing to backend
    // This rewrite is for local dev only (next dev without nginx)
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8080'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
