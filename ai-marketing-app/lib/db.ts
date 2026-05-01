import { createClient } from "@supabase/supabase-js";
import { Action } from "./types";

// サーバーサイド用クライアント（service role key使用）
function getServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface UserProfile {
  industry: string;
  business_desc: string;
  customer_desc: string;
  main_problem: string;
  final_goal: string;
  booking_url?: string;
}

/** ユーザーをupsert（なければ作成、あれば更新） */
export async function upsertUser(deviceId: string, profile: UserProfile): Promise<string> {
  const db = getServer();
  const { data, error } = await db
    .from("users")
    .upsert(
      {
        device_id: deviceId,
        industry: profile.industry,
        business_desc: profile.business_desc,
        customer_desc: profile.customer_desc,
        main_problem: profile.main_problem,
        final_goal: profile.final_goal,
        booking_url: profile.booking_url ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`upsertUser failed: ${error.message}`);
  return data.id;
}

/** 週次セッションを保存 */
export async function saveWeeklySession(
  userId: string,
  weekStart: string,
  actions: Action[]
): Promise<string> {
  const db = getServer();
  const { data, error } = await db
    .from("weekly_sessions")
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        actions: actions,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`saveWeeklySession failed: ${error.message}`);
  return data.id;
}

/** 直近の週次セッションを取得 */
export async function getLatestSession(userId: string) {
  const db = getServer();
  const { data, error } = await db
    .from("weekly_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

/** アクション完了を記録 */
export async function markActionComplete(sessionId: string, actionIndex: number) {
  const db = getServer();

  // sessionsのactions JSONBを更新
  const { data: session } = await db
    .from("weekly_sessions")
    .select("actions")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  const actions = session.actions as Action[];
  if (actions[actionIndex]) {
    actions[actionIndex].completed = true;
    await db
      .from("weekly_sessions")
      .update({ actions })
      .eq("id", sessionId);
  }

  // 完了ログも記録
  await db.from("action_completions").insert({
    session_id: sessionId,
    action_index: actionIndex,
    completed_at: new Date().toISOString(),
  });
}

/** 全ユーザーを取得（週次Cron用） */
export async function getAllUsersForCron() {
  const db = getServer();
  const { data, error } = await db
    .from("users")
    .select("id, device_id, industry, business_desc, customer_desc, main_problem, final_goal, booking_url, line_user_id")
    .not("industry", "is", null);

  if (error) return [];
  return data ?? [];
}
