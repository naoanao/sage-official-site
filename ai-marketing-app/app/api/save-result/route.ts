import { NextRequest, NextResponse } from "next/server";
import { saveActionResult } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, actionIndex, resultMemo } = await req.json();

    if (!sessionId || actionIndex === undefined || !resultMemo) {
      return NextResponse.json({ error: "invalid params" }, { status: 400 });
    }

    if (typeof actionIndex !== "number" || actionIndex < 0 || actionIndex > 2) {
      return NextResponse.json({ error: "invalid actionIndex" }, { status: 400 });
    }

    await saveActionResult(sessionId, actionIndex, resultMemo);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("save-result error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
