"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding, isFlowActive } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

const EXAMPLES_JA: Record<string, string> = {
  restaurant: "近所の焼き鳥居酒屋を夫婦2人で経営しています",
  salon: "自宅サロンでまつ毛エクステと眉毛のデザインをしています",
  ec: "手作りアクセサリーをminneとBASEで販売しています",
  professional: "フリーランスの税理士として個人事業主の確定申告を支援しています",
  construction: "地元で外壁塗装と屋根修理を専門に行っています",
  other: "オンラインで英語レッスンを提供しています",
};

const EXAMPLES_EN: Record<string, string> = {
  restaurant: "We run a small yakitori izakaya as a couple in our neighborhood",
  salon: "I do eyelash extensions and eyebrow design from my home salon",
  ec: "I sell handmade accessories on Etsy and Shopify",
  professional: "I'm a freelance accountant helping self-employed individuals with tax returns",
  construction: "We specialize in exterior painting and roof repairs locally",
  other: "I provide online English lessons",
};

export default function BusinessPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [value, setValue] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [example, setExample] = useState("");
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    const data = loadOnboarding();
    if (!isFlowActive() || !data.industry) {
      router.replace("/onboarding/industry");
      return;
    }
    const examples = lang === "en" ? EXAMPLES_EN : EXAMPLES_JA;
    setExample(examples[data.industry] ?? examples["other"] ?? "");
  }, [router, lang]);

  function next() {
    if (!value.trim()) {
      setInputError(lang === "en" ? "Please describe your business" : "仕事の内容を入力してください");
      return;
    }
    if (value.trim().length < 5) {
      setInputError(lang === "en" ? "Please give a bit more detail" : "もう少し詳しく教えてください（5文字以上）");
      return;
    }
    setInputError("");
    saveOnboarding({ business_desc: value.trim(), booking_url: bookingUrl.trim() || undefined });
    router.push("/onboarding/customer");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={() => router.push("/onboarding/industry")}
            className="text-gray-400 hover:text-indigo-500 transition-colors p-1 -ml-1 mr-2"
          >
            {t("ob.back")}
          </button>
          <div className="ml-auto"><LangToggle /></div>
        </div>
        <ProgressBar current={2} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t("ob.business.title")}</h1>
        <p className="text-gray-500 text-sm mb-8">e.g. 「{example}」</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={4}
          placeholder={t("ob.business.placeholder")}
          value={value}
          onChange={(e) => { setValue(e.target.value); setInputError(""); }}
        />
        {inputError && <p className="mt-2 text-red-500 text-sm">{inputError}</p>}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {lang === "en" ? "Booking / Contact URL" : "予約・問い合わせURL"}{" "}
            <span className="text-gray-400 font-normal">({lang === "en" ? "optional" : "任意"})</span>
          </label>
          <input
            type="url"
            className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl px-4 py-3 text-gray-800 text-base outline-none transition-colors"
            placeholder="https://your-booking-site.com"
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            {lang === "en"
              ? "If provided, this URL will be included in your generated content"
              : "入力すると、生成される投稿文に自動で反映されます"}
          </p>
        </div>
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
