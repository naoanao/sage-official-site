import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Row = {
  shop: string; area: string | null; lang: string; score: number | null; rank: string | null;
  found: boolean | null; channels: { key: string; label: string; score: number; status: string; note: string }[] | null;
  good: string | null; weakness: string | null; advice: string | null; created_at: string;
};

const rankColor: Record<string, string> = {
  A: "from-amber-400 to-yellow-500", B: "from-emerald-400 to-teal-500", C: "from-sky-400 to-blue-500",
  D: "from-orange-400 to-red-400", E: "from-violet-400 to-purple-500",
};
const STATUS_ICON: Record<string, string> = { good: "✅", weak: "⚠️", none: "❌" };

async function getRows(slug: string): Promise<Row[]> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await sb
      .from("power_diagnoses")
      .select("shop,area,lang,score,rank,found,channels,good,weakness,advice,created_at")
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data as Row[]) ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await getRows(decodeURIComponent(slug));
  if (!rows.length) return { title: "お店パワー診断 | Growl" };
  const r = rows[0];
  const isEn = r.lang === "en";
  return {
    title: isEn
      ? `${r.shop} — Online Power Score ${r.score}/100 (Rank ${r.rank}) | Growl`
      : `${r.shop}のネット集客力スコア ${r.score}/100（ランク${r.rank}）| お店パワー診断`,
    description: isEn
      ? `Real-data diagnosis of ${r.shop}: ratings, reviews, social media, website and online ordering scored across 5 channels.`
      : `${r.shop}の評価・口コミ・SNS・公式サイト・EC対応を実データで採点。スコア履歴も記録中。`,
  };
}

export default async function PowerSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const rows = await getRows(decoded);
  if (!rows.length) notFound();
  const r = rows[0];
  const isEn = r.lang === "en";
  const rank = r.rank && ["A", "B", "C", "D", "E"].includes(r.rank) ? r.rank : "C";
  const maxScore = Math.max(...rows.map((x) => x.score ?? 0), 1);
  return (
    <main className="min-h-screen bg-white px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-3">
            {isEn ? "Shop Power Check — public record" : "お店パワー診断・公開記録"}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{r.shop}</h1>
          {r.area && <p className="text-sm text-gray-400 mb-4">{r.area}</p>}
          <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${rankColor[rank]} text-white text-5xl font-extrabold shadow-lg mb-3`}>
            {rank}
          </div>
          <p className="text-sm text-gray-400">
            {isEn ? "Latest score" : "最新スコア"}: {r.score} / 100
            <span className="ml-2 text-gray-300">{new Date(r.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</span>
          </p>
        </div>

        {r.channels && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-6">
            {r.channels.map((c) => (
              <div key={c.key} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{STATUS_ICON[c.status] ?? "⚠️"} {c.label}</span>
                  <span>{c.score} / 20</span>
                </div>
                {c.note && <p className="text-xs text-gray-400">{c.note}</p>}
              </div>
            ))}
          </div>
        )}

        {(r.good || r.weakness || r.advice) && (
          <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-sm text-gray-800 flex flex-col gap-3">
            {r.good && <p>💪 {r.good}</p>}
            {r.weakness && <p>🔧 {r.weakness}</p>}
            {r.advice && <p>💡 {r.advice}</p>}
          </div>
        )}

        <h2 className="text-sm font-bold text-gray-800 mb-3">{isEn ? "Score history" : "スコア推移"}</h2>
        <div className="bg-gray-50 rounded-2xl p-5 mb-8">
          {rows.slice().reverse().map((x, i) => (
            <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
              <span className="text-xs text-gray-400 w-20 shrink-0">{new Date(x.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${((x.score ?? 0) / Math.max(maxScore, 100)) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-600 w-14 text-right">{x.score} ({x.rank})</span>
            </div>
          ))}
          {rows.length === 1 && (
            <p className="text-xs text-gray-400 mt-3">
              {isEn ? "Re-check later to see the trend grow." : "時間をおいて再診断すると、推移グラフが育っていきます。"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Link href={`/power?shop=${encodeURIComponent(r.shop)}&area=${encodeURIComponent(r.area ?? "")}`} className="w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl">
            {isEn ? "Re-check now with fresh data" : "最新データで再診断する"}
          </Link>
          <Link href="/power" className="w-full text-center text-sm text-gray-400 hover:text-indigo-500 py-2">
            {isEn ? "Check another shop (competitors welcome)" : "別のお店を診断する（ライバル店もどうぞ）"}
          </Link>
          <Link href="/onboarding/industry" className="w-full text-center text-xs text-gray-300 hover:text-indigo-400 py-1">
            {isEn ? "Get 3 weekly marketing actions for this shop — free (Growl)" : "この店のための週3アクションを無料で受け取る（Growl）"}
          </Link>
        </div>
      </div>
    </main>
  );
}
