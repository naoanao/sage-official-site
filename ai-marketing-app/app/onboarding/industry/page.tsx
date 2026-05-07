"use client";

import { useRouter } from "next/navigation";
import { saveOnboarding, clearOnboarding, setFlowActive } from "@/lib/store";
import { Industry, INDUSTRY_LABELS, INDUSTRY_ICONS } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";

const industries: Industry[] = ["restaurant", "salon", "ec", "professional", "construction", "other"];

export default function IndustryPage() {
  const router = useRouter();

  function select(industry: Industry) {
    clearOnboarding(); // 前回データ・フローフラグを完全リセット
    saveOnboarding({ industry });
    setFlowActive(); // 新しいフローが開始されたことをマーク
    router.push("/onboarding/business");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <ProgressBar current={1} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">どんなお仕事ですか？</h1>
        <p className="text-gray-500 text-sm mb-8">あなたの業種に合わせた提案をします</p>
        <div className="grid grid-cols-2 gap-3">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => select(ind)}
              className="bg-white border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 active:scale-95"
            >
              <span className="text-3xl">{INDUSTRY_ICONS[ind]}</span>
              <span className="text-sm font-medium text-gray-700">{INDUSTRY_LABELS[ind]}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
