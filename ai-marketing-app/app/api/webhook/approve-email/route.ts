import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/notify";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing ID", { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. チケットの取得
    const { data: ticket, error: fetchError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !ticket) {
      return new NextResponse("Ticket not found", { status: 404 });
    }

    if (ticket.status === "REPLIED" || ticket.status === "APPROVED") {
      return new NextResponse(
        "<html><body><h2>この問い合わせはすでに返信済みです。</h2></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // 2. ユーザーへ返信メールを送信
    const replySubject = ticket.subject.startsWith("Re:") ? ticket.subject : `Re: ${ticket.subject}`;
    const replyHtml = `
      <div style="font-family: sans-serif; white-space: pre-wrap; line-height: 1.6;">
        ${ticket.ai_draft}
      </div>
    `;

    const emailResult = await sendEmail(ticket.sender_email, replySubject, replyHtml);

    if (!emailResult.ok) {
      console.error("Failed to send reply email:", emailResult.err);
      return new NextResponse(
        `<html><body><h2>メール送信に失敗しました: ${emailResult.err}</h2></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // 3. ステータスを更新
    await supabase
      .from("support_tickets")
      .update({ status: "REPLIED", updated_at: new Date().toISOString() })
      .eq("id", id);

    // 4. 成功画面を表示
    return new NextResponse(
      `<html>
        <head><title>送信完了</title></head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; text-align: center;">
          <h2 style="color: #238636;">✅ 送信完了</h2>
          <p>ユーザー (${ticket.sender_email}) へ返信メールを送信しました。</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: left; margin-top: 20px; white-space: pre-wrap;">${ticket.ai_draft}</div>
          <p style="margin-top: 20px;"><a href="#" onclick="window.close()">このウィンドウを閉じる</a></p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Approval error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
