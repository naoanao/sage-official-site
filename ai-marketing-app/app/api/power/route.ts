import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  if (!rs.length) return `[${tag}] NO RESULTS`;
  return `[${tag}]\n` + rs.map((r, i) => `(${i + 1}) ${r.title}\n${(r.content || "").slice(0, 240)}\nURL: ${r.url}`).join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const shop = typeof body.shop === "string" ? body.shop.trim().slice(0, 60) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 40) : "";
  const lang = body.lang === "en" ? "en" : "ja";
  if (!shop) return NextResponse.json({ error: "shop_required" }, { status: 400 });
  const slug = (shop + (area ? "-" + area : "")).toLowerCase().replace(/[\s\u3000]+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 80) || "shop";

  const q = `"${shop}" ${area}`.trim();
  const [gourmet, sns, official, ec, generic] = await Promise.all([
    lang === "en"
      ? tavily(`${q} reviews rating`, ["yelp.com", "tripadvisor.com", "google.com", "opentable.com"])
      : tavily(`${q} 口コミ 評価`, ["tabelog.com", "hotpepper.jp", "retty.me", "gnavi.co.jp", "google.com"]),
    tavily(`${q}`, ["instagram.com", "x.com", "twitter.com", "tiktok.com", "facebook.com"]),
    lang === "en" ? tavily(`${q} official website`) : tavily(`${q} 公式サイト OR 公式ホームページ`),
    lang === "en"
      ? tavily(`${q} delivery OR order online OR reservation`, ["doordash.com", "ubereats.com", "grubhub.com", "opentable.com", "toasttab.com", "squareup.com"])
      : tavily(`${q} 通販 OR オンラインショップ OR 予約 OR デリバリー`, ["base.shop", "stores.jp", "shopify.com", "ubereats.com", "demae-can.com", "tabelog.com", "hotpepper.jp"]),
    lang === "en" ? tavily(`${q} restaurant OR shop OR store`) : tavily(`${q} 店`),
  ]);
  const all = [...gourmet, ...sns, ...official, ...ec, ...generic];
  const dedup: TavilyResult[] = [];
  const seen = new Set<string>();
  for (const r of all) {
    if (!seen.has(r.url)) { seen.add(r.url); dedup.push(r); }
  }

  const evidence = [
    block(lang === "en" ? "REVIEW SITES" : "グルメサイト・口コミ", gourmet),
    block("SNS (Instagram/X/TikTok/Facebook)", sns),
    block(lang === "en" ? "OFFICIAL WEBSITE" : "公式サイト", official),
    block(lang === "en" ? "DELIVERY/RESERVATION/ONLINE ORDER" : "EC・予約・デリバリー", ec),
    block(lang === "en" ? "OTHER" : "その他", generic),
  ].join("\n\n");

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const prompt = lang === "en"
    ? `You are a marketing diagnosis AI for local businesses. Using ONLY the channel-tagged web search results (real data) below, score the online customer-attraction power of "${shop}"${area ? ` (${area})` : ""}.

${evidence}

STRICT RULES:
- Never invent numbers, accounts or URLs. Every channel "note" MUST quote a concrete fact from the evidence (rating value, review count, or service name, e.g. "Yelp 4.2" / "on DoorDash") — or say "not found".
- Ignore results that are clearly a different business with a similar name.
- If almost nothing is found: found=false, score<=20, weakness="Almost no information about this business can be found online".
- 5 channels, each 0-20, total = score: rating, reviews, sns, web, ec.
- Derive each channel score independently from evidence quality: no evidence => status "none", score 0-6; weak/partial => "weak", 7-13; strong clear evidence => "good", 14-20. Different businesses must NOT end up with identical score patterns.
- Never mention services that do not operate in the business's region (no Tabelog outside Japan, etc.).
- rank: score>=85:A, >=65:B, >=45:C, >=25:D, else E.
- advice = ONE concrete improvement for the weakest channel doable today in 30 minutes.
- share_text = one honest line the owner would post (max 90 chars, no emoji, no ad-speak).
- For each channel, if a directly relevant URL appears in the evidence, copy it EXACTLY into "url" (otherwise null). Never construct or guess URLs.
- "quotes": up to 2 short real customer-review excerpts (max 120 chars each) copied verbatim from the evidence, "source" = site name (e.g. "Yelp", "TripAdvisor"). Empty array if none. Never fabricate quotes.
- Output ONLY this JSON (all text in English):
{"found":true,"score":0,"rank":"C","channels":[{"key":"rating","label":"Ratings (Google / review sites)","score":0,"status":"weak","note":"","url":null},{"key":"reviews","label":"Review volume & recency","score":0,"status":"weak","note":"","url":null},{"key":"sns","label":"Social media presence","score":0,"status":"none","note":"","url":null},{"key":"web","label":"Official website & info","score":0,"status":"none","note":"","url":null},{"key":"ec","label":"Online ordering / reservation","score":0,"status":"none","note":"","url":null}],"quotes":[{"text":"","source":""}],"good":"","weakness":"","advice":"","share_text":""}`
    : `あなたは日本のローカルビジネス専門のマーケティング診断AI。以下のチャネル別Web検索結果（実データ）だけを根拠に、店舗「${shop}」${area ? `（${area}）` : ""}のネット集客力をチャネル別に採点せよ。

${evidence}

厳守ルール:
- 数字・アカウント・URLの捏造は絶対禁止。各チャネルのnoteには検索結果にある具体的な事実（評価値・口コミ件数・サービス名。例:「食べログ3.65」「ホットペッパー予約可」）を必ず引用する。なければ「見つからず」と書く。
- 同名の別店舗と思われる結果は無視する。
- ほぼ見つからない場合: found=false、score20以下、weaknessは「ネット上でお店の情報がほとんど見つからない」。
- 5チャネル各0〜20点・合計100点: rating=評価の高さ, reviews=口コミの量と新しさ, sns=SNSの存在感, web=公式サイト・情報整備, ec=EC/予約/デリバリー対応。
- 点数は証拠の量と質からチャネルごとに独立に導く: 証拠なし=status"none"で0〜6点、弱い=weakで7〜13点、明確で良好=goodで14〜20点。店が違えば点数パターンも必ず変える。
- その地域に存在しないサービス名を出さない（海外店に食べログ等は禁止）。
- rank: score>=85:A, >=65:B, >=45:C, >=25:D, 未満:E。
- adviceは最弱チャネルを今日30分で改善する具体策1つ。
- share_textは店主が投稿したくなる正直な一言(60字以内、絵文字・宣伝なし)。
- 各チャネルの"url": 検索結果に直接該当するURLがあればそのまま正確にコピー（なければnull）。URLの創作・推測は禁止。
- "quotes": 検索結果の本文にある実際の口コミの一節を最大2つ（各80字以内・原文のまま）、"source"はサイト名（例:「食べログ」「Googleマップ」）。なければ空配列。捏造は絶対禁止。
- 出力は次のJSONのみ（すべて日本語）:
{"found":true,"score":0,"rank":"C","channels":[{"key":"rating","label":"評価（Google・グルメサイト）","score":0,"status":"weak","note":"","url":null},{"key":"reviews","label":"口コミの量と新しさ","score":0,"status":"weak","note":"","url":null},{"key":"sns","label":"SNS（Instagram・X・TikTok）","score":0,"status":"none","note":"","url":null},{"key":"web","label":"公式サイト・情報整備","score":0,"status":"none","note":"","url":null},{"key":"ec","label":"EC・予約・デリバリー","score":0,"status":"none","note":"","url":null}],"quotes":[{"text":"","source":""}],"good":"","weakness":"","advice":"","share_text":""}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
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
    const sources = dedup.slice(0, 8).map((r) => ({ title: r.title, url: r.url }));
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      await sb.from("power_diagnoses").insert({
        slug, shop, area, lang,
        score: parsed.score ?? null, rank: parsed.rank ?? null, found: parsed.found ?? null,
        channels: parsed.channels ?? null, good: parsed.good ?? null, weakness: parsed.weakness ?? null,
        advice: parsed.advice ?? null, share_text: parsed.share_text ?? null, sources,
        quotes: parsed.quotes ?? null,
      });
    } catch (e) {
      console.warn("[power] save failed", e);
    }
    return NextResponse.json({ ...parsed, shop, area, lang, slug, sources });
  } catch (e) {
    console.error("[power]", e);
    return NextResponse.json({ error: "diagnosis_failed" }, { status: 500 });
  }
}
