"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding, saveUserId, saveSession } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";

const EXAMPLES: Record<string, string> = {
  restaurant: "SNSを気にせず、毎日料理だけに集中できている",
  salon: "予約が常に埋まっていて、新規集客を考えなくていい状態",
  ec: "注文が毎日安定して入り、制作に専念できている",
  professional: "紹介がなくてもネットから新規が継続して来る状態",
  construction: "見積もり依頼が月に10件以上安定して来ている",
  other: "生徒が自然と集まり、募集に時間をかけなくていい",
};

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem("growl_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("growl_device_id", id);
  }
  return id;
}

export default function GoalPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [example, setExample] = useState("集客を気にせず、料理だけに集中できている");

  useEffect(() => {
    const data = loadOnboarding();
    if (!data.industry) {
      router.replace("/onboarding/industry");
      return;
    }
    if (EXAMPLES[data.industry]) {
      setExample(EXAMPLES[data.industry as keyof typeof EXAMPLES]);
    }
  }, [router]);

  async function finish() {
    if (!value.trim()) return;
    setLoading(true);
    setError("");

    const data = { ...loadOnboarding(), final_goal: value.trim() };
    saveOnboarding({ final_goal: value.trim() });

    const device_id = getOrCreateDeviceId();

    try {
      const res = await fetch("/api/generate-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, device_id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成に失敗しました");
      if (json.userId) saveUserId(json.userId);
      if (json.session) saveSession(json.session);
      // LINE設定ページへ（スキップ可能）
      router.push("/onboarding/line");
    } catch (e) {
      setError("少し混み合っています。もう一度お試しください。");
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
        <p className="text-gray-500 text-sm mb-8">例：「{example}」</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={5}
          placeholder="理想の未来を教えてください"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-xs break-all">{error}</p>
          </div>
        )}
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
