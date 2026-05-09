"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildPaymentUrl } from "@/lib/stripe-config";
import { loadDeviceId } from "@/lib/store";

const PLANS = [
  {
    key: "free" as const,
    name: "フリー",
    price: "¥0",
    period: "/月",
    desc: "まずは試してみる",
    features: ["月3回まで生成", "コンテンツコピー機能", "基本的な業種対応"],
    cta: "現在のプラン",
    highlight: false,
  },
  {
    key: "standard" as const,
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
    cta: "今すぐ始める",
    highlight: true,
  },
  {
    key: "pro" as const,
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
    cta: "プロで始める",
    highlight: false,
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    setDeviceId(loadDeviceId() ?? "");
  }, []);

  function handlePlanClick(planKey: "free" | "standard" | "pro") {
    if (planKey === "free") return;
    const url = buildPaymentUrl(planKey, deviceId);
    window.open(url, "_blank");
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

        {/* 安心感 */}
        <div className="flex justify-center gap-4 mb-6 text-xs text-gray-400">
          <span>🔒 Stripe決済</span>
          <span>📅 いつでも解約</span>
          <span>💳 クレカ / コンビニ対応</span>
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
                  <li
                    key={f}
                    className={`flex items-start gap-2 text-sm ${
                      plan.highlight ? "text-indigo-100" : "text-gray-600"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePlanClick(plan.key)}
                disabled={plan.key === "free"}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  plan.key === "free"
                    ? "bg-gray-100 text-gray-400 cursor-default"
                    : plan.highlight
                    ? "bg-white text-indigo-600 hover:bg-indigo-50"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          Stripeの安全な決済ページに移動します
        </p>

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
