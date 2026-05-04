"use client";

import { useState } from "react";
import Link from "next/link";

// ────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────
const SITUATIONS = [
  {
    id: "s1",
    icon: "🔭",
    title: "市場を知る",
    sub: "環境分析・勝ち筋発見",
    frameworks: [
      { id: "pest", name: "PEST分析", desc: "政治・経済・社会・技術の大きな流れを掴む", time: "5分" },
      { id: "3c", name: "3C分析", desc: "顧客・競合・自社の3視点で現状を整理する", time: "5分" },
      { id: "swot", name: "SWOT分析", desc: "強み・弱みと外部の機会・脅威を整理する", time: "5分" },
    ],
  },
  {
    id: "s2",
    icon: "💎",
    title: "差別化する",
    sub: "価値設計・強み発見",
    frameworks: [
      { id: "vrio", name: "VRIO分析", desc: "持続的競争優位を生む自社の強みを評価する", time: "5分" },
    ],
  },
  {
    id: "s3",
    icon: "🎯",
    title: "戦略を立てる",
    sub: "ターゲティング・設計",
    frameworks: [
      { id: "stp", name: "STP分析", desc: "市場を絞り、自社のポジションを確立する", time: "5分" },
      { id: "4p", name: "4P / 4C分析", desc: "商品・価格・場所・プロモーションを設計する", time: "5分" },
    ],
  },
  {
    id: "s4",
    icon: "🚀",
    title: "Web集客・AI検索対応",
    sub: "2026年最新戦略",
    frameworks: [
      { id: "ulssas", name: "ULSSAS分析", desc: "SNS時代の拡散モデルで集客の循環を設計する", time: "5分" },
      { id: "aeo", name: "AEO戦略", desc: "ChatGPT・Geminiに推薦されるブランドになる", time: "5分" },
    ],
  },
];

// ────────────────────────────────────────────
// 型
// ────────────────────────────────────────────
interface AnalysisResult {
  framework: string;
  why: string;
  items: Record<string, string[]>;
  insight: string;
  actions: string[];
}

type Step = "form" | "situation" | "loading" | "result";

// ────────────────────────────────────────────
// コンポーネント
// ────────────────────────────────────────────
export default function MarketingPage() {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [target, setTarget] = useState("");
  const [url, setUrl] = useState("");
  const [selectedSituation, setSelectedSituation] = useState<string | null>(null);
  const [selectedFw, setSelectedFw] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const situation = SITUATIONS.find((s) => s.id === selectedSituation);

  // ── Step1 → Step2
  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !product.trim() || !target.trim()) return;
    setStep("situation");
  }

  // ── 分析実行
  async function handleAnalyze() {
    if (!selectedFw) return;
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/marketing/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, product, target, url: url || undefined, framework: selectedFw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      setResult(data.result);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("situation");
    }
  }

  // ── コピー
  function handleCopy() {
    if (!result) return;
    const text = [
      `■ ${result.framework}`,
      `【なぜ重要か】\n${result.why}`,
      ...Object.entries(result.items).map(
        ([k, vs]) => `【${k}】\n${vs.map((v) => `・${v}`).join("\n")}`
      ),
      `【インサイト】\n${result.insight}`,
      `【今週のアクション】\n${result.actions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`,
    ].join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────

  // ── ローディング
  if (step === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-6" />
        <p className="text-gray-600 font-medium text-lg">AIが分析中です…</p>
        <p className="text-gray-400 text-sm mt-2">Gemini / Groqが{situation?.frameworks.find(f=>f.id===selectedFw)?.name ?? "フレームワーク"}を生成しています</p>
      </main>
    );
  }

  // ── 結果
  if (step === "result" && result) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setStep("situation"); setResult(null); }} className="text-gray-400 text-sm hover:text-gray-600">← 戻る</button>
            <h1 className="text-xl font-bold text-gray-900">{result.framework}</h1>
          </div>

          {/* なぜ重要か */}
          <div className="bg-indigo-50 rounded-2xl px-4 py-3 mb-5">
            <p className="text-xs text-indigo-400 font-medium mb-1">なぜこの分析が重要か</p>
            <p className="text-indigo-800 text-sm leading-relaxed">{result.why}</p>
          </div>

          {/* フレームワーク本体 */}
          <div className="flex flex-col gap-3 mb-5">
            {Object.entries(result.items).map(([label, items]) => (
              <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{label}</p>
                <ul className="flex flex-col gap-1">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* インサイト */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-5">
            <p className="text-xs font-semibold text-amber-500 mb-1">💡 インサイト</p>
            <p className="text-amber-900 text-sm leading-relaxed">{result.insight}</p>
          </div>

          {/* 今週のアクション */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <p className="text-xs font-semibold text-gray-500 mb-3">今週できるアクション</p>
            <ol className="flex flex-col gap-3">
              {result.actions.map((action, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-gray-700">{action}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* ボタン群 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCopy}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl transition-colors active:scale-95"
            >
              {copied ? "✅ コピーしました" : "📋 分析結果をコピー"}
            </button>
            <button
              onClick={() => { setStep("situation"); setSelectedFw(null); setResult(null); }}
              className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              別のフレームワークを分析する
            </button>
            <Link
              href="/onboarding/industry"
              className="w-full border border-indigo-100 text-indigo-500 font-medium py-3 rounded-2xl hover:bg-indigo-50 transition-colors text-center"
            >
              週次アクションプランを作る →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Step2: シチュエーション・FW選択
  if (step === "situation") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setStep("form")} className="text-gray-400 text-sm mb-4 hover:text-gray-600">← 自社情報を修正</button>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">どの分析をしますか？</h1>
          <p className="text-gray-500 text-sm mb-6">{name} · {product}</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 mb-6">
            {SITUATIONS.map((sit) => (
              <div key={sit.id}>
                {/* シチュエーションヘッダー */}
                <button
                  onClick={() => setSelectedSituation(sit.id === selectedSituation ? null : sit.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ${
                    selectedSituation === sit.id
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-white border-gray-100 hover:border-indigo-100"
                  }`}
                >
                  <span className="text-2xl">{sit.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{sit.title}</p>
                    <p className="text-xs text-gray-400">{sit.sub}</p>
                  </div>
                  <span className="text-gray-300 text-lg">{selectedSituation === sit.id ? "▲" : "▼"}</span>
                </button>

                {/* フレームワーク一覧 */}
                {selectedSituation === sit.id && (
                  <div className="mt-2 flex flex-col gap-2 pl-2">
                    {sit.frameworks.map((fw) => (
                      <button
                        key={fw.id}
                        onClick={() => setSelectedFw(fw.id === selectedFw ? null : fw.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ${
                          selectedFw === fw.id
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-white border-gray-100 hover:border-indigo-200"
                        }`}
                      >
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${selectedFw === fw.id ? "text-white" : "text-gray-800"}`}>{fw.name}</p>
                          <p className={`text-xs mt-0.5 ${selectedFw === fw.id ? "text-indigo-100" : "text-gray-400"}`}>{fw.desc}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFw === fw.id ? "bg-indigo-400 text-white" : "bg-gray-100 text-gray-400"}`}>{fw.time}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedFw}
            className={`w-full font-semibold text-lg py-4 rounded-2xl transition-colors ${
              selectedFw
                ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {selectedFw
              ? `${SITUATIONS.flatMap(s => s.frameworks).find(f => f.id === selectedFw)?.name ?? ""}を分析する →`
              : "フレームワークを選んでください"}
          </button>
        </div>
      </main>
    );
  }

  // ── Step1: 自社情報フォーム（デフォルト）
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <section className="flex-1 px-6 py-12 max-w-lg mx-auto w-full">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">← ホームに戻る</Link>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mt-4 mb-3">
            <span>📊</span> AIマーケティング分析
          </div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            あなたのビジネスを<br />
            <span className="text-indigo-500">フレームワークで分析</span>
          </h1>
          <p className="text-gray-500 text-sm mt-3 leading-relaxed">
            自社情報を入力するだけで、PEST・3C・STP・4Pなど<br />プロレベルのマーケティング分析をAIが自動生成します。
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              会社名・屋号 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 田中カフェ / 株式会社〇〇"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              商品・サービス <span className="text-red-400">*</span>
            </label>
            <textarea
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="例: 地元野菜を使ったランチカフェ。テイクアウトも対応。"
              required
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ターゲット顧客 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="例: 30〜50代の会社員、ランチに健康的な食事を求める人"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Webサイト URL <span className="text-gray-400 font-normal">（任意）</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || !product.trim() || !target.trim()}
            className={`w-full font-semibold text-lg py-4 rounded-2xl transition-colors mt-2 ${
              name.trim() && product.trim() && target.trim()
                ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            フレームワークを選ぶ →
          </button>
        </form>

        {/* フレームワーク一覧プレビュー */}
        <div className="mt-10">
          <p className="text-xs text-gray-400 font-medium mb-4 text-center">利用できる分析フレームワーク（8種類）</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["PEST分析", "3C分析", "SWOT分析", "VRIO分析", "STP分析", "4P/4C分析", "ULSSAS", "AEO戦略"].map((fw) => (
              <span key={fw} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{fw}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center py-6 text-xs text-gray-300 border-t border-gray-100">
        © 2026 Growl
      </footer>
    </main>
  );
}
