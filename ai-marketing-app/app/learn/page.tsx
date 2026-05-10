"use client";

import { useRouter } from "next/navigation";

const TOPICS = [
  {
    icon: "🔍",
    title: "市場を知る（3C分析）",
    desc: "自社・競合・顧客の3つの視点でビジネスを整理する。Growlが業種別に施策を変える理由がここにある",
  },
  {
    icon: "📊",
    title: "外部環境を読む（PEST分析）",
    desc: "政治・経済・社会・技術のトレンドが自店に与える影響を把握する。SNSトレンド分析の土台",
  },
  {
    icon: "🎯",
    title: "ターゲットを絞る（STP）",
    desc: "セグメンテーション・ターゲティング・ポジショニング。誰に何をどう届けるかが決まると施策がブレなくなる",
  },
  {
    icon: "💡",
    title: "強みを活かす（SWOT分析）",
    desc: "強み・弱み・機会・脅威の4象限で自店を俯瞰する。Growlが今週の戦略メモを書く根拠になる",
  },
  {
    icon: "📱",
    title: "SNSマーケの基本",
    desc: "Instagram・LINE・Googleマップそれぞれの役割と効果の出し方。チャンネル選定の判断軸を持つ",
  },
  {
    icon: "⭐",
    title: "Googleレビューの活用",
    desc: "返信の書き方・口コミを増やす仕組み・MEO（マップ検索最適化）への繋げ方",
  },
];

export default function LearnPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">
            マーケを学ぶ
          </p>
          <h1 className="text-2xl font-bold text-gray-900">LearnAI</h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Growlがなぜその施策を選んだかを理解したい方のための学習ツールです。
            専門用語をわかりやすく解説し、AIと対話しながら学べます。
          </p>
        </div>

        <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-6">
          <p className="text-sm font-bold mb-1">Growlがやっていることの理由を知る</p>
          <p className="text-xs text-indigo-200 leading-relaxed">
            AIが選んだ施策の背景にある考え方をわかりやすく解説します。
            知識を深めることで、自分でも判断できるようになります。
          </p>
        </div>

        <p className="text-sm font-semibold text-gray-600 mb-3">LearnAIで学べること</p>
        <div className="flex flex-col gap-3 mb-8">
          {TOPICS.map((t) => (
            <div
              key={t.title}
              className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 flex gap-4 items-start"
            >
              <span className="text-2xl shrink-0">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
          <p className="text-xs font-semibold text-gray-500 mb-3">GrowlとLearnAIの使い分け</p>
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <div className="flex gap-3 items-start">
              <span className="font-bold text-indigo-600 shrink-0 pt-0.5">Growl</span>
              <span>考えずに動く。AIが今週やることを3つ決めてくれる。あなたはコピペするだけ</span>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex gap-3 items-start">
              <span className="font-bold text-gray-700 shrink-0 pt-0.5">LearnAI</span>
              <span>理由を理解する。なぜその施策が効くのかを学んで、判断力を上げる</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 hover:text-indigo-500 transition-colors"
        >
          ← ダッシュボードに戻る
        </button>

      </div>
    </main>
  );
}
