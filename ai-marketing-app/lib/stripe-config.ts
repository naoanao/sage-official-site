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
    // 英語圏向けUSD建てリンク（$29/月・price_1TgeYJILSrv644ukpHIKhr7m・2026-06-10 API作成）
    usdPaymentLinkBase: "https://buy.stripe.com/3cIcN69Es5Zb1Xh2KO93y0h",
  },
  pro: {
    name: "プロ",
    price: "¥8,000/月",
    priceId: "price_1TUa5DILSrv644ukNtQyMOUn",
    productId: "prod_UTX9MQ5QxfiMIf",
    // 支払い後に /payment-success?plan=pro にリダイレクト
    paymentLinkBase: "https://buy.stripe.com/dRm4gAdUI73fdFZfxA93y0e",
    // 英語圏向けUSD建てリンク（$79/月・price_1TgeYKILSrv644ukrtx1KnFv・2026-06-10 API作成）
    usdPaymentLinkBase: "https://buy.stripe.com/14A9AU8Ao87jatNgBE93y0i",
  