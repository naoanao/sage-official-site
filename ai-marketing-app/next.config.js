/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Vercelビルド時に生成される.next/dev/types/routes.d.tsの構文エラーを無視
    // （Next.jsが自動でtsconfig includeに追加するファイルに不完全なJSDocが含まれる問題）
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
