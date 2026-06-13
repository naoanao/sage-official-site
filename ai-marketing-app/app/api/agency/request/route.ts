import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 20;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 「AI代行（done-for-you）」の配信代行リクエストを受け付ける。
// AdBoostCardで生成した広告＋事業情報＋連絡先を保存し、なお/Sageが受注対応する。
// 新テーブル不要で確実に動くよう、既存 app_config(key,value) に JSON で保存する。
// （将来 agency_requests 専用テーブルに移行可。Sageの日次ジョブで拾える）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_id, email, note, ad_copy, session, budget, lang } = body || {};

    // 連絡先は最低限必要（受注対応のため）
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "有効なメールアドレスを入力してください。" }, { status: 400 });
    }

    const ts = new Date().toISOString();
    const record = {
      type: "agency_request",
      created_at: ts,
      device_id: device_id || null,
      email: String(email).slice(0, 200),
      note: note ? String(note).slice(0, 1000) : null,
      budget: budget ?? null,
      lang: lang || null,
      business: session
        ? {
            industry: session.industry ?? null,
            business_desc: session.business_desc ?? null,
            customer_desc: session.customer_desc ?? null,
            main_problem: session.main_problem ?? null,
            final_goal: session.final_goal ?? null,
            booking_url: session.booking_url ?? null,
          }
        : null,
      ad_copy: ad_copy
        ? {
            headline: ad_copy.headline ?? null,
            primary_text_full: ad_copy.primary_text_full ?? ad_copy.primary_text ?? null,
            description: ad_copy.description ?? null,
            cta: ad_copy.cta ?? null,
          }
        : null,
      status: "new",
    };

    const key = `agency_req_${Date.now()}`;
    const { error } = await supabase.from("app_config").insert({ key, value: JSON.stringify(record) });
    if (error) {
      // upsert fallback（キー衝突など）
      const { error: e2 } = await supabase.from("app_config").upsert({ key, value: JSON.stringify(record) });
      if (e2) return NextResponse.json({ success: false, error: String(e2.message || e2) }, { status: 500 });
    }

    // 支払い検知(webhook)が device_id で最新の申込を引き当てられるよう、別キーにも保存（上書き）
    if (record.device_id) {
      await supabase.from("app_config").upsert({
        key: `agency_pending_${record.device_id}`,
        value: JSON.stringify(record),
      });
    }

    return NextResponse.json({
      success: true,
      request_id: key,
      message: "配信代行のご依頼を受け付けました。担当が内容を確認し、ご連絡します。",
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
