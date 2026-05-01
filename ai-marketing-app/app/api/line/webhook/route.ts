import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  getUserByLineId,
  setFeedbackState,
  updateCompletionMemo,
  appendLearningHistory,
  getLatestSession,
  markActionComplete,
} from "@/lib/db";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET ?? "";
  const hash = crypto.createHmac("SHA256", secret).update(body).digest("base64");
  return hash === signature;
}

async function replyLine(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

const COMPLETION_KEYWORDS = [
  "完了", "やった", "できた", "投稿した", "送った", "返信した",
  "やりました", "できました", "しました", "完成", "投稿しました",
  "終わった", "終わりました", "ok", "OK", "オッケー", "おk",
  "やってみた", "やってみました", "done", "Done", "DONE",
];

const THANKS_MESSAGES = [
  "ありがとうございます！来週の提案に活かします📈",
  "参考になります！次回はさらに精度を上げた提案をします✨",
  "教えてくれてありがとう！蓄積して毎週賢くなっていきます🧠",
  "フィードバックありがとう！あなたのお店に合わせて学習中です📊",
];

function isCompletionMessage(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return COMPLETION_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()));
}

function randomThanks(): string {
  return THANKS_MESSAGES[Math.floor(Math.random() * THANKS_MESSAGES.length)];
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events ?? [];

  for (const event of events) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    if (event.type === "follow") {
      await replyLine(
        event.replyToken,
        "はじめまして！Growlです🌱\n\nあなたのお店のために、毎週月曜朝8時に「今週やること3つ」をお届けします。\n\nまずはアプリ側でプロフィールを設定してください！"
      );
      continue;
    }

    if (event.type === "message" && event.message?.type === "text") {
      const text = event.message.text.trim();

      // パターン1: 6桁コード → LINE連携処理
      if (/^\d{6}$/.test(text)) {
        const db = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await db
          .from("users")
          .update({ line_user_id: lineUserId, line_link_code: null })
          .eq("line_link_code", text)
          .select("id, business_desc")
          .single();

        if (!error && data) {
          await replyLine(
            event.replyToken,
            "✅ 登録完了！\n\n毎週月曜の朝8時に、今週やること3つをお届けします🎯\n\nアクションが届いたら「完了」と返信してください。Growlがあなたのお店に合わせて毎週賢くなっていきます！"
          );
          console.log(`Linked LINE user ${lineUserId} to user ${data.id}`);
        } else {
          await replyLine(
            event.replyToken,
            "コードが確認できませんでした。\nアプリの画面に表示されている6桁の数字を送ってください。"
          );
        }
        continue;
      }

      const user = await getUserByLineId(lineUserId);

      // パターン2: フィードバック待ち状態 → フィードバックを保存
      if (user?.feedback_state?.startsWith("waiting_feedback:")) {
        const withoutPrefix = user.feedback_state.slice("waiting_feedback:".length);
        const colonIdx1 = withoutPrefix.indexOf(":");
        const colonIdx2 = withoutPrefix.indexOf(":", colonIdx1 + 1);
        const sessionId = withoutPrefix.slice(0, colonIdx1);
        const actionIndex = parseInt(withoutPrefix.slice(colonIdx1 + 1, colonIdx2), 10);
        const actionTitle = withoutPrefix.slice(colonIdx2 + 1);

        await updateCompletionMemo(sessionId, actionIndex, text);

        const weekStr = new Date().toISOString().split("T")[0];
        await appendLearningHistory(user.id, {
          week: weekStr,
          action: actionTitle || `アクション${actionIndex + 1}`,
          result: text,
        });

        await setFeedbackState(lineUserId, null);
        await replyLine(event.replyToken, randomThanks());
        continue;
      }

      // パターン3: 完了キーワード → 直近セッションの未完了アクションを完了にする
      if (isCompletionMessage(text) && user) {
        const latestSession = await getLatestSession(user.id);

        if (latestSession) {
          const actions = latestSession.actions as Array<{ title: string; completed: boolean }>;
          const firstIncomplete = actions.findIndex((a) => !a.completed);

          if (firstIncomplete !== -1) {
            await markActionComplete(latestSession.id, firstIncomplete, null);

            const completedTitle = actions[firstIncomplete].title;
            const remaining = actions.filter((a, i) => !a.completed && i !== firstIncomplete).length;

            const feedbackKey = `waiting_feedback:${latestSession.id}:${firstIncomplete}:${completedTitle}`;
            await setFeedbackState(lineUserId, feedbackKey);

            const remainingMsg =
              remaining > 0
                ? `\n\n残り${remaining}つ、引き続きがんばりましょう💪`
                : "\n\n今週の3つ全部完了！素晴らしいです🎉\n次のアクションは来週月曜に届きます。";

            await replyLine(
              event.replyToken,
              `「${completedTitle}」完了ですね！✅${remainingMsg}\n\n📊 どんな反応でしたか？一言でもOKなので教えてください。来週の提案が格段に良くなります。`
            );
          } else {
            await replyLine(
              event.replyToken,
              "今週のアクションはすでに全部完了しています🎉\n次の提案は来週月曜の朝8時に届きます！"
            );
          }
        } else {
          await replyLine(
            event.replyToken,
            "今週の提案がまだ届いていないようです。\n毎週月曜朝8時に3つのアクションをお届けします！"
          );
        }
        continue;
      }

      // パターン4: その他のメッセージ
      if (user) {
        await replyLine(
          event.replyToken,
          "Growlです！\n\n今週のアクションを完了したら「完了」と送ってください📩\n\nGrowlはあなたの返信から学んで、毎週より良い提案をお届けします。"
        );
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
