"use client";

import { useState, useEffect } from "react";
import { loadUserId } from "@/lib/store";
import { getCachedPlan, verifySubscription, type Plan } from "@/lib/subscription";

export interface SubscriptionState {
  plan: Plan;
  isPaid: boolean;
  loading: boolean;
  email: string | null;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>(() => {
    const cached = getCachedPlan();
    return {
      plan: cached,
      isPaid: cached === "standard" || cached === "pro",
      loading: false,
      email: null,
    };
  });

  useEffect(() => {
    const deviceId = loadUserId();
    if (!deviceId) return;

    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));

    verifySubscription(deviceId).then(data => {
      if (cancelled) return;
      setState({
        plan: data.plan,
        isPaid: data.plan === "standard" || data.plan === "pro",
        loading: false,
        email: data.email ?? null,
      });
    });

    return () => { cancelled = true; };
  }, []);

  return state;
}
