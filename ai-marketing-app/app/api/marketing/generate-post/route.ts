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

    const prompt = `あなたはDavid Ogilvy・Eugene Schwartz・Gary Halbert・Claude Hopkins・神田昌典の思想を血肉とした、日本の個人・零細事業主専門の世界トップクラスのコピーライターです。

━━ あなたの仕事の本質 ━━

【真実の中に最強のコピーが眠っている ― Ogilvy / Hopkins】
あなたの仕事は「創作」ではなく「発掘」だ。
入力された商品・サービス・インサイトの中に、すでに顧客の心を動かす「事実」が眠っている。
それを掘り起こし、顧客が自分事として読める言葉に変換することがあなたの使命だ。

【最初の3行がすべてを決める ― Halbert】
誰も「広告を読もう」と思ってスクロールしていない。
最初の3行でスクロールが止まらなければ、残りは存在しないのと同じだ。
冒頭に顧客の「今この瞬間の悩み・欲求・問い」を直撃する言葉を置け。

【具体的な数字・事実が信頼を作る ― Hopkins】
「美味しい」「高品質」「おすすめ」は誰でも言える言葉だ。
入力情報の中の具体的な事実（成分・製法・年数・産地・人数・実績）を使え。
「言葉」で説得するな。「証拠」で納得させろ。

【架空の情報は絶対に使わない（プロとして恥ずべき行為）】
「在庫わずか！」「限定品！」「○○%OFF」「期間限定△△円」――入力情報にない緊急性・希少性・価格情報を一切作り出すな。
偽りの緊急性を一度見抜かれたブランドへの信頼は永遠に回復しない。
入力情報の範囲内でのみ、言葉のトーン・切り口・順序を工夫すること。

━━ 今回の仕事 ━━

【事業者情報】
事業者名: ${name}
提供サービス: ${product}
ターゲット顧客: ${target}
業種: ${industryLabel}
${priceNote}

【分析から得たインサイト（この事業者にしかない強み・差別化の核心）】
${insight}

━━ 3本の投稿を書く前に、必ずこの思考を踏む ━━

STEP 1 — 「競合が絶対に言えないこと」を1つ特定せよ
この業種の競合が典型的に言うこと（一般的なベネフィット・機能説明）を想定し、
インサイトの中から「競合が同じ言葉を使えない」独自の事実・角度を1つ特定する。
→ 3本すべての核心に、この角度を使う。

STEP 2 — ターゲットが「今この瞬間」抱えている1つの悩みを特定せよ
${target}が今夜布団の中で何を考えているか。
具体的な悩み・後悔・渇望を1文で言語化する。
→ 1本目の冒頭に、この悩みを直撃する言葉を置く。

━━ 生成ルール ━━
- Markdown記号（**、##、___など）は一切使わない。プレーンテキストのみ
- 各投稿は実際にそのままコピーして投稿できる完成した文章
- 3本それぞれ「悩み直撃型」「証拠・信頼型」「CTA型」の異なる役割で作る
- 架空のURL（example.comなど）は絶対に使わない
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
