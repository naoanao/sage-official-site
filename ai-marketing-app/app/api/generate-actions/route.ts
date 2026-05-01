// Edge runtimeはSupabase Node.jsクライアントと非互換のためNodejsに変更
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyActions, UserProfile } from "@/lib/gemini";
import { upsertUser, saveWeeklySession } from "@/lib/db";

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
    const { industry, business_desc, customer_desc, main_problem, final_goal, booking_url, device_id } = body;

    if (!industry || !business_desc || !customer_desc || !main_problem || !final_goal) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    const user: UserProfile = {
      industry, business_desc, customer_desc, main_problem, final_goal,
      booking_url: booking_url || undefined,
    };

    // AI生成
    const actions = await generateWeeklyActions(user);
    const weekStart = getMondayOfCurrentWeek();
    const actionsWithStatus = actions.map((a) => ({ ...a, completed: false }));

    // Supabaseに保存（device_idがある場合）
    let userId: string | null = null;
    let sessionId = crypto.randomUUID();

    if (device_id && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        userId = await upsertUser(device_id, user);
        sessionId = await saveWeeklySession(userId, weekStart, actionsWithStatus);
      } catch (dbErr) {
        // DB保存失敗してもAI生成結果は返す（ローカルフォールバック）
        console.error("DB save failed (non-fatal):", dbErr);
      }
    }

    const session = {
      id: sessionId,
      week_start: weekStart,
      actions: actionsWithStatus,
      user_profile: user,
    };

    return NextResponse.json({ session, userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-actions error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
