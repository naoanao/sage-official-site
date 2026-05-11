import { NextRequest, NextResponse } from "next/server";
import { sendLineMessage, buildWeeklyNotificationText } from "@/lib/line";
import { getAllUsersForCron, saveWeeklySession, getLatestMarketSignal, getPastLearningHistory } from "@/lib/db";
import { generateWeeklyActions, UserProfile } from "@/lib/gemini";

// Vercel Cron: 毎週月曜8時JST (日曜23:00 UTC)
export const maxDuration = 60;

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = getMondayOfCurrentWeek();
  const users = await getAllUsersForCron();
  const results = { total: users.length, sent: 0, errors: 0 };

  for (const user of users) {
    try {
      // SNSトレンドシグナルを取得（Sage連携）
      let market_signal: string | undefined;
      try {
        const signal = await getLatestMarketSignal(user.industry);
        if (signal) market_signal = signal;
      } catch { /* サイレントに無視 */ }

      // 過去の学習履歴を取得（週を重ねるごとにAIが賢くなる）
      let learning_history: Array<{ week: string; action: string; result: string }> = [];
      try {
        const hist = await getPastLearningHistory(user.id);
        if (hist.length > 0) learning_history = hist;
      } catch { /* サイレントに無視 */ }

      const profile: UserProfile = {
        industry: user.industry,
        business_desc: user.business_desc,
        customer_desc: user.customer_desc,
        main_problem: user.main_problem,
        final_goal: user.final_goal,
        booking_url: user.booking_url ?? undefined,
        learning_history,
        market_signal,
      };

      const { actions } = await generateWeeklyActions(profile);
      const actionsWithStatus = actions.map((a) => ({ ...a, completed: false }));

      await saveWeeklySession(user.id, weekStart, actionsWithStatus);

      if (user.line_user_id) {
        const text = buildWeeklyNotificationText(user.business_desc, actions);
        await sendLineMessage({
          to: user.line_user_id,
          messages: [{ type: "text", text }],
        });
        results.sent++;
      }
    } catch (err) {
      console.error(`Failed for user ${user.id}:`, err);
      results.errors++;
    }
  }

  console.log("Weekly cron completed:", results);
  return NextResponse.json({ status: "ok", results, weekStart });
}
