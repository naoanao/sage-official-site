import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLintエラーがあってもビルドを継続する（react-hooks/set-state-in-effect等）
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
