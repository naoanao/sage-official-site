import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">ページが見つかりません</h1>
      <p className="text-gray-500 text-sm mb-8 leading-relaxed">
        お探しのページは存在しないか、<br />移動した可能性があります。
      </p>
      <Link
        href="/"
        className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
      >
        ホームに戻る
      </Link>
    </main>
  );
}
