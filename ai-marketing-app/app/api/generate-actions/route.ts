import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyActions, UserProfile } from "@/lib/gemini";

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { industry, business_desc, customer_desc, main_problem, final_goal } = body;

    if (!industry || !business_desc || !customer_desc || !main_problem || !final_goal) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    const user: UserProfile = { industry, business_desc, customer_desc, main_problem, final_goal };
    const actions = await generateWeeklyActions(user);

    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      week_start: getMondayOfCurrentWeek(),
      actions: actions.map((a) => ({ ...a, completed: false })),
      user_profile: user,
    };

    // Supabase未接続の場合はsessionStorageに保存させる（クライアント側で受け取る）
    return NextResponse.json({ session, userId: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-actions error:", err);
    return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
  }
}
