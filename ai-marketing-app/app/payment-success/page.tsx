"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setCachedPlan } from "@/components/FreeProgressBar";
import { loadDeviceId } from "@/lib/store";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = params.get("plan") as "standard" | "pro" | null;
  const [status, setStatus] = useState<"activating" | "done" | "error">("activating");

  useEffect(() => {
    if (!plan || (plan !== "standard" && plan !== "pro")) {
      setStatus("error");
      return;
    }

    async function activatePlan() {
      try {
        // localStorageに即時反映
        setCachedPlan(plan!);

        // Supabaseにも反映
        const deviceId = loadDeviceId();
        await fetch("/api/activate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, plan }),
        });

        setStatus("done");
      } catch {
        // localStorageには保存できているのでエラーでも動く
        setStatus("done");
      }
    }

    activatePlan();
  }, [plan]);

  const planName = plan === "pro" ? "プロプラン" : "スタンダードプラン";

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {status === "activating" && (
          <>
            <div className="animate-spin w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full mx-auto mb-6" />
            <p className="text-gray-500 text-sm">プランを有効化しています...</p>
          </>
        )}

        {status === "done" && (
          <>
            <div className="text-6xl mb-5">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              ありがとうございます！
            </h1>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4 mb-6">
              <p className="text-sm font-semibold text-indigo-700 mb-1">
                ✦ {planName} が有効になりました
              </p>
              <p className="text-xs text-indigo-500">
                生成回数の制限が解除されました
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              毎週月曜日の朝8時に、今週の集客施策3つをお届けします。
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              ダッシュボードを開く
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-4xl mb-4">😓</div>
            <p className="text-gray-600 mb-6">プランの確認中にエラーが発生しました。</p>
            <button
              onClick={() => router.push("/upgrade")}
              className="w-full bg-indigo-500 text-white font-semibold py-3 rounded-2xl"
            >
              プランページに戻る
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  );
}
