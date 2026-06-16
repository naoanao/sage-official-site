"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUserId } from "@/lib/store";
import { useLang } from "@/lib/i18n";

const MONTHLY_LIMIT = 10; // 5→10: 価値を感じる前に課金ウォールに当たる問題を緩和（なおの指摘）
const STORAGE_KEY = "growl_monthly_usage";
const PLAN_CACHE_KEY = "growl_plan";

interface UsageData {
  month: string;
  count: number;
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

export function getUsageData(): UsageData {
  if (typeof window === "undefined") return { month: getCurrentMonth(), count: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: getCurrentMonth(), count: 0 };
    const data: UsageData = JSON.parse(raw);
    if (data.month !== getCurrentMonth()) return { month: getCurrentMonth(), count: 0 };
    return data;
  } catch {
    return { month: getCurrentMonth(), count: 0 };
  }
}

export function incrementUsage(): number {
  const data = getUsageData();
  const updated = { month: getCurrentMonth(), count: data.count + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated.count;
}

export function getCachedPlan(): "free" | "standard" | "pro" {
  if (typeof window === "undefined") return "free";
  return (localStorage.getItem(PLAN_CACHE_KEY) as "free" | "standard" | "pro") ?? "free";
}

export function setCachedPlan(plan: "free" | "standard" | "pro") {
  if (typeof window !== "undefined") localStorage.setItem(PLAN_CACHE_KEY, plan);
}

export function isPaidPlan(): boolean {
  const plan = getCachedPlan();
  return plan === "standard" || plan === "pro";
}

export function isLimitReached(): boolean {
  if (typeof window !== "undefined" && localStorage.getItem("growl_dev") === "true") return false;
  if (isPaidPlan()) return false;
  return getUsageData().count >= MONTHLY_LIMIT;
}

export function isDevMode(): boolean {
  return typeof window !== "undefined" && localStorage.getItem("growl_dev") === "true";
}

export default function FreeProgressBar() {
  const router = useRouter();
  const { lang } = useLang();
  const isEn = lang === "en";
  const [usage, setUsage] = useState<UsageData>({ month: getCurrentMonth(), count: 0 });
  const [plan, setPlan] = useState<"free" | "standard" | "pro">("free");

  useEffect(() => {
    setUsage(getUsageData());
    const cached = getCachedPlan();
    setPlan(cached);

    const deviceId = loadUserId();
    if (deviceId) {
      fetch(`/api/my-plan?deviceId=${encodeURIComponent(deviceId)}`)
        .then((r) => r.json())
        .then((data) => {
          const p = data.plan as "free" | "standard" | "pro";
          setCachedPlan(p);
          setPlan(p);
        })
        .catch(() => {});
    }
  }, []);

  if (plan === "standard" || plan === "pro") {
    return (
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 mb-5">
        <span className="text-indigo-500 text-sm">✦</span>
        <span className="text-sm font-semibold text-indigo-700">
          {plan === "pro" ? "Pro Plan" : "Standard Plan"}
        </span>
        <span className="text-xs text-indigo-400 ml-auto">Unlimited</span>
      </div>
    );
  }

  const remaining = Math.max(0, MONTHLY_LIMIT - usage.count);
  const pct = Math.min(100, (usage.count / MONTHLY_LIMIT) * 100);
  const isNearLimit = remaining <= 1;
  const isExhausted = remaining === 0;

  if (usage.count === 0) return null;

  if (isExhausted) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">✅</span>
          <p className="text-sm font-bold text-amber-900">{isEn ? "You&apos;ve used all 10 free analyses this month" : "今月の無料分析を10回すべて使い切りました"}</p>
        </div>
        <p className="text-xs text-amber-700 mb-3">{isEn ? "Feeling the value? Upgrade to get unlimited analyses and weekly actions delivered automatically." : "価値を感じていただけましたか？アップグレードすると分析・アクションが無制限に使えます。"}</p>
        <div className="w-full bg-amber-200 rounded-full h-1.5 mb-4">
          <div className="h-1.5 rounded-full bg-amber-400 w-full" />
        </div>
        <div className="bg-white rounded-xl border border-indigo-100 p-4">
          <p className="text-xs font-semibold text-indigo-700 mb-1">{isEn ? "Auto-deliver every Monday" : "毎週月曜に自動配信"}</p>
          <p className="text-xs text-gray-500 mb-3">{isEn ? "With Standard Plan, your weekly marketing actions are delivered every Monday at 8am. Unlimited. Zero effort." : "スタンダードプランなら、毎週月曜8時に今週の施策が自動配信されます。無制限。努力ゼロ。"}</p>
          <button
            onClick={() => router.push("/upgrade")}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
          >
            {isEn ? "Upgrade to Standard Plan ($29/mo) →" : "スタンダードプランにアップグレード（¥3,000/月）→"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border px-5 py-4 mb-5 ${
        isNearLimit ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <p className={`text-sm font-medium ${isNearLimit ? "text-amber-800" : "text-gray-600"}`}>
                    {isEn ? `${remaining} free ${remaining === 1 ? "analysis" : "analyses"} left this month` : `今月の残り無料回数: ${remaining}回`}
        </p>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isNearLimit ? "bg-amber-400" : "bg-indigo-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isNearLimit && (
        <p className="text-xs text-amber-600 mt-2">
          {isEn ? "Last free analysis this month." : "今月最後の無料分析です。"}{" "}
          <button
            onClick={() => router.push("/upgrade")}
            className="underline font-medium"
          >
            {isEn ? "Upgrade to Standard Plan →" : "スタンダードプランへ →"}
          </button>
        </p>
      )}
    </div>
  );
}
