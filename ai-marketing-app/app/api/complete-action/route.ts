import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, actionIndex } = await req.json();
    if (sessionId === undefined || actionIndex === undefined) {
      return NextResponse.json({ error: "invalid params" }, { status: 400 });
    }
    // Supabase未接続の間はクライアントローカルで管理
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
