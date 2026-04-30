"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";

export default function CustomerPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function next() {
    if (!value.trim()) return;
    saveOnboarding({ customer_desc: value.trim() });
    router.push("/onboarding/problem");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <ProgressBar current={3} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">お客さんはどんな人が多いですか？</h1>
        <p className="text-gray-500 text-sm mb-8">例：「近くに住む30〜50代の主婦の方が多いです」</p>
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
