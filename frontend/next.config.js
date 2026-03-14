/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    domains: ['aquaai-images.s3.amazonaws.com', 's3.amazonaws.com'],
  },
}

module.exports = nextConfig
