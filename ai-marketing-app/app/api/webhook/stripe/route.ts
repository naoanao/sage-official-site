import { NextRequest, NextResponse } from "next/server";
import { updateUserPlan } from "@/lib/db";

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

function getPlanFromAmount(amountJpy: number): "standard" | "pro" {
  return amountJpy >= 8000 ? "pro" : "standard";
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
      const plan = getPlanFromAmount(amountTotal);

      if (deviceId) {
        await updateUserPlan(deviceId, plan, email);
        console.log(`✅ Growl plan upgraded: device=${deviceId} → ${plan}`);
      } else if (email) {
        // フォールバック: emailで照合
        await updateUserPlan(null, plan, email);
        console.log(`✅ Growl plan upgraded: email=${email} → ${plan}`);
      }
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
