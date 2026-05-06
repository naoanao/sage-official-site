import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span>✨</span> マーケを意識しないまま、成長できる
        </div>

        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4 max-w-xs">
          今週やること、<br />
          <span className="text-indigo-500">3つだけ。</span>
        </h1>

        <p className="text-gray-500 text-base max-w-sm leading-relaxed mb-10">
          あなたのビジネスをAIが分析して、今週やるべきことを3つに絞ります。
          フレームワークも専門用語も一切なし。
        </p>

        <Link
          href="/onboarding/industry"
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200 active:scale-95"
        >
          無料で始める →
        </Link>

        <p className="text-gray-400 text-xs mt-4">登録不要・1分で完了</p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-10">こんな方に</h2>
          <div className="flex flex-col gap-4">
            {[
              { icon: "😓", text: "何から手をつければいいかわからない" },
              { icon: "💸", text: "マーケ専門家を雇う余裕はない" },
              { icon: "⏰", text: "時間も人手も限られている" },
              { icon: "📈", text: "結果が出るなら行動できる" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
                <span className="text-2xl">{icon}</span>
                <p className="text-gray-700 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketing Banner */}
      <section className="px-6 py-10 bg-indigo-50 text-center">
        <p className="text-xs text-indigo-400 font-medium mb-2">NEW</p>
        <h3 className="text-lg font-bold text-indigo-900 mb-2">AIマーケティング分析ウィザード</h3>
        <p className="text-indigo-600 text-sm mb-4">PEST・3C・SWOT・STP・4P・AEOなど8種類のフレームワークをAIが自動入力</p>
        <Link
          href="/marketing"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-2xl transition-colors text-sm"
        >
          無料で分析してみる →
        </Link>
      </section>

      {/* CTA bottom */}
      <section className="px-6 py-16 text-center">
        <p className="text-gray-500 text-sm mb-6">5問答えるだけで、今週の施策が届きます</p>
        <Link
          href="/onboarding/industry"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-8 py-4 rounded-2xl transition-colors"
        >
          今すぐ試す（無料）
        </Link>
      </section>

      <footer className="text-center py-8 text-xs text-gray-300 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="/privacy" className="hover:text-gray-500 transition-colors">プライバシーポリシー</a>
          <a href="/terms" className="hover:text-gray-500 transition-colors">利用規約</a>
          <a href="mailto:contact@growl-app.vercel.app" className="hover:text-gray-500 transition-colors">お問い合わせ</a>
        </div>
        © 2026 Growl
      </footer>
    </main>
  );
}
