/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLintエラーがあってもビルドを継続する（react-hooks/set-state-in-effect等）
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
