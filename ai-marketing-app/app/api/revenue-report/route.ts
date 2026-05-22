/**
 * /api/revenue-report
 * Sage が週次収益を知るためのエンドポイント
 * Sage PC の market_scan_notifier.py または growl_bridge.py から定期的に叩く
 *
 * 認証: Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest, NextResponse } from "next/server";
import { getWeeklyRevenueSummary } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getWeeklyRevenueSummary();

  // Sage に渡しやすい形式でフォーマット
  const message =
    summary.count === 0
      ? "今週のGrowl売上: ¥0（新規課金なし）"
      : `今週のGrowl売上: ¥${summary.total_jpy.toLocaleString()} ` +
        `(${summary.count}件 — スタンダード${summary.by_plan.standard}件 / プロ${summary.by_plan.pro}件)`;

  return NextResponse.json({
    status: "ok",
    message,
    ...summary,
  });
}
