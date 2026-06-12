"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 本番結果物: NEXT_PUBLIC_DEV_ENABLED=true の場合のみ表示
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEV_ENABLED !== "true") {
  window.location.replace("/");
}


type Action = "pro" | "reset" | "reset-all";

function applyAction(action: Action) {
  if (action === "pro") {
    localStorage.setItem("growl_dev", "true");
    localStorage.setItem("growl_plan", "pro");
    // 使用回数上限もリセット
    localStorage.removeItem("growl_monthly_usage");
    return "✅ プロプラン解放・制限解除 → ダッシュボードへ";
  }
  if (action === "reset") {
    // セッション・使用量だけリセット（オンボーディングは保持）
    localStorage.removeItem("ai_mkt_session");
    localStorage.removeItem("growl_monthly_usage");
    return "✅ セッション・使用量リセット → ダッシュボードへ";
  }
  if (action === "reset-all") {
    localStorage.removeItem("ai_mkt_onboarding");
    localStorage.removeItem("ai_mkt_session");
    localStorage.removeItem("ai_mkt_user_id");
    localStorage.removeItem("growl_monthly_usage");
    localStorage.removeItem("growl_plan");
    localStorage.removeItem("growl_dev");
    return "✅ 全データリセット → オンボーディングへ";
  }
  return "";
}

export default function DevPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  function handleAction(action: Action) {
    const msg = applyAction(action);
    setMessage(msg);
    if (action === "reset-all") {
      setTimeout(() => router.push("/onboarding/industry"), 1200);
    } else {
      setTimeout(() => router.push("/dashboard"), 1200);
    }
  }

  // 現在のlocalStorage状態を表示
  const [info, setInfo] = useState<Record<string, string>>({});
  useEffect(() => {
    setInfo({
      plan: localStorage.getItem("growl_plan") ?? "未設定(free)",
      dev: localStorage.getItem("growl_dev") ?? "false",
      usage: localStorage.getItem("growl_monthly_usage") ?? "なし",
      session: localStorage.getItem("ai_mkt_session") ? "あり" : "なし",
    });
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-xl font-bold mb-1">🛠 開発者パネル</h1>
        <p className="text-gray-500 text-xs mb-6">growl-ai.com/dev</p>

        {/* 現在の状態 */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 text-xs text-gray-300 space-y-1">
          <p><span className="text-gray-500">plan:</span> <span className="text-green-400">{info.plan}</span></p>
          <p><span className="text-gray-500">dev:</span> {info.dev}</p>
          <p><span className="text-gray-500">usage:</span> {info.usage}</p>
          <p><span className="text-gray-500">session:</span> {info.session}</p>
        </div>

        {message ? (
          <p className="text-green-400 text-center font-semibold mb-4">{message}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleAction("pro")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              🚀 プロプラン解放（全機能テスト）
            </button>
            <button
              onClick={() => handleAction("reset")}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              🔄 セッション・使用量リセット
            </button>
            <button
              onClick={() => handleAction("reset-all")}
              className="w-full bg-red-900 hover:bg-red-800 text-red-300 font-semibold py-3 rounded-xl transition-colors"
            >
              ⚠️ 全データリセット（初期状態に）
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
