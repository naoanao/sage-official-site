import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/notify";
import { callGemini, callDeepSeek, callGroq } from "@/lib/gemini";
import crypto from "crypto";

// Helper to generate the stateless secure token for approvals
export function generateApprovalToken(ticketId: string): string {
  const secret = process.env.CRON_SECRET || "growl_cron_2026_fallback";
  return crypto.createHmac("sha256", secret).update(ticketId).digest("hex");
}

export async function POST(req: NextRequest) {
  // Simple authentication query param check
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("Inbound email received:", JSON.stringify(body));

    // Handle both direct format and nested "data" format from Resend Inbound Webhook
    const emailData = body.data || body;
    const from = emailData.from || "";
    const to = emailData.to || [];
    const subject = emailData.subject || "No Subject";
    const textBody = emailData.text || emailData.html || "";

    // Extract sender email from "Name <email@example.com>"
    let senderEmail = from;
    let senderName = "";
    const emailRegex = /<([^>]+)>/;
    const match = from.match(emailRegex);
    if (match) {
      senderEmail = match[1];
      senderName = from.replace(emailRegex, "").trim();
    }

    if (!senderEmail || !textBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // AI Classification & Draft Prompt
    const systemPrompt = `
You are a smart support assistant for Growl (an AI marketing app).
Your job is to analyze the customer's email and output a JSON response with:
1. "category": one of "FAQ", "HUMAN", "SPAM".
   - "FAQ": General questions about Growl, pricing, usage, how to run diagnostics, etc.
   - "HUMAN": Custom requests, partnership proposals, bugs/errors in payment, direct consulting requests, or requests to speak to a human.
   - "SPAM": Marketing, sales outreach, undeliverable bounce emails, etc.
2. "language": "ja" if the email is in Japanese, "en" if in English.
3. "summary": A brief one-sentence summary of the user's issue (in the language of the email).
4. "draft": A polite, helpful draft reply to the customer (in the language of the email).
   - If category is SPAM, draft can be empty.
   - If category is HUMAN, draft should say something like "お問い合わせいただきありがとうございます。内容を確認のうえ、担当者より折り返しご連絡いたします。" (for Japanese) or "Thank you for reaching out. We have received your inquiry and will follow up shortly." (for English).
   - If category is FAQ, try to answer the question using the following knowledge:
     - Growl is an AI Marketing Assistant that creates weekly action plans for small business owners.
     - Pricing: Free Plan (10 free diagnostics/month), Standard Plan (¥2,980/mo or $19/mo, auto-activate adboost, weekly notifications), Pro Plan (¥9,800/mo or $79/mo).
     - Customer support email is hello@growl-ai.com.
     - If they have payment issues, tell them we will check it manually.

Output ONLY valid JSON matching this structure:
{"category": "FAQ"|"HUMAN"|"SPAM", "language": "ja"|"en", "summary": "...", "draft": "..."}
`;

    const userPrompt = `
Subject: ${subject}
From: ${from}
Body:
${textBody}
`;

    let aiResultRaw = "";
    // Call LLMs with fallback
    const callers = [
      { name: "Gemini", fn: callGemini },
      { name: "DeepSeek", fn: callDeepSeek },
      { name: "Groq", fn: callGroq },
    ];

    for (const caller of callers) {
      try {
        aiResultRaw = await caller.fn(systemPrompt, userPrompt);
        if (aiResultRaw) break;
      } catch (err) {
        console.error(`Inbound email AI call to ${caller.name} failed:`, err);
      }
    }

    let category = "HUMAN";
    let lang = "ja";
    let summary = "問い合わせ";
    let draft = "";

    try {
      const cleaned = aiResultRaw.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        category = parsed.category || "HUMAN";
        lang = parsed.language || "ja";
        summary = parsed.summary || summary;
        draft = parsed.draft || "";
      }
    } catch (err) {
      console.error("Failed to parse support AI response:", err, aiResultRaw);
    }

    // Insert into Supabase using Service Role client
    const supabase = getServiceClient();
    const { data: ticket, error: dbErr } = await supabase
      .from("support_tickets")
      .insert({
        sender_email: senderEmail,
        sender_name: senderName || null,
        subject: subject,
        body_text: textBody,
        language: lang,
        category: category,
        status: category === "SPAM" ? "ignored" : "pending_approval",
        ai_summary: summary,
        ai_draft: draft,
      })
      .select()
      .single();

    if (dbErr) {
      console.error("Database error saving support ticket:", dbErr);
      throw new Error(`Database error: ${dbErr.message}`);
    }

    // If it's spam, skip notify
    if (category === "SPAM") {
      return NextResponse.json({ ok: true, status: "ignored" });
    }

    // Generate stateless token for approval link
    const token = generateApprovalToken(ticket.id);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app";
    const approveUrl = `${baseUrl}/api/support/approve?id=${ticket.id}&token=${token}`;
    const editUrl = `${baseUrl}/admin/support?id=${ticket.id}`;

    // Send notification to Nao's Gmail
    const naoEmail = "naofumi0930@gmail.com";
    const notifySubject = `【GrowlサポートAI】承認待ち: ${subject}`;
    const notifyHtml = `
      <div style="font-family:sans-serif; line-height:1.6; max-width:600px; margin:0 auto; padding:20px; border:1px solid #eaeaea; border-radius:5px;">
        <h2 style="color:#333; border-bottom:1px solid #eaeaea; padding-bottom:10px;">📩 新しい問い合わせがあります</h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          <tr>
            <td style="font-weight:bold; width:100px; padding:5px 0;">差出人:</td>
            <td>${senderName} &lt;${senderEmail}&gt;</td>
          </tr>
          <tr>
            <td style="font-weight:bold; padding:5px 0;">分類:</td>
            <td><span style="background:#eaeaea; padding:2px 8px; border-radius:3px; font-weight:bold;">${category}</span></td>
          </tr>
          <tr>
            <td style="font-weight:bold; padding:5px 0;">件名:</td>
            <td>${subject}</td>
          </tr>
        </table>
        
        <div style="background:#f9f9f9; padding:15px; border-radius:5px; border-left:4px solid #ccc; margin-bottom:20px;">
          <h4 style="margin-top:0;">📋 問い合わせ本文:</h4>
          <pre style="white-space:pre-wrap; font-family:inherit; margin:0;">${textBody}</pre>
        </div>

        <div style="background:#edf2f7; padding:15px; border-radius:5px; border-left:4px solid #3182ce; margin-bottom:25px;">
          <h4 style="margin-top:0; color:#2b6cb0;">💡 AI作成の返信案 (${lang === "ja" ? "日本語" : "英語"}):</h4>
          <p style="white-space:pre-wrap; margin:0;">${draft || "(返信案なし)"}</p>
        </div>

        <div style="text-align:center; margin-top:30px;">
          <a href="${approveUrl}" style="background-color:#48bb78; color:white; padding:12px 24px; text-decoration:none; font-weight:bold; border-radius:5px; margin-right:15px; display:inline-block;">🟢 このまま送信する</a>
          <a href="${editUrl}" style="background-color:#4a5568; color:white; padding:12px 24px; text-decoration:none; font-weight:bold; border-radius:5px; display:inline-block;">✏️ 管理画面で編集する</a>
        </div>
        
        <p style="font-size:12px; color:#777; margin-top:40px; text-align:center; border-top:1px solid #eaeaea; padding-top:10px;">
          このメールはGrowlサポートAIより自動送信されました。リンクの有効期限はありません。
        </p>
      </div>
    `;

    const emailRes = await sendEmail(naoEmail, notifySubject, notifyHtml);
    console.log("Notification email response:", emailRes);

    return NextResponse.json({ ok: true, ticket_id: ticket.id, notify: emailRes });
  } catch (err) {
    console.error("Error in inbound-email webhook:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
