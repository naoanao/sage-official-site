import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 55;

type TavilyResult = { title: string; content: string; url: string };

async function tavily(query: string): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: 6, include_answer: false }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []) as TavilyResult[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const shop = typeof body.shop === "string" ? body.shop.trim().slice(0, 60) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 40) : "";
  if (!shop) return NextResponse.json({ error: "shop_required" }, { status: 400 });

  const q = `"${shop}" ${area}`.trim();
  const [r1, r2] = await Promise.all([
    tavily(`${q} 口コミ 評価 食べログ OR Googleマップ`),
    tavily(`${q} Instagram OR 公式サイト OR SNS`),
  ]);
  const results = [...r1, ...r2].slice(0, 10);
  const evidence = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${(r.content || "").slice(0, 300)}\nURL: ${r.url}`)
    .join("\n\n");

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const prompt = `あなたは日本のローカルビジネス専門のマーケティング診断AI。以下のWeb検索結果（実データ）だけを根拠に、店舗「${shop}」${area ? `（${area}）` : ""}のネット集客力を採点せよ。

検索結果:
${evidence || "(検索結果なし)"}

ルール:
- 検索結果に根拠がないことは書かない。数字の捏造は絶対禁止。
- 検索結果がほぼ無い・別の店ばかりの場合は found=false、scoreは20以下、weaknessは「ネット上でお店の情報がほとんど見つからない」とする。
- 4軸は各0〜25点: g=Google/食べログ等の評価の高さ, r=口コミの量と新しさ, s=SNS(Instagram等)の存在感, w=公式情報の見つけやすさ。score=4軸の合計。
- rank: score>=85はA, >=65はB, >=45はC, >=25はD, それ未満はE。
- good/weakness/adviceは検索結果の具体的な根拠に触れること。adviceは「今日30分でできること」1つ。
- share_textは店主本人が投稿したくなる正直な一言(60字以内、自虐か控えめな自慢、絵文字・宣伝文句なし)。
- 出力は次のJSONのみ: {"found":true,"score":0,"rank":"C","axes":{"g":0,"r":0,"s":0,"w":0},"good":"","weakness":"","advice":"","share_text":""}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 900,
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
      sources: results.slice(0, 5).map((r) => ({ title: r.title, url: r.url })),
    });
  } catch (e) {
    console.error("[power]", e);
    return NextResponse.json({ error: "diagnosis_failed" }, { status: 500 });
  }
}
