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
    // USD $29/mo — ENGLISH product (created 2026-06-15, English checkout description)
    usdPaymentLinkBase: "https://buy.stripe.com/8x27sMg2Q3R30Td5X093y0n",
  },
  pro: {
    name: "プロ",
    price: "¥8,000/月",
    priceId: "price_1TUa5DILSrv644ukNtQyMOUn",
    productId: "prod_UTX9MQ5QxfiMIf",
    // 支払い後に /payment-success?plan=pro にリダイレクト
    paymentLinkBase: "https://buy.stripe.com/dRm4gAdUI73fdFZfxA93y0e",
    // USD $79/mo — ENGLISH product (created 2026-06-15, English checkout description)
    usdPaymentLinkBase: "https://buy.stripe.com/6oUdRa03SdrDeK3clo93y0o",
  },
  // AI広告代行（ベータ・管理のみ）¥2,980/月。支払い後はPAUSEDで広告用意（立替ゼロ）。
  agency: {
    name: "AI広告代行（管理のみ）",
    price: "¥2,980/月",
    priceId: "price_1Ti0GoILSrv644ukbbmEbJV8",
    productId: "prod_UhP40GfvdPcikT",
    paymentLinkBase: "https://buy.stripe.com/3cI5kEaIw73f9pJetw93y0j",
    // USD $19/mo — ENGLISH product (created 2026-06-15, English checkout description)
    usdPaymentLinkBase: "https://buy.stripe.com/3cI5kE17WgDP8lF2KO93y0p",
  },
  // フルおまかせ（管理＋広告費込み）¥9,800/月。支払い後に自動配信ON（広告費先払い済＝立替ゼロ）。
  agencyFull: {
    name: "フルおまかせ（広告費込み）",
    price: "¥9,800/月",
    priceId: "price_1Ti0cJILSrv644ukkgIkiTlI",
    productId: "prod_UhPRldjQNbs6al",
    paymentLinkBase: "https://buy.stripe.com/4gMbJ203SbjvatNfxA93y0k",
    // USD $79/mo — ENGLISH product (created 2026-06-15, English checkout description)
    usdPaymentLinkBase: "https://buy.stripe.com/8x2cN603SdrDfO771493y0q",
  },
} as const;

export type PlanKey = "free" | "standard" | "pro" | "agency" | "agencyFull";

/** 管理のみ代行(¥2,980 / $19)の決済URL（支払い後PAUSED）。currency="usd"でUSDリンク。 */
export function buildAgencyUrl(deviceId: string, currency: "jpy" | "usd" = "jpy"): string {
  const p = STRIPE_PLANS.agency;
  const base = currency === "usd" && p.usdPaymentLinkBase ? p.usdPaymentLinkBase : p.paymentLinkBase;
  return `${base}?client_reference_id=${encodeURIComponent(deviceId)}`;
}

/** フルおまかせ(¥9,800 / $79・広告費込み)の決済URL（支払い後に自動配信ON）。currency="usd"でUSDリンク。 */
export function buildAgencyFullUrl(deviceId: string, currency: "jpy" | "usd" = "jpy"): string {
  const p = STRIPE_PLANS.agencyFull;
  const base = currency === "usd" && p.usdPaymentLinkBase ? p.usdPaymentLinkBase : p.paymentLinkBase;
  return `${base}?client_reference_id=${encodeURIComponent(deviceId)}`;
}

/** deviceId を client_reference_id として埋め込んだ決済URLを生成。currency="usd"でUSDリンク使用（未設定なら円にフォールバック） */
export function buildPaymentUrl(plan: "standard" | "pro", deviceId: string, currency: "jpy" | "usd" = "jpy"): string {
  const p = STRIPE_PLANS[plan];
  const base = currency === "usd" && p.usdPaymentLinkBase ? p.usdPaymentLinkBase : p.paymentLinkBase;
  return `${base}?client_reference_id=${encodeURIComponent(deviceId)}`;
}
