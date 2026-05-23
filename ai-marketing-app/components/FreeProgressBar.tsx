"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUserId } from "@/lib/store";

const MONTHLY_LIMIT = 5;
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
          <p className="text-sm font-bold text-amber-900">You&apos;ve used all 5 free analyses this month</p>
        </div>
        <p className="text-xs text-amber-700 mb-3">Feeling the value? Upgrade to get unlimited analyses and weekly actions delivered automatically.</p>
        <div className="w-full bg-amber-200 rounded-full h-1.5 mb-4">
          <div className="h-1.5 rounded-full bg-amber-400 w-full" />
        </div>
        <div className="bg-white rounded-xl border border-indigo-100 p-4">
          <p className="text-xs font-semibold text-indigo-700 mb-1">Auto-deliver every Monday</p>
          <p className="text-xs text-gray-500 mb-3">With Standard Plan, your weekly marketing actions are delivered every Monday at 8am. Unlimited. Zero effort.</p>
          <button
            onClick={() => router.push("/upgrade")}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
          >
            Upgrade to Standard Plan (¥3,000/mo) →
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
          {`${remaining} free ${remaining === 1 ? "analysis" : "analyses"} left this month`}
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
          Last free analysis this month.{" "}
          <button
            onClick={() => router.push("/upgrade")}
            className="underline font-medium"
          >
            Upgrade to Standard Plan →
          </button>
        </p>
      )}
    </div>
  );
}
