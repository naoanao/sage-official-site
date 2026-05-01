export type Industry = "restaurant" | "salon" | "ec" | "professional" | "construction" | "other";

export const INDUSTRY_LABELS: Record<Industry, string> = {
  restaurant: "飲食店",
  salon: "美容サロン",
  ec: "EC・通販",
  professional: "士業・コンサル",
  construction: "工務店・建設",
  other: "その他",
};

export const INDUSTRY_ICONS: Record<Industry, string> = {
  restaurant: "🍽️",
  salon: "💇",
  ec: "🛒",
  professional: "📋",
  construction: "🏠",
  other: "✨",
};

export interface OnboardingData {
  industry: Industry | "";
  business_desc: string;
  customer_desc: string;
  main_problem: string;
  final_goal: string;
  booking_url?: string;
}

export interface Action {
  title: string;
  detail: string;
  content: string;
  content_type: string;
  completed: boolean;
}

export interface WeeklySession {
  id: string;
  user_id: string;
  week_start: string;
  actions: Action[];
  created_at: string;
}
