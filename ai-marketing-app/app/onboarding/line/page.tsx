"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LineOnboardingPage() {
  const router = useRouter();
  const [lineId, setLineId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!lineId.trim()) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    try {
      // Store LINE user ID (will be sent to API when Supabase is connected)
      localStorage.setItem("growl_line_id", lineId.trim());
      setSubmitted(true);
    } catch {
      // Silently fail, not critical
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-5">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">LINEを登録しました！</h1>
          <p className="text-sm text-gray-500 mb-8">
            毎週月曜の朝8時に、今週やることをLINEでお届けします。
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors"
          >
            ダッシュボードへ →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            LINE通知を設定する
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            毎週月曜の朝8時に、今週やることを<br />LINEで自動でお届けします
          </p>
        </div>

        {/* How to get LINE ID */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-green-800 mb-2">📋 LINE IDの確認方法</p>
          <ol className="text-xs text-green-700 space-y-1">
            <li>1. LINEアプリを開く</li>
            <li>2. プロフィール → 設定 → プロフィール</li>
            <li>3.「LINE ID」をコピーする</li>
          </ol>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            あなたのLINE ID
          </label>
          <input
            type="text"
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            placeholder="例: your_line_id"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-4 rounded-2xl transition-colors"
          >
            {loading ? "設定中..." : "LINE通知を受け取る"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            スキップする（後で設定できます）
          </button>
        </div>
      </div>
    </main>
  );
}
