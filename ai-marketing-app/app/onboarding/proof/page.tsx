"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveProofData, loadProofData, isFlowActive } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import { useLang } from "@/lib/i18n";

export default function ProofPage() {
  const router = useRouter();
  const { lang } = useLang();
  const isEn = lang === "en";

  const [proofNumbers, setProofNumbers] = useState("");
  const [customerQuote, setCustomerQuote] = useState("");
  const [priceOrOffer, setPriceOrOffer] = useState("");

  useEffect(() => {
    if (!isFlowActive()) { router.replace("/onboarding/industry"); return; }
    const existing = loadProofData();
    if (existing.proof_numbers) setProofNumbers(existing.proof_numbers);
    if (existing.customer_quote) setCustomerQuote(existing.customer_quote);
    if (existing.price_or_offer) setPriceOrOffer(existing.price_or_offer);
  }, [router]);

  function next() {
    // 任意入力 — 何も入れなくてもスキップ可能
    saveProofData({
      proof_numbers: proofNumbers.trim() || undefined,
      customer_quote: customerQuote.trim() || undefined,
      price_or_offer: priceOrOffer.trim() || undefined,
    });
    router.push("/onboarding/goal");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <ProgressBar step={5} total={6} />

        <div className="text-center mb-6 mt-4">
          <span className="text-4xl">✨</span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">
            {isEn ? "Strengthen your ads" : "広告をもっと強くする"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEn
              ? "Optional — but these details make your ads dramatically more convincing."
              : "任意入力ですが、これがあると広告の説得力が劇的に上がります。"}
          </p>
        </div>

        <div className="space-y-4">
          {/* 実績・数字 */}
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
            <label className="block text-xs font-bold text-indigo-600 mb-1">
              📊 {isEn ? "Proof / Results (numbers)" : "実績・数字"}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {isEn
                ? 'e.g. "300+ clients", "Average 3x ROI", "Used by 50 companies"'
                : "例：「300社以上が導入」「平均CVR3倍」「累計1,000名受講」"}
            </p>
            <input
              type="text"
              value={proofNumbers}
              onChange={(e) => setProofNumbers(e.target.value)}
              placeholder={isEn ? "300+ clients, 3x average ROI..." : "300社導入、平均CVR3倍..."}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* お客様の声 */}
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
            <label className="block text-xs font-bold text-indigo-600 mb-1">
              💬 {isEn ? "Customer quote (real words)" : "お客様の声（実際の言葉）"}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {isEn
                ? 'e.g. "I was skeptical but it changed my business in 30 days"'
                : "例：「半信半疑でしたが、30日で売上が2倍になりました」"}
            </p>
            <textarea
              value={customerQuote}
              onChange={(e) => setCustomerQuote(e.target.value)}
              placeholder={isEn ? "In their own words..." : "お客様の実際の言葉..."}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
            />
          </div>

          {/* 価格・オファー */}
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
            <label className="block text-xs font-bold text-indigo-600 mb-1">
              💰 {isEn ? "Price / Offer" : "価格・オファー"}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {isEn
                ? 'e.g. "Free first month", "From $29/mo", "Free consultation"'
                : "例：「初月無料」「月額980円〜」「無料相談あり」"}
            </p>
            <input
              type="text"
              value={priceOrOffer}
              onChange={(e) => setPriceOrOffer(e.target.value)}
              placeholder={isEn ? "Free trial, $29/mo..." : "初月無料、月額980円..."}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={next}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
          >
            {isEn ? "Next →" : "次へ →"}
          </button>
          <button
            onClick={next}
            className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors"
          >
            {isEn ? "Skip for now" : "今はスキップ"}
          </button>
        </div>
      </div>
    </main>
  );
}
