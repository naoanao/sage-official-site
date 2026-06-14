import { NextRequest, NextResponse } from "next/server";
import { getAllSubscribers, isTestEmail } from "@/lib/subscribers";
import { sendEmail } from "@/lib/notify";

export const maxDuration = 60;

// 管理者用: メールリストへ一斉配信（新機能・新商品のローンチ告知用）。
// 安全第一の設計:
//   - 既定は dry_run=true（実送信しない。対象件数とサンプルだけ返す）
//   - test_to を指定すると、そのアドレス1件だけに送って文面確認できる
//   - audience.lang / audience.source でセグメント可能
//   - テスト用ダミー(example.com 等)は既定で除外（include_test=true で含める）
//   - 実送信は dry_run=false を明示したときのみ
// セキュリティ: ADMIN_SECRET 必須。
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }

  const subject = typeof body.subject === "string" ? body.subject : "";
  const html = typeof body.html === "string" ? body.html
    : typeof body.message === "string" ? `<div style="font-family:sans-serif;line-height:1.6">${(body.message as string).replace(/\n/g, "<br>")}</div>`
    : "";
  if (!subject || !html) {
    return NextResponse.json({ error: "subject and html (or message) are required" }, { status: 400 });
  }

  const dryRun = body.dry_run !== false; // 既定 true（明示的に false のときだけ実送信）
  const includeTest = body.include_test === true;
  const testTo = typeof body.test_to === "string" ? body.test_to : null;
  const audience = (body.audience || {}) as { lang?: string; source?: string };

  // 1件だけテスト送信
  if (testTo) {
    const r = await sendEmail(testTo, subject, html);
    return NextResponse.json({ mode: "test_send", to: testTo, result: r });
  }

  // 配信対象を組み立て
  let list = await getAllSubscribers();
  if (!includeTest) list = list.filter((s) => !isTestEmail(s.email));
  if (audience.lang) list = list.filter((s) => s.lang === audience.lang);
  if (audience.source) list = list.filter((s) => s.sources.split("|").includes(audience.source!));

  if (dryRun) {
    return NextResponse.json({
      mode: "dry_run",
      would_send: list.length,
      sample: list.slice(0, 10).map((s) => s.email),
      note: "実送信するには dry_run:false を指定。まず test_to で文面確認を推奨。",
    });
  }

  // 実送信（小規模ベータ想定の素朴な逐次送信）
  let sent = 0, failed = 0;
  const errors: string[] = [];
  for (const s of list) {
    try {
      const r = await sendEmail(s.email, subject, html);
      if (r.ok) sent++; else { failed++; if (errors.length < 5) errors.push(`${s.email}: ${r.err || r.skipped || "fail"}`); }
    } catch (e) { failed++; if (errors.length < 5) errors.push(`${s.email}: ${String(e)}`); }
  }
  return NextResponse.json({ mode: "sent", total: list.length, sent, failed, errors });
}
