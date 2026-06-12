const PLAN_CACHE_KEY = "growl_plan";
const EMAIL_CACHE_KEY = "growl_subscriber_email";

export type Plan = "free" | "standard" | "pro";

export function getCachedPlan(): Plan {
  if (typeof window === "undefined") return "free";
  return (localStorage.getItem(PLAN_CACHE_KEY) as Plan) ?? "free";
}

export function setCachedPlan(plan: Plan) {
  if (typeof window !== "undefined") localStorage.setItem(PLAN_CACHE_KEY, plan);
}

export function getCachedEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EMAIL_CACHE_KEY);
}

export function setCachedEmail(email: string) {
  if (typeof window !== "undefined") localStorage.setItem(EMAIL_CACHE_KEY, email);
}

export function clearPlanCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAN_CACHE_KEY);
  localStorage.removeItem(EMAIL_CACHE_KEY);
}

export function isPaidPlan(plan?: Plan): boolean {
  const p = plan ?? getCachedPlan();
  return p === "standard" || p === "pro";
}

export async function verifySubscription(deviceId: string): Promise<{ active: boolean; plan: Plan; email?: string }> {
  try {
    const res = await fetch(`/api/verify-subscription?device_id=${encodeURIComponent(deviceId)}`);
    const data = await res.json();
    if (data.active && data.plan) {
      setCachedPlan(data.plan as Plan);
      if (data.email) setCachedEmail(data.email);
    }
    return data;
  } catch {
    const fallback = getCachedPlan();
    return { active: fallback !== "free", plan: fallback };
  }
}
