import { NextRequest, NextResponse } from "next/server";
import { updateUserPlan, savePurchaseEvent } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://growl-ai.com";

// 代行(agency)の支払いを受けたら、保存済みの申込からAIが自動で広告を構築・配信する。
// なおの代行口座(nao-agency)・自動ON(auto_activate)・予算は安全上限内。二重実行防止つき。
async function handleAgencyPayment(deviceId: string, email: string | null, amount: number) {
  const { data: row } = await supabase
    .from("app_config").select("value").eq("key", `agency_pending_${deviceId}`).single();
  let pending: Record<string, unknown> | null = null;
  if (row?.value) { try { pending = JSON.parse(row.value); } catch {} }

  // 売上記録（代行）
  try {
    await savePurchaseEvent({
      deviceId, email: email ?? (pending?.email as string) ?? null,
      stripeSessionId: null, plan: "agency", amountJpy: amount,
    });
  } catch {}

  if (pending && pending.status === "fulfilled") return; // 二重実行防止

  let result: Record<string, unknown> = {};
  if (pending && pending.ad_copy) {
    try {
      const res = await fetch(`${APP_URL}/api/meta-ads/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: "nao-agency",
          ad_copy: pending.ad_copy,
          link_url: (pending.business as { booking_url?: string } | null)?.booking_url || `${APP_URL}/start`,
          daily_budget: 1000, currency: "jpy", country: "JP", lang: "ja",
          // 立替ゼロ方針: 入金後はPAUSEDで広告を用意するだけ。配信ON(=広告費発生)は
          // クライアント広告費の手当て後に行う(なおが/admin/leadsで確認→1タップ、または将来の広告費先払いで自動化)。
          auto_activate: false,
        }),
      });
      result = await res.json();
    } catch (e) { result = { error: String(e) }; }
  }

  if (pending) {
    pending.status = "fulfilled";
    pending.paid_at = new Date().toISOString();
    pending.fulfillment = {
      campaign_id: result.campaign_id ?? null,
      status: result.status ?? null,
      note: result.activation_note ?? result.error ?? null,
    };
    await supabase.from("app_config").upsert({ key: `agency_pending_${deviceId}`, value: JSON.stringify(pending) });
  }
}

// Stripe署名検証 — Web Crypto API使用（npm不要、Sage実装と同じ方式）
async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = sigHeader.split(",");
    const tsPart = parts.find((p) => p.startsWith("t="));
    if (!tsPart) return false;
    const timestamp = tsPart.split("=")[1];
    const signatures = parts
      .filter((p) => p.startsWith("v1="))
      .map((p) => p.slice(3));

    const payload = `${timestamp}.${rawBody}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const computed = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatures.some(
      (s) => s.length === computed.length && s === computed
    );
  } catch {
    return false;
  }
}

function getPlanFromAmount(amount: number, currency: string = "jpy"): "standard" | "pro" {
  // JPY: unit=yen (8000 = ¥8,000) / USD: unit=cents (7900 = $79)
  if (currency.toLowerCase() === "usd") {
    return amount >= 7900 ? "pro" : "standard";
  }
  return amount >= 8000 ? "pro" : "standard";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  // 署名検証（secretが設定されている場合のみ）
  if (secret) {
    const valid = await verifyStripeSignature(rawBody, sigHeader, secret);
    if (!valid) {
      console.error("Stripe webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = event;
  const obj = data.object;

  try {
    if (type === "checkout.session.completed") {
      // client_reference_id = device_id（upgradeページで付与）
      const deviceId = obj.client_reference_id as string | null;
      const email = (obj as { customer_details?: { email?: string } })
        .customer_details?.email ?? null;
      const amountTotal = (obj.amount_total as number) ?? 0;
      const currency = ((obj.currency as string) ?? "jpy").toLowerCase();

      // 代行(agency, ¥2,980)の支払い → AIが自動で広告を構築・配信（SaaSプラン更新ではない）
      if (currency === "jpy" && amountTotal === 2980 && deviceId) {
        await handleAgencyPayment(deviceId, email, amountTotal);
        return NextResponse.json({ received: true, type, agency: true });
      }

      const plan = getPlanFromAmount(amountTotal, currency);

      if (deviceId) {
        await updateUserPlan(deviceId, plan, email);
        console.log(`✅ Growl plan upgraded: device=${deviceId} → ${plan}`);
      } else if (email) {
        // フォールバック: emailで照合
        await updateUserPlan(null, plan, email);
        console.log(`✅ Growl plan upgraded: email=${email} → ${plan}`);
      }

      // 売上イベントを記録（Sageの週次収益レポート用）
      await savePurchaseEvent({
        deviceId: deviceId ?? null,
        email: email ?? null,
        stripeSessionId: obj.id as string | null,
        plan,
        amountJpy: amountTotal,
      });
      console.log(`💰 Revenue recorded: ¥${amountTotal} (${plan})`);
    } else if (
      type === "customer.subscription.deleted" ||
      type === "customer.subscription.paused"
    ) {
      const customerId = obj.customer as string;
      await updateUserPlan(null, "free", null, customerId);
      console.log(`⚠️ Growl plan downgraded: customer=${customerId} → free`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Stripeへは200を返す（再送を防ぐ）
  }

  return NextResponse.json({ received: true, type });
}
