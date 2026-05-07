// Stripe 設定 — Growl 有料プラン
// Payment Link に ?client_reference_id={deviceId} を付けてユーザー照合する

export const STRIPE_PLANS = {
  standard: {
    name: "スタンダード",
    price: "¥3,000/月",
    priceId: "price_1TUa58ILSrv644ukEL1idxgX",
    productId: "prod_UTX9hVKUtxyztQ",
    paymentLinkBase: "https://buy.stripe.com/dRm8wQ5ocfzL7hBfxA93y0a",
  },
  pro: {
    name: "プロ",
    price: "¥8,000/月",
    priceId: "price_1TUa5DILSrv644ukNtQyMOUn",
    productId: "prod_UTX9MQ5QxfiMIf",
    paymentLinkBase: "https://buy.stripe.com/8x29AUaIwbjv6dxbhk93y0b",
  },
} as const;

export type PlanKey = "free" | "standard" | "pro";

/** deviceId を client_reference_id として埋め込んだ決済URLを生成 */
export function buildPaymentUrl(plan: "standard" | "pro", deviceId: string): string {
  const base = STRIPE_PLANS[plan].paymentLinkBase;
  return `${base}?client_reference_id=${encodeURIComponent(deviceId)}`;
}
