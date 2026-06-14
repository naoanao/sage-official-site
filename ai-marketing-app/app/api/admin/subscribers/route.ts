import { NextRequest, NextResponse } from "next/server";
import { getAllSubscribers } from "@/lib/subscribers";

export const maxDuration = 30;

// 管理者用: 将来のローンチ告知に使える「全メールリスト」を集約して返す。
// 集約ロジックは lib/subscribers の getAllSubscribers に一本化。
// ?format=csv でCSVダウンロード。セキュリティ: ADMIN_SECRET 必須。
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await getAllSubscribers();

  if (url.searchParams.get("format") === "csv") {
    const header = "email,lang,sources,first_seen";
    const rows = list.map((e) => `${e.email},${e.lang},${e.sources},${e.first_seen}`);
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="growl-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const bySource: Record<string, number> = {};
  for (const e of list) for (const s of e.sources.split("|")) bySource[s] = (bySource[s] || 0) + 1;

  return NextResponse.json({ count: list.length, by_source: bySource, subscribers: list });
}
