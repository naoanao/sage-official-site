"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding, isFlowActive } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

const EXAMPLES_JA: Record<string, string> = {
  restaurant: "近くのオフィスで働く20〜40代のサラリーマンが多いです",
  salon: "結婚式や成人式前後の20代女性が中心です",
  ec: "20〜30代の女性でプレゼント用に購入する方が多いです",
  professional: "開業したばかりの個人事業主や小規模法人の経営者です",
  construction: "築20年以上の戸建てにお住まいの50〜60代の方です",
  other: "英語で転職や留学を考えている20〜35歳の社会人です",
};

const EXAMPLES_EN: Record<string, string> = {
  restaurant: "Mostly office workers in their 20s–40s from nearby buildings",
  salon: "Women in their 20s before weddings or coming-of-age ceremonies",
  ec: "Women in their 20s–30s buying as gifts for others",
  professional: "Newly self-employed individuals or small business owners",
  construction: "Homeowners in their 50s–60s with houses over 20 years old",
  other: "Working adults aged 20–35 considering a career change or studying abroad",
};

export default function CustomerPage() {
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
    if (!data.business_desc) {
      router.replace("/onboarding/business");
      return;
    }
    const examples = lang === "en" ? EXAMPLES_EN : EXAMPLES_JA;
    setExample(examples[data.industry] ?? examples["other"] ?? "");
  }, [router, lang]);

  function next() {
    if (!value.trim()) {
      setInputError(lang === "en" ? "Please describe your typical customers" : "お客さんの情報を入力してください");
      return;
    }
    if (value.trim().length < 5) {
      setInputError(lang === "en" ? "Please give a bit more detail" : "もう少し詳しく教えてください（5文字以上）");
      return;
    }
    setInputError("");
    saveOnboarding({ customer_desc: value.trim() });
    router.push("/onboarding/problem");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={() => router.push("/onboarding/business")}
            className="text-gray-400 hover:text-indigo-500 transition-colors p-1 -ml-1 mr-2"
          >
            {t("ob.back")}
          </button>
          <div className="ml-auto"><LangToggle /></div>
        </div>
        <ProgressBar current={3} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t("ob.customer.title")}</h1>
        <p className="text-gray-500 text-sm mb-8">e.g. 「{example}」</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={4}
          placeholder={t("ob.customer.placeholder")}
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
