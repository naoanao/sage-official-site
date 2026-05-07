export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────
// 業種別投稿パターン
// ────────────────────────────────────────────
const INDUSTRY_POST_HINTS: Record<string, string> = {
  restaurant:
    "1本目：Instagram投稿文（本日の料理・季節メニュー訴求、ハッシュタグ付き）、2本目：LINE配信文（限定特典・来店促進）、3本目：Googleレビュー返信文（感謝と再来店誘導、URLなし・宣伝なし）",
  salon:
    "1本目：Instagram投稿文（技術・ビフォーアフター・季節メニュー訴求、ハッシュタグ付き）、2本目：LINE配信文（空き告知・予約促進）、3本目：Instagram投稿文（お客様の声・こだわりポイント、ハッシュタグ付き）",
  ec: "1本目：Instagram投稿文（商品紹介・使用シーン訴求、ハッシュタグ付き）、2本目：Instagram投稿文（プレゼント訴求・ギフト需要、ハッシュタグ付き）、3本目：LINE配信文（新着・セール・限定告知）",
  professional:
    "1本目：ブログ記事冒頭（専門知識をわかりやすく解説する導入文）、2本目：メール文（見込み客向け問い合わせ誘導）、3本目：ブログ記事冒頭（よくある疑問に答えるFAQ形式の導入文）",
  construction:
    "1本目：チラシ文（地域密着・施工実績・信頼訴求）、2本目：LINE配信文（季節メンテナンス提案・点検促進）、3本目：Googleレビュー返信文（感謝・地域への貢献・信頼構築、URLなし・宣伝なし）",
  other:
    "1本目：Instagram投稿文（サービス・商品の魅力訴求、ハッシュタグ付き）、2本目：LINE配信文（告知・限定特典）、3本目：告知文（イベント・新サービスのお知らせ）",
};

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: "飲食店",
  salon: "美容サロン",
  ec: "EC・通販",
  professional: "士業・コンサル",
  construction: "工務店・建設",
  other: "その他",
};

async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function callGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { framework, insight, name, product, target, industry, price } = body;

    if (!name || !product || !target || !framework || !insight) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    const postHint =
      INDUSTRY_POST_HINTS[industry] ?? INDUSTRY_POST_HINTS["other"];
    const industryLabel = INDUSTRY_LABELS[industry] ?? "ビジネス";
    const priceNote = price
      ? `価格帯・客単価: ${price}（価格帯に見合った訴求・言葉遣いにすること）`
      : "";

    const prompt = `あなたは日本の小規模事業主専門のSNSコピーライターです。

【最重要ルール】
あなたが書くのは「${name}（事業者）がSNS・LINE・ブログに投稿・配信する文章」です。
投稿の主語は事業者（${name}）です。ターゲット顧客の悩みや疑問を代弁する文章ではありません。
事業者が「自分のサービスの魅力・価値・お得な情報」を顧客に向けて発信する文章を書いてください。

【事業者情報】
事業者名: ${name}
提供サービス: ${product}
ターゲット顧客: ${target}
業種: ${industryLabel}
${priceNote}

【分析から得たインサイト（この事業者の強み・差別化ポイント）】
${insight}

【生成ルール】
- Markdown記号（**、##、___、\`など）は一切使わない
- 各投稿は実際にそのままコピーして投稿できる完成した文章
- 3本それぞれ異なる切り口（例：強み訴求・お客様の声風・お得情報・限定告知など）で作る
- 架空のURL（example.comなど）は絶対に使わない
- インサイトで発見した「この事業者ならではの強み・差別化」を核心に使う
- 読んだターゲット顧客が「行ってみたい」「頼んでみたい」「詳しく知りたい」と感じる内容にする
- ${postHint}

返答はJSONのみ（コードブロック・説明文不要）:
{"posts":[
  {"platform":"（プラットフォーム名）","content":"（投稿本文全文）","hook":"この投稿の狙いを10文字以内で"},
  {"platform":"（プラットフォーム名）","content":"（投稿本文全文）","hook":"この投稿の狙いを10文字以内で"},
  {"platform":"（プラットフォーム名）","content":"（投稿本文全文）","hook":"この投稿の狙いを10文字以内で"}
]}`;

    let raw = await callGemini(prompt);
    if (!raw) raw = await callGroq(prompt);
    if (!raw) {
      return NextResponse.json(
        { error: "AI生成に失敗しました。時間をおいて再試行してください。" },
        { status: 500 }
      );
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: "レスポンスの解析に失敗しました" },
        { status: 500 }
      );
    }

    const result = JSON.parse(match[0]);
    return NextResponse.json({ posts: result.posts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
