"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding, saveUserId, saveSession } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import { INDUSTRY_LABELS } from "@/lib/types";

export default function GoalPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    if (!value.trim()) return;
    setLoading(true);
    setError("");

    const data = { ...loadOnboarding(), final_goal: value.trim() };
    saveOnboarding({ final_goal: value.trim() });

    try {
      const res = await fetch("/api/generate-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("生成に失敗しました");
      const json = await res.json();
      if (json.userId) saveUserId(json.userId);
      if (json.session) saveSession(json.session);
      router.push("/dashboard");
    } catch (e) {
      setError("エラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <ProgressBar current={5} total={5} />
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-6">
          <p className="text-indigo-600 text-xs font-medium">最後の1問です ✨</p>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          このアプリが完璧に機能したとき、あなたの1日はどう変わっていますか？
        </h1>
        <p className="text-gray-500 text-sm mb-8">例：「集客を気にせず、料理だけに集中できている」</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={5}
          placeholder="理想の未来を教えてください"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          onClick={finish}
          disabled={!value.trim() || loading}
          type="button"
          className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl transition-colors text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              AIが考えています...
            </>
          ) : (
            "今週やること3つを出す"
          )}
        </button>
      </div>
    </main>
  );
}
