/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/onboarding",
        destination: "/onboarding/industry",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
