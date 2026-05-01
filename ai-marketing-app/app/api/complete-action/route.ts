import { NextRequest, NextResponse } from "next/server";
import { markActionComplete } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, actionIndex, resultMemo } = await req.json();

    if (!sessionId || actionIndex === undefined || actionIndex === null) {
      return NextResponse.json({ error: "invalid params" }, { status: 400 });
    }

    if (typeof actionIndex !== "number" || actionIndex < 0 || actionIndex > 2) {
      return NextResponse.json({ error: "invalid actionIndex" }, { status: 400 });
    }

    await markActionComplete(sessionId, actionIndex, resultMemo ?? null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("complete-action error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
