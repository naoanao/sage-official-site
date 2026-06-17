"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveProofData, loadProofData, isFlowActive } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

export default function ProofPage() {
  const router = useRouter();
  const { t, lang } = useLang();

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
    saveProofData({
      proof_numbers: proofNumbers.trim() || undefined,
      customer_quote: customerQuote.trim() || undefined,
      price_or_offer: priceOrOffer.trim() || undefined,
    });
    router.push("/onboarding/goal");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md" key={lang}>
        <ProgressBar current={5} total={6} />
        <div className="flex justify-end mb-2">
          <LangToggle />
        </div>

        <div className="text-center mb-6 mt-4">
          <span className="text-4xl">✨</span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">
            {t("ob.proof.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("ob.proof.sub")}
          </p>
        </div>

        <div className="space-y-4">
          {/* 実績・数字 */}
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
            <label className="block text-xs font-bold text-indigo-600 mb-1">
              📊 {t("ob.proof.num")}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {t("ob.proof.num.hint")}
            </p>
            <input
              type="text"
              value={proofNumbers}
              onChange={(e) => setProofNumbers(e.target.value)}
              placeholder={t("ob.proof.num.placeholder")}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* お客様の声 */}
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
            <label className="block text-xs font-bold text-indigo-600 mb-1">
              💬 {t("ob.proof.quote")}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {t("ob.proof.quote.hint")}
            </p>
            <textarea
              value={customerQuote}
              onChange={(e) => setCustomerQuote(e.target.value)}
              placeholder={t("ob.proof.quote.placeholder")}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
            />
          </div>

          {/* 価格・オファー */}
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
            <label className="block text-xs font-bold text-indigo-600 mb-1">
              💰 {t("ob.proof.price")}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {t("ob.proof.price.hint")}
            </p>
            <input
              type="text"
              value={priceOrOffer}
              onChange={(e) => setPriceOrOffer(e.target.value)}
              placeholder={t("ob.proof.price.placeholder")}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={next}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
          >
            {t("ob.proof.next")}
          </button>
          <button
            onClick={next}
            className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors"
          >
            {t("ob.proof.skip")}
          </button>
        </div>
      </div>
    </main>
  );
}
