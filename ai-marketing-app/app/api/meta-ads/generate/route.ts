import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { industry, business_desc, customer_desc, main_problem, product, goal, lang } = body;

    const isEn = lang === "en";

    const prompt = isEn
      ? `You are a world-class Meta ads strategist — think Nick Shackelford ($100M+ ad spend), Florind Metalla (influenced $100M+ in DTC revenue), and the best performance marketers at top agencies.

## CRITICAL CONTEXT FOR 2025
Meta's Andromeda algorithm now uses your AD CREATIVE to determine who sees the ad — the creative IS the targeting. 70-80% of performance comes from creative quality alone (AppsFlyer 2025). The first 2-3 seconds determine everything.

## BUSINESS BRIEF
Business: ${business_desc}
Industry: ${industry}
Target customer: ${customer_desc}
Core problem we solve: ${main_problem}
Product/offer: ${product || "our service"}
Goal: ${goal || "get more customers"}

## YOUR TASK
Generate ONE high-converting Meta ad using the Hook → Body → CTA framework used by the world's best Meta advertisers.

### HOOK (first line of primary_text — must STOP THE SCROLL)
Choose the most powerful hook type for this business:
- Question Hook: "Are you still [painful situation]?"
- Number Hook: "[X] out of [Y] people struggle with [problem]"
- Reverse Psychology: "Don't [action] until you read this"
- Tension Hook: "The [secret/mistake] that's costing you [loss]"
- Before/After: "[Current pain] → [Desired outcome] in [timeframe]"
- FOMO: "Only [X] left — [benefit]"

### BODY (proof + solution, 2-3 sentences)
Problem → Our solution → One concrete proof point (number, result, or testimonial-style)

### CTA (specific, urgent)
Drive ONE action.

### HEADLINE (shown below image)
Number-driven or urgency-driven. This is what stops the second scroll.

## OUTPUT — valid JSON only, no markdown:
{
  "hook_type": "the hook type you chose and why (1 sentence)",
  "headline": "max 40 chars — number or urgency, NO generic phrases",
  "primary_text": "max 125 chars — Hook + Body + CTA integrated. Start with the hook. Make every word earn its place.",
  "description": "max 30 chars — reinforce the core benefit",
  "cta": "LEARN_MORE or BOOK_NOW or SIGN_UP or GET_QUOTE or CONTACT_US",
  "target_audience": "specific age range, interests, behaviors for Meta Ads Manager",
  "image_prompt": "detailed english prompt: show the AFTER state (desired outcome), real people, emotion-forward, no text overlays, mobile-first 1:1 or 4:5 ratio"
}`
      : `あなたは世界最高レベルのMeta広告ストラテジストです。Nick Shackelford（$1億以上の広告運用）、Florind Metalla（DTC売上$1億以上に貢献）のような思考で広告を作ってください。

## 2025年の重大な前提
Metaの新アルゴリズム「Andromeda」により、**広告クリエイティブ自体がターゲティング**になりました。
オーディエンス設定より、クリエイティブの質が成果の70〜80%を決めます（AppsFlyer 2025）。
最初の**2〜3秒（Hook）がすべてを決めます**。

## 事業情報
業種: ${industry}
事業説明: ${business_desc}
ターゲット顧客: ${customer_desc}
解決する悩み: ${main_problem}
商品/サービス: ${product || "サービス全般"}
目標: ${goal || "新規顧客獲得"}

## あなたのタスク
Hook → Body → CTAの世界標準フレームワークで、最高CVRのMeta広告を1本生成してください。

### HOOK（primary_textの冒頭 — スクロールを止める）
この事業に最も強力なフックタイプを選んでください：
- 質問型：「まだ〇〇で悩んでいませんか？」
- 数字型：「〇〇人中〇〇人が抱える悩みを解決」
- 逆説型：「〇〇する前に、これだけは知ってください」
- テンション型：「あなたが〇〇できない本当の理由」
- ビフォーアフター型：「〇〇だった私が、〇日で〇〇に」
- FOMO型：「残り〇名限定 — 〇〇が無料」

### BODY（証明、2〜3文）
問題 → 解決策 → 具体的な証拠（数字・実績・お客様の声）

### CTA（具体的・限定的なアクション）

### HEADLINE（画像の下に表示）
数字か緊急性を含む。2回目のスクロールを止める。

## 出力 — 有効なJSONのみ、マークダウン不要:
{
  "hook_type": "選んだフックの種類と理由（1文）",
  "headline": "見出し40文字以内 — 数字か緊急性。ありきたりな表現は禁止",
  "primary_text": "本文125文字以内 — Hook+Body+CTA統合。フックから始める。無駄な一言もなく",
  "description": "説明30文字以内 — コアベネフィットを強化",
  "cta": "LEARN_MORE または BOOK_NOW または SIGN_UP または GET_QUOTE または CONTACT_US",
  "target_audience": "Meta広告マネージャー用：具体的な年齢・地域・興味関心・行動ターゲティング",
  "image_prompt": "詳細な英語プロンプト：After状態（理想の結果）を映す、実在感のある人物、感情が伝わる表情、テキストオーバーレイなし、モバイルファースト1:1または4:5比率"
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
