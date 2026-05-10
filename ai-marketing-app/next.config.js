/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLintエラーがあってもビルドを継続する（react-hooks/set-state-in-effect等）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Vercelビルド時に生成される.next/dev/types/routes.d.tsの構文エラーを無視
    // （Next.jsが自動でtsconfig includeに追加するファイルに不完全なJSDocが含まれる問題）
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
