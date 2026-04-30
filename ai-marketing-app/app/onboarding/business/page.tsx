"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";

export default function BusinessPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function next() {
    if (!value.trim()) return;
    saveOnboarding({ business_desc: value.trim() });
    router.push("/onboarding/customer");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <ProgressBar current={2} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">あなたの仕事を一言で</h1>
        <p className="text-gray-500 text-sm mb-8">例：「地元の定食屋を一人で切り盛りしています」</p>
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
