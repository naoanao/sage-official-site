"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MONTHLY_LIMIT = 3;
const STORAGE_KEY = "growl_monthly_usage";

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
    if (data.month !== getCurrentMonth()) {
      return { month: getCurrentMonth(), count: 0 };
    }
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

export function isLimitReached(): boolean {
  return getUsageData().count >= MONTHLY_LIMIT;
}

export default function FreeProgressBar() {
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData>({ month: getCurrentMonth(), count: 0 });

  useEffect(() => {
    setUsage(getUsageData());
  }, []);

  const remaining = Math.max(0, MONTHLY_LIMIT - usage.count);
  const pct = Math.min(100, (usage.count / MONTHLY_LIMIT) * 100);
  const isNearLimit = remaining <= 1;

  if (usage.count === 0) return null;

  return (
    <div
      className={`rounded-2xl border px-5 py-4 mb-5 ${
        isNearLimit
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <p className={`text-sm font-medium ${isNearLimit ? "text-amber-800" : "text-gray-600"}`}>
          {remaining > 0
            ? `今月あと ${remaining} 回 生成できます`
            : "今月の無料枠が終わりました"}
        </p>
        {remaining === 0 && (
          <button
            onClick={() => router.push("/upgrade")}
            className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
          >
            続けるには →
          </button>
        )}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isNearLimit ? "bg-amber-400" : "bg-indigo-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isNearLimit && remaining > 0 && (
        <p className="text-xs text-amber-600 mt-2">
          あと1回です。{" "}
          <button
            onClick={() => router.push("/upgrade")}
            className="underline font-medium"
          >
            制限なしにする →
          </button>
        </p>
      )}
    </div>
  );
}
