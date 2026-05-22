import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16 max-w-lg mx-auto">
      <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">← ホームに戻る</Link>
      <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4">利用規約</h1>
      <p className="text-gray-500 text-sm leading-relaxed">
        本サービスは現在ベータ版として提供しています。AIが生成する分析結果は参考情報であり、
        ビジネス判断の最終責任はユーザー自身が負うものとします。
        サービス内容は予告なく変更・終了する場合があります。
      </p>
      <p className="text-gray-400 text-xs mt-8">最終更新: 2026年5月</p>
    </main>
  );
}
