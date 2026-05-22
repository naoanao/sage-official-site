"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding, isFlowActive } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

const EXAMPLES_JA: Record<string, string> = {
  restaurant: "ランチは埋まるのに夜の集客が全然できていない",
  salon: "新規のお客さんがなかなか来ない。紹介頼みになっている",
  ec: "商品は作れるがSNSで発信する時間もやり方もわからない",
  professional: "ホームページはあるが問い合わせが月に1〜2件しか来ない",
  construction: "チラシを配っても反応がなく、新規の問い合わせが少ない",
  other: "Instagramを始めたが何を投稿すればいいかわからない",
};

const EXAMPLES_EN: Record<string, string> = {
  restaurant: "Lunch is always full but evening service isn't attracting customers",
  salon: "Hard to get new clients — relying almost entirely on referrals",
  ec: "I can make products but don't know how to promote on social media",
  professional: "I have a website but only get 1–2 inquiries per month",
  construction: "Flyers get no response and new inquiries are very rare",
  other: "I started Instagram but don't know what to post",
};

export default function ProblemPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [value, setValue] = useState("");
  const [example, setExample] = useState("");
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    const data = loadOnboarding();
    if (!isFlowActive() || !data.industry) {
      router.replace("/onboarding/industry");
      return;
    }
    if (!data.customer_desc) {
      router.replace("/onboarding/customer");
      return;
    }
    const examples = lang === "en" ? EXAMPLES_EN : EXAMPLES_JA;
    setExample(examples[data.industry] ?? examples["other"] ?? "");
  }, [router, lang]);

  function next() {
    if (!value.trim()) {
      setInputError(lang === "en" ? "Please describe your main challenge" : "困っていることを入力してください");
      return;
    }
    if (value.trim().length < 5) {
      setInputError(lang === "en" ? "Please give a bit more detail" : "もう少し詳しく教えてください（5文字以上）");
      return;
    }
    setInputError("");
    saveOnboarding({ main_problem: value.trim() });
    router.push("/onboarding/goal");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={() => router.push("/onboarding/customer")}
            className="text-gray-400 hover:text-indigo-500 transition-colors p-1 -ml-1 mr-2"
          >
            {t("ob.back")}
          </button>
          <div className="ml-auto"><LangToggle /></div>
        </div>
        <ProgressBar current={4} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t("ob.problem.title")}</h1>
        <p className="text-gray-500 text-sm mb-8">e.g. 「{example}」</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={4}
          placeholder={t("ob.problem.placeholder")}
          value={value}
          onChange={(e) => { setValue(e.target.value); setInputError(""); }}
        />
        {inputError && <p className="mt-2 text-red-500 text-sm">{inputError}</p>}
        <button
          onClick={next}
          className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
        >
          {t("ob.next")}
        </button>
      </div>
    </main>
  );
}
