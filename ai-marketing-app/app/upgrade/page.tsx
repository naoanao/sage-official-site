"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PLANS = [
  {
    name: "フリー",
    price: "¥0",
    period: "/月",
    desc: "まずは試してみる",
    features: ["月3回まで生成", "コンテンツコピー機能", "基本的な業種対応"],
    cta: "現在のプラン",
    current: true,
    highlight: false,
  },
  {
    name: "スタンダード",
    price: "¥3,000",
    period: "/月",
    desc: "本気で集客したい方に",
    features: [
      "毎週自動でコンテンツ生成",
      "月次レポート（全データ）",
      "LINE通知（毎週月曜8時）",
      "業種別カスタマイズ",
      "無制限生成",
    ],
    cta: "先行登録する（無料）",
    current: false,
    highlight: true,
  },
  {
    name: "プロ",
    price: "¥8,000",
    period: "/月",
    desc: "複数店舗・代理店向け",
    features: [
      "スタンダードの全機能",
      "複数店舗管理（5店舗まで）",
      "Googleレビュー自動返信",
      "優先サポート",
    ],
    cta: "先行登録する（無料）",
    current: false,
    highlight: false,
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleWaitlist(planName: string) {
    if (!email.trim()) {
      // メール未入力ならメール欄にフォーカス
      document.getElementById("waitlist-email")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      // 将来のStripe決済実装まではメールを記録するだけ
      // （Supabase or Notionに保存するAPIを後で追加）
      console.log("Waitlist signup:", { email, plan: planName });
      await new Promise((r) => setTimeout(r, 800)); // UX用ウェイト
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-2">
            プランを選ぶ
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            毎週、AIがマーケをやってくれる
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            プロのマーケ担当を雇う代わりに
          </p>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="font-bold text-green-800 text-lg mb-2">先行登録完了！</h2>
            <p className="text-sm text-green-700 leading-relaxed">
              有料プランのリリース時に、登録いただいたメールアドレスへご連絡します。<br />
              引き続き無料プランをお使いください。
            </p>
          </div>
        ) : (
          <>
            {/* メール入力（先行登録用） */}
            <div className="bg-white border border-indigo-100 rounded-2xl p-5 mb-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-1">有料プランの先行登録</p>
              <p className="text-xs text-gray-400 mb-3">
                リリース時にメールでご連絡します。登録は無料です。
              </p>
              <input
                id="waitlist-email"
                type="email"
                placeholder="メールアドレスを入力"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-5 ${
                    plan.highlight
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                      : "bg-white border-gray-100 shadow-sm"
                  }`}
                >
                  {plan.highlight && (
                    <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-3">
                      ✨ おすすめ
                    </p>
                  )}
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-3xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm mb-1 ${plan.highlight ? "text-indigo-200" : "text-gray-400"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm font-medium mb-1 ${plan.highlight ? "text-indigo-100" : "text-gray-800"}`}>
                    {plan.name}
                  </p>
                  <p className={`text-xs mb-4 ${plan.highlight ? "text-indigo-200" : "text-gray-400"}`}>
                    {plan.desc}
                  </p>
                  <ul className="flex flex-col gap-1.5 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-indigo-100" : "text-gray-600"}`}>
                        <span className="mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => plan.current ? null : handleWaitlist(plan.name)}
                    disabled={submitting || plan.current}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                      plan.current
                        ? "bg-gray-100 text-gray-400 cursor-default"
                        : plan.highlight
                        ? "bg-white text-indigo-600 hover:bg-indigo-50"
                        : "bg-indigo-500 text-white hover:bg-indigo-600"
                    }`}
                  >
                    {submitting ? "登録中..." : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-400 hover:text-indigo-500 transition-colors"
          >
            ← ダッシュボードに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
