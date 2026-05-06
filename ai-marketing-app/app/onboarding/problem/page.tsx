"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";

const EXAMPLES: Record<string, string> = {
  restaurant: "ランチは埋まるのに夜の集客が全然できていない",
  salon: "新規のお客さんがなかなか来ない。紹介頼みになっている",
  ec: "商品は作れるがSNSで発信する時間もやり方もわからない",
  professional: "ホームページはあるが問い合わせが月に1〜2件しか来ない",
  construction: "チラシを配っても反応がなく、新規の問い合わせが少ない",
  other: "Instagramを始めたが何を投稿すればいいかわからない",
};

export default function ProblemPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [example, setExample] = useState("新規のお客さんが全然来ない");

  useEffect(() => {
    const data = loadOnboarding();
    if (!data.industry) {
      router.replace("/onboarding/industry");
      return;
    }
    if (EXAMPLES[data.industry]) {
      setExample(EXAMPLES[data.industry]);
    }
  }, [router]);

  function next() {
    if (!value.trim()) return;
    saveOnboarding({ main_problem: value.trim() });
    router.push("/onboarding/goal");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <ProgressBar current={4} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">今、一番困っていることは？</h1>
        <p className="text-gray-500 text-sm mb-8">例：「{example}」</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={4}
          placeholder="自由に書いてください"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
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
