"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setCachedPlan } from "@/components/FreeProgressBar";
import { loadDeviceId } from "@/lib/store";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = params.get("plan") as "standard" | "pro" | "agency" | null;
  const isAgency = plan === "agency";
  const [status, setStatus] = useState<"activating" | "done" | "error">("activating");

  useEffect(() => {
    if (!plan || (plan !== "standard" && plan !== "pro" && plan !== "agency")) {
      setStatus("error");
      return;
    }

    async function activatePlan() {
      try {
        // 代行(agency)はサーバ側(Stripe webhook)でAIが配信準備するため、ここではSaaSプランのみ有効化
        if (plan === "standard" || plan === "pro") {
          setCachedPlan(plan);
          const deviceId = loadDeviceId();
          await fetch("/api/activate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId, plan }),
          });
        }
        setStatus("done");
      } catch {
        setStatus("done");
      }
    }

    activatePlan();
  }, [plan]);

  const planName = plan === "pro" ? "Pro Plan" : "Standard Plan";

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {status === "activating" && (
          <>
            <div className="animate-spin w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full mx-auto mb-6" />
            <p className="text-gray-500 text-sm">Activating your plan...</p>
          </>
        )}

        {status === "done" && isAgency && (
          <>
            <div className="text-6xl mb-5">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">ありがとうございます！</h1>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4 mb-6">
              <p className="text-sm font-semibold text-indigo-700 mb-1">✦ 広告運用代行のお申込みを受け付けました</p>
              <p className="text-xs text-indigo-500">AIが広告の配信準備を開始します</p>
            </div>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              あとはおまかせください。AIが広告を配信・最適化し、成果はレポートでお届けします。確認のご連絡をすることがあります。
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              ダッシュボードへ
            </button>
          </>
        )}

        {status === "done" && !isAgency && (
          <>
            <div className="text-6xl mb-5">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              You&apos;re all set!
            </h1>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4 mb-6">
              <p className="text-sm font-semibold text-indigo-700 mb-1">
                ✦ {planName} is now active
              </p>
              <p className="text-xs text-indigo-500">
                Usage limits have been removed
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Every Monday at 8am, Growl will deliver 3 new marketing actions for your business.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors"
            >
              Open Dashboard
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-4xl mb-4">😓</div>
            <p className="text-gray-600 mb-6">Something went wrong while confirming your plan.</p>
            <button
              onClick={() => router.push("/upgrade")}
              className="w-full bg-indigo-500 text-white font-semibold py-3 rounded-2xl"
            >
              Back to Plans
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
