// Edge runtimeはSupabase Node.jsクライアントと非互換のためNodejsに変更
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyActions, UserProfile } from "@/lib/gemini";
import { upsertUser, saveWeeklySession, getLatestMarketSignal, getPastLearningHistory } from "@/lib/db";

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

    // Step 1: ユーザーを先にupsert → userId取得（学習履歴に必要）
    let userId: string | null = null;
    if (device_id && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        userId = await upsertUser(device_id, {
          industry, business_desc, customer_desc, main_problem, final_goal,
          booking_url: booking_url || undefined,
        });
      } catch (dbErr) {
        console.error("upsertUser failed (non-fatal):", dbErr);
      }
    }

    // Step 2: 今週のSNSトレンドを取得（失敗してもメイン処理は継続）
    let market_signal: string | undefined;
    try {
      const signal = await getLatestMarketSignal(industry);
      if (signal) market_signal = signal;
    } catch {
      // シグナル取得失敗はサイレントに無視
    }

    // Step 3: 過去の学習履歴を取得（AIが週を重ねるごとに賢くなる）
    let learning_history: UserProfile["learning_history"] = undefined;
    if (userId) {
      try {
        const history = await getPastLearningHistory(userId);
        if (history.length > 0) learning_history = history;
      } catch {
        // 履歴取得失敗はサイレントに無視
      }
    }

    const user: UserProfile = {
      industry, business_desc, customer_desc, main_problem, final_goal,
      booking_url: booking_url || undefined,
      market_signal,
      learning_history,
    };

    // Step 4: AI生成
    const { actions, strategy_note } = await generateWeeklyActions(user);
    const weekStart = getMondayOfCurrentWeek();
    const actionsWithStatus = actions.map((a) => ({ ...a, completed: false }));

    // Step 5: セッションをSupabaseに保存
    let sessionId = crypto.randomUUID();
    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
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
      strategy_note,
      user_profile: user,
    };

    return NextResponse.json({ session, userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-actions error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
