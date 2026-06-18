import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/notify";
import { generateApprovalToken } from "../../webhook/inbound-email/route";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const token = req.nextUrl.searchParams.get("token");

  if (!id || !token) {
    return renderHtmlPage("無効なリクエスト", "IDまたはトークンが見つかりません。", false);
  }

  // Validate the secure stateless token
  const expectedToken = generateApprovalToken(id);
  if (token !== expectedToken) {
    return renderHtmlPage("認証エラー", "この承認リンクは無効か、改ざんされています。", false);
  }

  try {
    const supabase = getServiceClient();

    // Fetch the support ticket
    const { data: ticket, error: fetchErr } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !ticket) {
      console.error("Error fetching ticket for approval:", fetchErr);
      return renderHtmlPage("エラー", "指定された問い合わせが見つかりません。", false);
    }

    // Prevent double sending
    if (ticket.status === "sent") {
      return renderHtmlPage(
        "送信済み",
        "この問い合わせに対する返信は、既に送信が完了しています。",
        true,
        ticket
      );
    }

    if (!ticket.ai_draft) {
      return renderHtmlPage("エラー", "返信用の下書き（本文）が空です。自動送信できません。", false);
    }

    // Send the draft to the customer
    const senderEmail = ticket.sender_email;
    const replySubject = `Re: ${ticket.subject || "お問い合わせの件"}`;
    
    // Simple HTML styling for reply
    const replyHtml = `
      <div style="font-family:sans-serif; line-height:1.6; color:#2d3748; max-width:600px; margin:0 auto; padding:20px;">
        <p style="white-space:pre-wrap;">${ticket.ai_draft}</p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:30px 0;">
        <div style="font-size:12px; color:#a0aec0;">
          <p>※本メールは Growl サポート窓口 (hello@growl-ai.com) よりお送りしています。</p>
        </div>
      </div>
    `;

    const sendRes = await sendEmail(senderEmail, replySubject, replyHtml);

    if (!sendRes.ok) {
      console.error("Failed to send email to customer:", sendRes.err);
      return renderHtmlPage(
        "送信失敗",
        `メールの送信中にエラーが発生しました: ${sendRes.err}`,
        false
      );
    }

    // Update status in Supabase
    const { error: updateErr } = await supabase
      .from("support_tickets")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) {
      console.error("Failed to update ticket status after send:", updateErr);
      // We still return success to user since email WAS sent
    }

    return renderHtmlPage(
      "送信完了",
      `お客さま (${senderEmail}) への自動返信メールが正常に送信されました！`,
      true,
      ticket
    );
  } catch (err) {
    console.error("Approval flow crash:", err);
    return renderHtmlPage("サーバーエラー", String(err), false);
  }
}

// Helper to render a beautiful HTML response page directly in browser
function renderHtmlPage(title: string, message: string, success: boolean, ticket?: any) {
  const statusColor = success ? "#48bb78" : "#f56565";
  const statusIcon = success ? "✓" : "✗";

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} | Growl AI</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Noto+Sans+JP:wght@300;400;700&display=swap');
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', 'Noto Sans JP', sans-serif;
          background: radial-gradient(circle at top, #1a202c 0%, #0d1117 100%);
          color: #e2e8f0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: rgba(26, 32, 44, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${statusColor}15;
          border: 2px solid ${statusColor};
          color: ${statusColor};
          font-size: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        h1 {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 16px;
          background: linear-gradient(135deg, #fff 30%, #a0aec0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p.message {
          font-size: 16px;
          color: #a0aec0;
          line-height: 1.6;
          margin: 0 0 30px;
        }
        .preview-box {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 20px;
          text-align: left;
          font-size: 14px;
          border-left: 3px solid ${statusColor};
          margin-bottom: 24px;
          max-height: 200px;
          overflow-y: auto;
        }
        .preview-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #cbd5e0;
        }
        .preview-body {
          color: #718096;
          white-space: pre-wrap;
        }
        .btn-close {
          background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%);
          color: white;
          border: none;
          padding: 12px 30px;
          font-size: 15px;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }
        .btn-close:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(49, 130, 206, 0.4);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon-wrapper">
          ${statusIcon}
        </div>
        <h1>${title}</h1>
        <p class="message">${message}</p>
        
        ${
          ticket && ticket.ai_draft
            ? `
          <div class="preview-box">
            <div class="preview-title">✉️ 返信内容プレビュー:</div>
            <div class="preview-body">${ticket.ai_draft}</div>
          </div>
        `
            : ""
        }
        
        <a href="https://growl-ai.com" class="btn-close">Growl トップへ戻る</a>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
