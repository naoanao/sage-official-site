"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DevPage() {
  const router = useRouter();
  const [status, setStatus] = useState("設定中...");

  useEffect(() => {
    // 開発者モードON
    localStorage.setItem("growl_dev", "true");
    // オンボーディングデータをリセット（毎回クリーンな状態でテスト）
    localStorage.removeItem("ai_mkt_onboarding");
    localStorage.removeItem("ai_mkt_session");
    localStorage.removeItem("ai_mkt_user_id");
    localStorage.removeItem("growl_monthly_usage");
    setStatus("✅ 開発者モード ON・データリセット完了");
    setTimeout(() => router.push("/onboarding/industry"), 1500);
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-800 mb-2">{status}</p>
        <p className="text-gray-400 text-sm">オンボーディングへ移動します...</p>
      </div>
    </main>
  );
}
