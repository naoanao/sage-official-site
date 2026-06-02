"use client";

import { useState } from "react";

interface AdCopy {
  headline: string;
  primary_text: string;
  description: string;
  cta: string;
  target_audience: string;
  image_prompt: string;
}

interface AdBoostCardProps {
  session: {
    industry?: string;
    business_desc?: string;
    customer_desc?: string;
    main_problem?: string;
    final_goal?: string;
  };
  lang?: string;
}

export default function AdBoostCard({ session, lang = "en" }: AdBoostCardProps) {
  const [step, setStep] = useState<"idle" | "generating" | "preview" | "submitting" | "done" | "error">("idle");
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null);
  const [result, setResult] = useState<{ message?: string; manager_url?: string; error?: string } | null>(null);
  const [budget, setBudget] = useState(500);
  const isEn = lang === "en";

  async function handleGenerate() {
    setStep("generating");
    try {
      const res = await fetch("/api/meta-ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: session.industry,
          business_desc: session.business_desc,
          customer_desc: session.customer_desc,
          main_problem: session.main_problem,
          goal: session.final_goal,
          lang,
        }),
      });
      const data = await res.json();
      if (data.success && data.ad_copy) {
        setAdCopy(data.ad_copy);
        setStep("preview");
      } else {
        setResult({ error: data.error || "Generation failed" });
        setStep("error");
      }
    } catch (e) {
      setResult({ error: String(e) });
      setStep("error");
    }
  }

  async function handleSubmit() {
    if (!adCopy) return;
    setStep("submitting");
    try {
      const res = await fetch("/api/meta-ads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_copy: adCopy,
          link_url: "https://growl-app.vercel.app",
          daily_budget: budget,
        }),
      });
      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch (e) {
      setResult({ error: String(e) });
      setStep("error");
    }
  }

  return (
    <div className="mt-6 rounded-2xl overflow-hidden shadow-sm border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="px-5 py-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📣</span>
          <p className="font-bold text-gray-900 text-sm">
            {isEn ? "Boost with Meta Ads" : "Meta広告で集客する"}
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {isEn
            ? "AI generates ad copy from your business info → submit to Facebook/Instagram ads"
            : "あなたの事業情報からAIが広告文を生成→Facebook/Instagram広告に出稿"}
        </p>

        {/* idle: 生成ボタン */}
        {step === "idle" && (
          <button
            onClick={handleGenerate}
            className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
          >
            {isEn ? "✨ Generate Ad Copy" : "✨ 広告文を生成する"}
          </button>
        )}

        {/* generating */}
        {step === "generating" && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-600 font-medium">
              {isEn ? "Generating ad copy..." : "広告文を生成中..."}
            </span>
          </div>
        )}

        {/* preview: 生成結果確認 */}
        {step === "preview" && adCopy && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-1">
                {isEn ? "Headline" : "見出し"}
              </p>
              <p className="text-sm font-bold text-gray-900">{adCopy.headline}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-1">
                {isEn ? "Ad Text" : "広告本文"}
              </p>
              <p className="text-sm text-gray-700">{adCopy.primary_text}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-1">
                {isEn ? "Target Audience" : "ターゲット提案"}
              </p>
              <p className="text-xs text-gray-600">{adCopy.target_audience}</p>
            </div>

            {/* 予算設定 */}
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-2">
                {isEn ? "Daily Budget" : "1日の予算"}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={300}
                  max={3000}
                  step={100}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-bold text-gray-900 w-16 text-right">
                  ¥{budget.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("idle")}
                className="flex-1 bg-gray-100 text-gray-600 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-200 transition-all"
              >
                {isEn ? "Regenerate" : "作り直す"}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
              >
                {isEn ? "Submit Ad (Paused)" : "広告を作成する（確認待ち）"}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {isEn
                ? "Ad will be created in PAUSED state. You activate it in Meta Ads Manager."
                : "広告は一時停止状態で作成されます。Meta広告マネージャーで有効化してください。"}
            </p>
          </div>
        )}

        {/* submitting */}
        {step === "submitting" && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-600 font-medium">
              {isEn ? "Submitting to Meta..." : "Meta広告に送信中..."}
            </span>
          </div>
        )}

        {/* done */}
        {step === "done" && result && (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-sm font-bold text-green-700 mb-1">✅ {isEn ? "Ad Created!" : "広告を作成しました！"}</p>
              <p className="text-xs text-green-600">{result.message}</p>
            </div>
            {result.manager_url && (
              <a
                href={result.manager_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 text-white font-bold text-sm py-2.5 rounded-xl text-center hover:bg-blue-700 transition-all"
              >
                {isEn ? "Open Meta Ads Manager →" : "Meta広告マネージャーを開く →"}
              </a>
            )}
            <button
              onClick={() => { setStep("idle"); setAdCopy(null); setResult(null); }}
              className="w-full bg-gray-100 text-gray-600 font-medium text-sm py-2 rounded-xl hover:bg-gray-200 transition-all"
            >
              {isEn ? "Create another ad" : "別の広告を作る"}
            </button>
          </div>
        )}

        {/* error */}
        {step === "error" && (
          <div className="space-y-2">
            <p className="text-xs text-red-500">{result?.error}</p>
            <button
              onClick={() => { setStep("idle"); setResult(null); }}
              className="w-full bg-gray-100 text-gray-600 font-medium text-sm py-2 rounded-xl"
            >
              {isEn ? "Try again" : "もう一度試す"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
