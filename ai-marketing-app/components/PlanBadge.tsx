"use client";

import type { Plan } from "@/lib/subscription";

interface PlanBadgeProps {
  plan: Plan | null;
}

const colors: Record<string, string> = {
  standard: "bg-indigo-100 text-indigo-700 border-indigo-200",
  pro: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function PlanBadge({ plan }: PlanBadgeProps) {
  if (!plan || plan === "free") return null;
  const cls = colors[plan] || colors.standard;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      ✦ {plan === "pro" ? "Pro" : "Standard"}
    </span>
  );
}
