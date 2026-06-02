import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { industry, business_desc, customer_desc, main_problem, product, goal, lang } = body;

    const isEn = lang === "en";

    const prompt = isEn
      ? `You are a Meta Ads expert. Generate high-converting ad copy for a small business.

Business: ${business_desc}
Industry: ${industry}
Target customer: ${customer_desc}
Problem we solve: ${main_problem}
Product/offer: ${product || "our service"}
Goal: ${goal || "get more customers"}

Output ONLY valid JSON (no markdown):
{
  "headline": "max 40 chars, include number or urgency",
  "primary_text": "max 125 chars, lead with benefit",
  "description": "max 30 chars",
  "cta": "LEARN_MORE or BOOK_NOW or SIGN_UP",
  "target_audience": "suggested age range, interests for Meta targeting",
  "image_prompt": "english prompt for image generation"
}`
      : `あなたはMeta広告の専門家です。中小事業者向けの高CVR広告文を生成してください。

業種: ${industry}
事業説明: ${business_desc}
ターゲット: ${customer_desc}
解決する悩み: ${main_problem}
商品/サービス: ${product || "サービス全般"}
目標: ${goal || "新規顧客獲得"}

有効なJSONのみ出力（マークダウン不要）:
{
  "headline": "見出し40文字以内・数字か緊急性を含む",
  "primary_text": "本文125文字以内・ベネフィット先出し",
  "description": "説明30文字以内",
  "cta": "LEARN_MORE または BOOK_NOW または SIGN_UP",
  "target_audience": "Metaターゲティング用：年齢・地域・興味関心の提案",
  "image_prompt": "画像生成AIへの英語プロンプト"
}`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const adCopy = JSON.parse(groqData.choices[0].message.content);

    return NextResponse.json({ success: true, ad_copy: adCopy });
  } catch (err) {
    console.error("meta-ads/generate error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
