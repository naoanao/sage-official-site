import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { callGemini } from "@/lib/gemini";
import { sendEmail } from "@/lib/notify";
import crypto from "crypto";

function verifyResendSignature(payloadText: string, headers: Headers, secret: string): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payloadText}`;
  const secretKey = secret.replace("whsec_", "");

  try {
    const expectedSignature = crypto
      .createHmac("sha256", Buffer.from(secretKey, "base64"))
      .update(signedContent)
      .digest("base64");

    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const idx = sig.indexOf("=");
      if (idx === -1) continue;
      const version = sig.substring(0, idx);
      const hash = sig.substring(idx + 1);
      if (version === "v1" && hash === expectedSignature) {
        return true;
      }
    }
  } catch (err) {
    console.error("Signature verification error:", err);
  }

  return false;
}


// Resend Inbound Webhook Payload (simplified)
interface ResendInboundEmail {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

const ADMIN_EMAIL = "naofumi0930@gmail.com";

const SYSTEM_PROMPT = `
あなたはサポート対応のプロフェッショナルAIです。
世界中（特に米国、インド、イギリス、日本など）のユーザーからの問い合わせメールを分析し、以下のJSON形式で分類と返信下書きを生成してください。

【分類ルール（category）】
- "FAQ": サービスの使い方、料金、ログイン方法など、既存の知識で一般的に回答できるもの。
- "HUMAN": 取材依頼、協業提案、決済の不具合、個別コンサル依頼など、人間が対応すべきもの。
- "SPAM": 営業メール、自動配信メール、システムエラー通知など、対応不要のもの。

【返信下書き（ai_draft）】
- FAQの場合のみ、丁寧なトーンで返信の下書きを作成してください。
- HUMAN/SPAMの場合は空文字 "" で構いません。
- 件名などは含めず、本文のみを作成してください。

【言語の指定（超重要）】
- **必ず、ユーザーが送信してきた言語と同じ言語で返信下書きを作成してください。**
- 例：英語の問い合わせには英語で、日本語には日本語で、スペイン語にはスペイン語で返信すること。

出力は必ず以下のJSONフォーマットのみとしてください。
{
  "category": "FAQ" | "HUMAN" | "SPAM",
  "ai_draft": "返信下書き（FAQの場合）"
}
`;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // 署名検証
    const signingSecret = process.env.RESEND_SIGNING_SECRET;
    if (signingSecret) {
      const isValid = verifyResendSignature(rawBody, req.headers, signingSecret);
      if (!isValid) {
        console.warn("Invalid Resend Webhook signature detected.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      console.log("Resend Webhook signature verified successfully.");
    } else {
      console.warn("RESEND_SIGNING_SECRET is not configured. Skipping webhook verification.");
    }

    const payload = JSON.parse(rawBody) as ResendInboundEmail;
    const { from, subject, text, html } = payload;
    const bodyText = text || html || "No content";

    // 1. AIで分類と下書き生成
    const userPrompt = `差出人: ${from}\n件名: ${subject}\n本文: ${bodyText}`;
    const aiResponseStr = await callGemini(SYSTEM_PROMPT, userPrompt);
    
    let category = "HUMAN";
    let aiDraft = "";
    try {
      const parsed = JSON.parse(aiResponseStr.replace(/```json/g, "").replace(/```/g, ""));
      category = parsed.category || "HUMAN";
      aiDraft = parsed.ai_draft || "";
    } catch (e) {
      console.error("Failed to parse AI response:", aiResponseStr);
    }

    if (category === "SPAM") {
      console.log("Ignored SPAM email from", from);
      return NextResponse.json({ success: true, ignored: true });
    }

    // 2. Supabase にチケットを保存
    const supabase = getServiceClient();
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        sender_email: from,
        subject: subject,
        body_text: bodyText,
        category: category,
        ai_draft: aiDraft,
        status: "PENDING"
      })
      .select()
      .single();

    if (error || !ticket) {
      console.error("Failed to insert ticket:", error);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }

    // 3. なおさん (ADMIN_EMAIL) へ承認/通知メールを送信
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    if (category === "FAQ") {
      const approveUrl = `${appUrl}/api/webhook/approve-email?id=${ticket.id}`;
      const emailHtml = `
        <h3>📩 新規問い合わせ (AIが返信案を作成しました)</h3>
        <p><strong>差出人:</strong> ${from}</p>
        <p><strong>件名:</strong> ${subject}</p>
        <hr />
        <p><strong>【問い合わせ内容】</strong></p>
        <pre style="white-space: pre-wrap; background: #f4f4f4; padding: 10px;">${bodyText}</pre>
        <hr />
        <p><strong>💡 【AI返信下書き案】</strong></p>
        <pre style="white-space: pre-wrap; background: #e6f7ff; padding: 10px;">${aiDraft}</pre>
        <hr />
        <p><strong>【アクション】</strong></p>
        <p><a href="${approveUrl}" style="background: #238636; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">✅ このまま送信する</a></p>
        <p><small>※修正が必要な場合は、ダッシュボードから手動で返信してください。</small></p>
      `;
      await sendEmail(ADMIN_EMAIL, `【承認待ち】${subject}`, emailHtml);
    } else {
      // HUMAN
      const emailHtml = `
        <h3>⚠️ 個別対応が必要な問い合わせ</h3>
        <p><strong>差出人:</strong> ${from}</p>
        <p><strong>件名:</strong> ${subject}</p>
        <hr />
        <p><strong>【問い合わせ内容】</strong></p>
        <pre style="white-space: pre-wrap; background: #f4f4f4; padding: 10px;">${bodyText}</pre>
        <hr />
        <p>個別対応（HUMAN）と判定されました。手動で返信をお願いします。</p>
      `;
      await sendEmail(ADMIN_EMAIL, `【要対応】${subject}`, emailHtml);
    }

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
