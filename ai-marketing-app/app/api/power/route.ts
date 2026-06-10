import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 55;

type TavilyResult = { title: string; content: string; url: string };

async function tavily(query: string, includeDomains?: string[]): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "basic",
        max_results: 5,
        include_domains: includeDomains,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []) as TavilyResult[];
  } catch {
    return [];
  }
}

function block(tag: string, rs: TavilyResult[]): string {
  if (!rs.length) return `【${tag}】検索結果なし`;
  return `【${tag}】\n` + rs.map((r, i) => `(${i + 1}) ${r.title}\n${(r.content || "").slice(0, 240)}\nURL: ${r.url}`).join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const shop = typeof body.shop === "string" ? body.shop.trim().slice(0, 60) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 40) : "";
  if (!shop) return NextResponse.json({ error: "shop_required" }, { status: 400 });

  const q = `"${shop}" ${area}`.trim();
  const [gourmet, sns, official, ec, generic] = await Promise.all([
    tavily(`${q} 口コミ 評価`, ["tabelog.com", "hotpepper.jp", "retty.me", "gnavi.co.jp", "google.com"]),
    tavily(`${q}`, ["instagram.com", "x.com", "twitter.com", "tiktok.com", "facebook.com"]),
    tavily(`${q} 公式サイト OR 公式ホームページ`),
    tavily(`${q} 通販 OR オンラインショップ OR 予約 OR デリバリー`, ["base.shop", "stores.jp", "shopify.com", "ubereats.com", "demae-can.com", "tabelog.com", "hotpepper.jp"]),
    tavily(`${q} 店`),
  ]);
  const all = [...gourmet, ...sns, ...official, ...ec, ...generic];
  const dedup: TavilyResult[] = [];
  const seen = new Set<string>();
  for (const r of all) {
    if (!seen.has(r.url)) { seen.add(r.url); dedup.push(r); }
  }

  const evidence = [
    block("グルメサイト・口コミ", gourmet),
    block("SNS(Instagram/X/TikTok/Facebook)", sns),
    block("公式サイト", official),
    block("EC・予約・デリバリー", ec),
    block("その他", generic),
  ].join("\n\n");

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const prompt = `あなたは日本のローカルビジネス専門のマーケティング診断AI。以下のチャネル別Web検索結果（実データ）だけを根拠に、店舗「${shop}」${area ? `（${area}）` : ""}のネット集客力をチャネル別に採点せよ。

${evidence}

ルール:
- 検索結果に根拠がないことは書かない。数字・アカウント・URLの捏造は絶対禁止。
- 同名の別店舗と思われる結果は無視する。
- 検索結果がほぼ無い場合は found=false、score20以下、weaknessは「ネット上でお店の情報がほとんど見つからない」。
- 5チャネル各0〜20点・合計100点: rating=評価の高さ(Google/グルメサイト), reviews=口コミの量と新しさ, sns=SNSの存在感(アカウント有無・活動), web=公式サイト・情報の整備, ec=EC/予約/デリバリー対応。
- 各チャネルのstatus: 根拠があり良好="good"、存在するが弱い="weak"、見つからない="none"。noteは根拠に基づく短評(40字以内)。見つかったSNSやECは名前を出す(例:「Instagramあり・食べログ予約可」)。
- rank: score>=85:A, >=65:B, >=45:C, >=25:D, 未満:E。
- adviceは検出された弱点チャネルを今日30分で改善する具体策1つ。
- share_textは店主が投稿したくなる正直な一言(60字以内、絵文字・宣伝なし)。
- 出力は次のJSONのみ:
{"found":true,"score":0,"rank":"C","channels":[{"key":"rating","label":"評価（Google・グルメサイト）","score":0,"status":"weak","note":""},{"key":"reviews","label":"口コミの量と新しさ","score":0,"status":"weak","note":""},{"key":"sns","label":"SNS（Instagram・X・TikTok）","score":0,"status":"none","note":""},{"key":"web","label":"公式サイト・情報整備","score":0,"status":"none","note":""},{"key":"ec","label":"EC・予約・デリバリー","score":0,"status":"none","note":""}],"good":"","weakness":"","advice":"","share_text":""}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) throw new Error("groq " + res.status);
    const data = await res.json();
    let text: string = data.choices?.[0]?.message?.content ?? "{}";
    text = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    return NextResponse.json({
      ...parsed,
      shop,
      area,
      sources: dedup.slice(0, 8).map((r) => ({ title: r.title, url: r.url })),
    });
  } catch (e) {
    console.error("[power]", e);
    return NextResponse.json({ error: "diagnosis_failed" }, { status: 500 });
  }
}
