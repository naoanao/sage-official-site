import { NextRequest, NextResponse } from "next/server";
import { getUserPlan } from "@/lib/db";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ plan: "free" });
  }
  try {
    const plan = await getUserPlan(deviceId);
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ plan: "free" });
  }
}
