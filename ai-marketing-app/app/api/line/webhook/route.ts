import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET ?? "";
  const hash = crypto.createHmac("SHA256", secret).update(body).digest("base64");
  return hash === signature;
}

function getDB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events ?? [];
  const db = getDB();

  for (const event of events) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    // フォロー時
    if (event.type === "follow") {
      console.log("New LINE follower:", lineUserId);
    }

    // メッセージ受信時 → 6桁コードならリンク処理
    if (event.type === "message" && event.message?.type === "text") {
      const text = event.message.text.trim();

      if (/^\d{6}$/.test(text)) {
        // 6桁コードが送られてきた → ユーザーにLINE User IDを紐付け
        const { data, error } = await db
          .from("users")
          .update({ line_user_id: lineUserId, line_link_code: null })
          .eq("line_link_code", text)
          .select("id, business_desc")
          .single();

        if (!error && data) {
          // 成功メッセージを返信
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [{
                type: "text",
                text: `✅ 登録完了！\n\n毎週月曜の朝8時に、今週やること3つをお届けします🎯\n\nあとは何もしなくて大丈夫です。Growlが自動で準備します！`,
              }],
            }),
          });
          console.log(`Linked LINE user ${lineUserId} to user ${data.id}`);
        } else {
          // コードが合わない場合
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [{
                type: "text",
                text: `コードが確認できませんでした。\nアプリの画面に表示されている6桁の数字を送ってください。`,
              }],
            }),
          });
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
