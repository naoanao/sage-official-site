"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildPaymentUrl } from "@/lib/stripe-config";
import { loadDeviceId } from "@/lib/store";
import { isLimitReached } from "@/components/FreeProgressBar";
import { useLang } from "@/lib/i18n";

export default function UpgradePage() {
  const router = useRouter();
  const { lang } = useLang();
  const isEn = lang === "en";

  const [deviceId, setDeviceId] = useState<string>("");
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    setDeviceId(loadDeviceId() ?? "");
    setLimitReached(isLimitReached());
  }, []);

  function handlePlanClick(planKey: "free" | "standard" | "pro") {
    if (planKey === "free") return;
    const url = buildPaymentUrl(planKey, deviceId);
    window.open(url, "_blank");
  }

  const PLANS = isEn ? [
    {
      key: "free" as const,
      name: "Free",
      price: "¥0",
      period: "/mo",
      desc: "Try it out",
      features: [
        "Up to 5 generations per month (trial)",
        "Content copy feature",
        "6 industry types supported",
      ],
      cta: "Current plan",
      highlight: false,
    },
    {
      key: "standard" as const,
      name: "Standard",
      price: "¥3,000",
      period: "/mo",
      desc: "For those who want to run marketing on autopilot every week",
      features: [
        "Delivered via LINE every Monday at 8am",
        "Unlimited generations (redo anytime)",
        "Monthly report — see what's working",
        "Detailed customization for your industry & location",
        "AI learns from past results to improve suggestions",
      ],
      cta: "Get weekly auto-delivery on LINE",
      highlight: true,
    },
    {
      key: "pro" as const,
      name: "Pro",
      price: "¥8,000",
      period: "/mo",
      desc: "For multi-location owners and marketing agencies",
      features: [
        "All Standard features",
        "Multi-location management (up to 5 locations)",
        "Automated Google review replies",
        "Priority support",
      ],
      cta: "Start with Pro",
      highlight: false,
    },
  ] : [
    {
      key: "free" as const,
      name: "フリー",
      price: "¥0",
      period: "/月",
      desc: "まずは試してみる",
      features: [
        "月5回まで生成（お試し）",
        "コンテンツコピー機能",
        "6業種対応",
      ],
      cta: "現在のプラン",
      highlight: false,
    },
    {
      key: "standard" as const,
      name: "スタンダード",
      price: "¥3,000",
      period: "/月",
      desc: "毎週自動でマーケを回したい方に",
      features: [
        "毎週月曜8時、今週の施策がLINEで届く",
        "生成回数は無制限（何度でもやり直せる）",
        "月次レポートで「何が効いたか」が見える",
        "業種・地域に合わせた詳細カスタマイズ",
        "過去の結果をAIが学習して提案精度が上がる",
      ],
      cta: "LINEで自動受け取りにする",
      highlight: true,
    },
    {
      key: "pro" as const,
      name: "プロ",
      price: "¥8,000",
      period: "/月",
      desc: "複数店舗・マーケ代行業者向け",
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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-2">
            {isEn ? "Choose a plan" : "プランを選ぶ"}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEn
              ? <>Your 3 weekly actions delivered<br />every Monday via LINE</>
              : <>毎週月曜、今週の施策が<br />LINEで届く</>}
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {isEn ? "Leave the marketing to AI." : "マーケのことは、AIに任せてください"}
          </p>
        </div>

        {limitReached && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800 text-center">
            {isEn
              ? <>You&apos;ve used all 5 free generations this month. The free plan resets on the 1st of each month.{" "}<span className="font-bold">Consider upgrading to keep going.</span></>
              : <>今月の無料分5回を使い切りました。無料プランは毎月1日にリセットされます。<span className="font-bold">それまで使い続けるには下記のプランをご検討ください。</span></>}
          </div>
        )}

        <div className="flex justify-center gap-4 mb-6 text-xs text-gray-400">
          <span>🔒 {isEn ? "Stripe payment" : "Stripe決済"}</span>
          <span>📅 {isEn ? "Cancel anytime" : "いつでも解約"}</span>
          <span>💳 {isEn ? "Card / Convenience store" : "クレカ / コンビニ対応"}</span>
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
                  ✨ {isEn ? "Recommended" : "おすすめ"}
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
          {isEn
            ? "You'll be taken to Stripe's secure payment page."
            : "Stripeの安全な決済ページに移動します"}
        </p>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-400 hover:text-indigo-500 transition-colors"
          >
            {isEn ? "← Back to Dashboard" : "← ダッシュボードに戻る"}
          </button>
        </div>
      </div>
    </main>
  );
}
