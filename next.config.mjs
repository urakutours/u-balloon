import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.workers.dev',
      },
      {
        protocol: 'https',
        hostname: 'u-balloon.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'u-balloon.com',
      },
      {
        protocol: 'https',
        hostname: 'www.u-balloon.com',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
      },
    ],
  },
}

export default withPayload(nextConfig)
