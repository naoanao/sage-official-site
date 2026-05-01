"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";

const EXAMPLES: Record<string, string> = {
  restaurant: "近所の焼き鳥居酒屋を夫婦2人で経営しています",
  salon: "自宅サロンでまつ毛エクステと眉毛のデザインをしています",
  ec: "手作りアクセサリーをminneとBASEで販売しています",
  professional: "フリーランスの税理士として個人事業主の確定申告を支援しています",
  construction: "地元で外壁塗装と屋根修理を専門に行っています",
  other: "オンラインで英語レッスンを提供しています",
};

export default function BusinessPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [example, setExample] = useState("地元の定食屋を一人で切り盛りしています");

  useEffect(() => {
    const data = loadOnboarding();
    if (data.industry && EXAMPLES[data.industry]) {
      setExample(EXAMPLES[data.industry]);
    }
  }, []);

  function next() {
    if (!value.trim()) return;
    saveOnboarding({ business_desc: value.trim(), booking_url: bookingUrl.trim() || undefined });
    router.push("/onboarding/customer");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <ProgressBar current={2} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">あなたの仕事を一言で</h1>
        <p className="text-gray-500 text-sm mb-8">例：「{example}」</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={4}
          placeholder="自由に書いてください"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            予約・問い合わせURL <span className="text-gray-400 font-normal">（任意）</span>
          </label>
          <input
            type="url"
            className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl px-4 py-3 text-gray-800 text-base outline-none transition-colors"
            placeholder="https://your-booking-site.com"
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">入力すると、生成される投稿文に自動で反映されます</p>
        </div>
        <button
          onClick={next}
          disabled={!value.trim()}
          className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
        >
          次へ
        </button>
      </div>
    </main>
  );
}
