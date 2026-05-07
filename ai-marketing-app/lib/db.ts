import { createClient } from "@supabase/supabase-js";
import { Action } from "./types";

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

export interface LearningEntry {
  week: string;
  action: string;
  result: string;
}

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

export async function markActionComplete(
  sessionId: string,
  actionIndex: number,
  resultMemo: string | null = null
) {
  const db = getServer();

  const { data: session } = await db
    .from("weekly_sessions")
    .select("actions, completed_count")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  const actions = session.actions as Action[];
  if (actions[actionIndex]) {
    actions[actionIndex].completed = true;
    const completedCount = actions.filter((a) => a.completed).length;
    await db
      .from("weekly_sessions")
      .update({ actions, completed_count: completedCount })
      .eq("id", sessionId);
  }

  await db.from("action_completions").insert({
    session_id: sessionId,
    action_index: actionIndex,
    completed_at: new Date().toISOString(),
    result_memo: resultMemo,
  });
}

export async function updateCompletionMemo(
  sessionId: string,
  actionIndex: number,
  resultMemo: string
) {
  const db = getServer();
  await db
    .from("action_completions")
    .update({ result_memo: resultMemo })
    .eq("session_id", sessionId)
    .eq("action_index", actionIndex)
    .is("result_memo", null);
}

export async function appendLearningHistory(userId: string, entry: LearningEntry) {
  const db = getServer();

  const { data: user } = await db
    .from("users")
    .select("learning_history")
    .eq("id", userId)
    .single();

  const history: LearningEntry[] = (user?.learning_history as LearningEntry[]) ?? [];
  const updated = [...history, entry].slice(-10);

  await db
    .from("users")
    .update({ learning_history: updated })
    .eq("id", userId);
}

export async function setFeedbackState(lineUserId: string, state: string | null) {
  const db = getServer();
  await db
    .from("users")
    .update({ feedback_state: state })
    .eq("line_user_id", lineUserId);
}

export async function getUserByLineId(lineUserId: string) {
  const db = getServer();
  const { data, error } = await db
    .from("users")
    .select("id, business_desc, feedback_state, learning_history, line_user_id")
    .eq("line_user_id", lineUserId)
    .single();

  if (error) return null;
  return data;
}

// ─────────────────────────────────────────────
// Learning History — 過去のアクション実績をAIに渡す
// ─────────────────────────────────────────────

export async function getPastLearningHistory(userId: string): Promise<LearningEntry[]> {
  const db = getServer();
  const { data, error } = await db
    .from("weekly_sessions")
    .select("week_start, actions")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(5);

  if (error || !data) return [];

  const entries: LearningEntry[] = [];
  for (const session of data) {
    const actions = (session.actions ?? []) as Array<Action & { result_memo?: string }>;
    for (const action of actions) {
      if (action.completed) {
        entries.push({
          week: session.week_start,
          action: action.title,
          result: action.result_memo ?? "完了",
        });
      }
    }
    if (entries.length >= 8) break;
  }
  return entries.slice(0, 8);
}

export async function saveActionResult(
  sessionId: string,
  actionIndex: number,
  resultMemo: string
): Promise<void> {
  const db = getServer();

  // action_completionsのresult_memoを更新
  await db
    .from("action_completions")
    .update({ result_memo: resultMemo })
    .eq("session_id", sessionId)
    .eq("action_index", actionIndex);

  // weekly_sessionsのactions JSONにも反映（次週の学習に使う）
  const { data: session } = await db
    .from("weekly_sessions")
    .select("actions, user_id, week_start")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  const actions = (session.actions ?? []) as Array<Action & { result_memo?: string }>;
  if (actions[actionIndex]) {
    actions[actionIndex].result_memo = resultMemo;
    await db.from("weekly_sessions").update({ actions }).eq("id", sessionId);
  }

  // learning_historyにも即時反映
  if (actions[actionIndex]) {
    await appendLearningHistory(session.user_id, {
      week: session.week_start,
      action: actions[actionIndex].title,
      result: resultMemo,
    });
  }
}

// ─────────────────────────────────────────────
// MarketSignal — Sage統合Phase1
// ─────────────────────────────────────────────

export async function saveMarketSignal(industry: string, rawSummary: string): Promise<void> {
  const db = getServer();
  const today = new Date().toISOString().split("T")[0];
  await db
    .from("market_signals")
    .upsert(
      {
        industry,
        signal_date: today,
        raw_summary: rawSummary,
        created_at: new Date().toISOString(),
      },
      { onConflict: "industry,signal_date" }
    );
}

export async function getLatestMarketSignal(industry: string): Promise<string | null> {
  const db = getServer();
  // 直近7日以内のシグナルを取得（古すぎるデータは使わない）
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data } = await db
    .from("market_signals")
    .select("raw_summary, signal_date")
    .eq("industry", industry)
    .gte("signal_date", cutoff)
    .order("signal_date", { ascending: false })
    .limit(1)
    .single();
  return data?.raw_summary ?? null;
}

// ─────────────────────────────────────────────
// Waitlist — 有料プラン先行登録
// ─────────────────────────────────────────────

export async function saveWaitlistEmail(email: string, planName: string): Promise<void> {
  const db = getServer();
  await db
    .from("waitlist_signups")
    .upsert(
      {
        email,
        plan_name: planName,
        signed_up_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
  // テーブルが存在しない場合はエラーを握り潰す（graceful degradation）
}

// ─────────────────────────────────────────────

export async function getAllUsersForCron() {
  const db = getServer();
  const { data, error } = await db
    .from("users")
    .select(
      "id, device_id, industry, business_desc, customer_desc, main_problem, final_goal, booking_url, line_user_id, learning_history"
    )
    .not("industry", "is", null);

  if (error) return [];
  return data ?? [];
}

export async function getWeeklySessionForUser(userId: string, weekStart: string) {
  const db = getServer();
  const { data, error } = await db
    .from("weekly_sessions")
    .select("id, actions, completed_count")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .single();

  if (error) return null;
  return data;
}
