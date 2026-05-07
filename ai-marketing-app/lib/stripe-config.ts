// Stripe 設定 — Growl 有料プラン
// Payment Link に ?client_reference_id={deviceId} を付けてユーザー照合する

export const STRIPE_PLANS = {
  standard: {
    name: "スタンダード",
    price: "¥3,000/月",
    priceId: "price_1TUa58ILSrv644ukEL1idxgX",
    productId: "prod_UTX9hVKUtxyztQ",
    // 支払い後に /payment-success?plan=standard にリダイレクト
    paymentLinkBase: "https://buy.stripe.com/aFa14og2QgDP7hB2KO93y0d",
  },
  pro: {
    name: "プロ",
    price: "¥8,000/月",
    priceId: "price_1TUa5DILSrv644ukNtQyMOUn",
    productId: "prod_UTX9MQ5QxfiMIf",
    // 支払い後に /payment-success?plan=pro にリダイレクト
    paymentLinkBase: "https://buy.stripe.com/dRm4gAdUI73fdFZfxA93y0e",
  },
} as const;

export type PlanKey = "free" | "standard" | "pro";

/** deviceId を client_reference_id として埋め込んだ決済URLを生成 */
export function buildPaymentUrl(plan: "standard" | "pro", deviceId: string): string {
  const base = STRIPE_PLANS[plan].paymentLinkBase;
  return `${base}?client_reference_id=${encodeURIComponent(deviceId)}`;
}
