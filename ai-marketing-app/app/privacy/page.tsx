import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16 max-w-lg mx-auto">
      <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">← ホームに戻る</Link>
      <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4">プライバシーポリシー</h1>
      <p className="text-gray-500 text-sm leading-relaxed">
        本サービス（Growl）は、ユーザーが入力した情報をAI分析にのみ使用し、第三者に提供しません。
        入力情報はサーバーに保存されず、セッション完了後に破棄されます。
      </p>
      <p className="text-gray-400 text-xs mt-8">最終更新: 2026年5月</p>
    </main>
  );
}
