import { NextRequest, NextResponse } from "next/server";
import { updateUserPlan } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { deviceId, plan } = await req.json();

    if (!plan || !["standard", "pro"].includes(plan)) {
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    }

    if (deviceId) {
      await updateUserPlan(deviceId, plan as "standard" | "pro", null, null);
    }

    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    console.error("activate-plan error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
