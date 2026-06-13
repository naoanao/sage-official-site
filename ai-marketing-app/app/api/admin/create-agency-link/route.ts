import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者用: 「AI広告代行（ベータ）」の Stripe 商品・価格・Payment Link を作成する。
// 既存のUSDリンクと同じく Stripe API で作成（STRIPE_SECRET_KEY 使用）。
// 結果のURLを app_config(key=agency_payment_link) に保存し、intake/LPから参照できるようにする。
// セキュリティ: ADMIN_SECRET 必須。再実行しても既存があればそれを返す（冪等）。
async function stripe(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "STRIPE_SECRET_KEY 未設定" }, { status: 500 });

  // 既に作成済みなら返す（冪等）
  const { data: existing } = await supabase.from("app_config").select("value").eq("key", "agency_payment_link").single();
  if (existing?.value) {
    try { const j = JSON.parse(existing.value); if (j.url) return NextResponse.json({ created: false, ...j }); } catch {}
  }

  const amount = Number(url.searchParams.get("amount") || 2980); // ベータ¥2,980/月
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://growl-ai.com";

  // 1) 商品
  const product = await stripe("products", { name: "Growl AI広告代行（ベータ）" });
  if (product.error) return NextResponse.json({ error: product.error.message, step: "product" }, { status: 400 });

  // 2) 価格（月額サブスク・JPY）
  const price = await stripe("prices", {
    product: product.id,
    unit_amount: String(amount),
    currency: "jpy",
    "recurring[interval]": "month",
  });
  if (price.error) return NextResponse.json({ error: price.error.message, step: "price" }, { status: 400 });

  // 3) Payment Link（支払い後 /payment-success?plan=agency へ）
  const link = await stripe("payment_links", {
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": "1",
    "after_completion[type]": "redirect",
    "after_completion[redirect][url]": `${appUrl}/payment-success?plan=agency`,
  });
  if (link.error) return NextResponse.json({ error: link.error.message, step: "payment_link" }, { status: 400 });

  const out = { url: link.url, price_id: price.id, product_id: product.id, amount };
  await supabase.from("app_config").upsert({ key: "agency_payment_link", value: JSON.stringify(out) });

  return NextResponse.json({ created: true, ...out });
}
