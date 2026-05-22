import { NextRequest, NextResponse } from "next/server";
import { sendLineMessage } from "@/lib/line";
import { getAllUsersForCron, getWeeklySessionForUser, setFeedbackState } from "@/lib/db";
import { Action } from "@/lib/types";

// Vercel Cron: 毎週土曜20時JST (11:00 UTC)
// vercel.json に追加: {"path": "/api/cron/feedback", "schedule": "0 11 * * 6"}

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
  const results = { total: users.length, sent: 0, skipped: 0, errors: 0 };

  for (const user of users) {
    try {
      // LINEに連携していないユーザーはスキップ
      if (!user.line_user_id) {
        results.skipped++;
        continue;
      }

      // 今週のセッションを取得
      const session = await getWeeklySessionForUser(user.id, weekStart);
      if (!session) {
        results.skipped++;
        continue;
      }

      const actions = session.actions as Action[];
      const completedActions = actions.filter((a) => a.completed);
      const incompleteActions = actions.filter((a) => !a.completed);

      // 全部未完了 → 優しくリマインド
      if (completedActions.length === 0) {
        await sendLineMessage({
          to: user.line_user_id,
          messages: [
            {
              type: "text",
              text: `Growlです🌱\n\n今週のアクション、まだ試せていないですか？\n\n一番簡単なものだけでもOKです👇\n「${actions[0]?.title ?? "今週のアクション"}」\n\n完了したら「完了」と送ってください！`,
            },
          ],
        });
        results.sent++;
        continue;
      }

      // 一部完了 → フィードバックをまだもらっていないアクションだけに送信
      // Webアプリ側でフィードバック済み（result_memoあり）のものはスキップ
      const firstCompletedIndex = actions.findIndex(
        (a) => a.completed && !(a as Action & { result_memo?: string }).result_memo
      );

      if (firstCompletedIndex === -1) {
        // 全完了アクションにフィードバック済み → 称賛メッセージだけ送ってスキップ
        const doneCount = completedActions.length;
        await sendLineMessage({
          to: user.line_user_id,
          messages: [
            {
              type: "text",
              text: `Growlです🎉\n\n今週は${doneCount}つ全てのアクションを実施＆フィードバックまでありがとうございます！\n\nその情報を活かして、来週さらに良い提案をします✨`,
            },
          ],
        });
        results.sent++;
        continue;
      }

      // フィードバック待ち状態にセット
      const completedTitle = actions[firstCompletedIndex]?.title ?? `アクション${firstCompletedIndex + 1}`;
      const feedbackKey = `waiting_feedback:${session.id}:${firstCompletedIndex}:${completedTitle}`;
      await setFeedbackState(user.line_user_id, feedbackKey);

      const doneCount = completedActions.length;
      const totalCount = actions.length;
      const notDoneCount = incompleteActions.length;

      let message = `Growlです📊\n\n今週は${totalCount}つ中${doneCount}つ完了！素晴らしいです✨\n\n`;

      if (notDoneCount > 0) {
        message += `残り${notDoneCount}つは来週以降もアレンジして提案します。\n\n`;
      }

      message += `📝 「${completedTitle}」の結果を教えてください。\n\nお客さんの反応はどうでしたか？一言でOKです。Growlが来週の提案に活かします！`;

      await sendLineMessage({
        to: user.line_user_id,
        messages: [{ type: "text", text: message }],
      });
      results.sent++;
    } catch (err) {
      console.error(`Feedback cron failed for user ${user.id}:`, err);
      results.errors++;
    }
  }

  console.log("Feedback cron completed:", results);
  return NextResponse.json({ status: "ok", results, weekStart });
}
