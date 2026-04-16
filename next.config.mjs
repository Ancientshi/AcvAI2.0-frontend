/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: "/home/workstation/workspace/AcvAI2.0-frontend",
  },
}

export default nextConfig