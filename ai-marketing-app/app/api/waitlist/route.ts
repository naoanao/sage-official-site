import { NextRequest, NextResponse } from "next/server";
import { saveWaitlistEmail } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, planName } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "メールアドレスが必要です" }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return NextResponse.json({ error: "正しいメールアドレスを入力してください" }, { status: 400 });
    }

    await saveWaitlistEmail(trimmed, planName ?? "unknown");
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Supabaseテーブルが未作成の場合も含め、エラーを返さずOKを返す
    // （UXを壊さないためのgraceful degradation）
    console.error("waitlist save error (non-fatal):", err);
    return NextResponse.json({ ok: true });
  }
}
