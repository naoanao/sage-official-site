import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { industry, business_desc, customer_desc, main_problem, product, goal, lang, locale } = body;

    const isEn = lang === "en";

    // ロケール別文化的コンテキスト（2026年 2.8M広告分析より）
    const localeContext: Record<string, string> = {
      us: `LOCALE: United States 🇺🇸
- Lead with NUMBERS and ROI: "23% higher", "saves $1,200/year", "in 72 hours"
- Stack social proof aggressively: customer count + testimonial + media mention in one ad
- Urgency is expected and works: "Limited spots", "Only today", "Don't miss this"
- Outcome-focused headlines with specific timeframes convert 38% better
- Direct, confident, no hedging: "Get results" not "You might see results"
- Mobile-first sentences: under 12 words each, key benefit in first 125 chars`,

      uk: `LOCALE: United Kingdom 🇬🇧
- Understated confidence beats aggressive claims — British audiences distrust hype
- Dry humor and wit outperform urgency tactics (humor increases engagement 43%)
- Trust signals matter most: "Established 2015", "Used by 10,000 UK businesses"
- Soft CTAs perform better: "Find out more" > "BUY NOW"
- Avoid American-isms: "rubbish" not "trash", "brilliant" not "awesome"
- Compliance note: substantiate claims — ASA rules apply ("best" requires evidence)
- Conversational and honest tone: acknowledge the problem genuinely before solving it`,

      au: `LOCALE: Australia 🇦🇺
- Casual, direct, conversational — Australians distrust corporate/formal language
- Self-deprecating humor and irreverence work well
- Mateship/community angle: "Join thousands of Aussie businesses"
- No-nonsense value: get to the point fast, no fluff
- "No worries" attitude: remove risk, emphasize ease ("set up in 5 minutes, cancel anytime")
- Avoid UK-isms and US-isms — keep it distinctly Australian
- Price sensitivity: be upfront about value-for-money`,

      ca: `LOCALE: Canada 🇨🇦
- Blend of US directness and UK politeness — confident but never aggressive
- Bilingual awareness: if targeting Quebec, French copy dramatically outperforms English
- Canadian pride angles work: "Made for Canadian businesses"
- Trust and reliability over urgency
- Similar to UK: substantiate claims, avoid excessive hype`,

      jp: `LOCALE: Japan 🇯🇵
- 丁寧で信頼感のある表現が必須
- 具体的な数字と実績が信頼を生む
- 安心・安全・サポートを強調
- 控えめなCTA：「詳しく見る」「まずは無料で試す」
- 長文よりも要点を絞った簡潔さ
- 社会的証明：「〇〇社が導入」「〇〇人が利用中」`,

      global: `LOCALE: Global English 🌍
- Write for clarity over cleverness — non-native English speakers will read this
- Short sentences, common words, no idioms or slang
- Universal pain points: save time, save money, grow business, reduce stress
- Numbers translate universally — use them liberally
- Avoid cultural references that don't travel`,
    };

    const localeInstruction = localeContext[locale || (isEn ? "us" : "jp")] || localeContext[isEn ? "us" : "jp"];

    const prompt = isEn
      ? `You are a world-class Meta ads strategist — think Nick Shackelford ($100M+ ad spend), Florind Metalla ($100M+ DTC revenue), and Persado's emotion AI team.

## CRITICAL ALGORITHM CONTEXT (2026)
Meta's Andromeda algorithm uses your AD CREATIVE to determine targeting — creative IS targeting. 70-80% of ad performance comes from creative quality (AppsFlyer). First 2-3 seconds decide everything. Ultra-specific benefit statements outperform generic claims by 67%.

## ${localeInstruction}

## BUSINESS BRIEF
Business: ${business_desc}
Industry: ${industry}
Target customer: ${customer_desc}
Core problem: ${main_problem}
Product/offer: ${product || "our service"}
Goal: ${goal || "get more customers"}

## CHOOSE THE BEST FRAMEWORK (pick ONE, based on what fits this business best):
1. **PASP** — Problem → Agitate → Solution → Proof (+35% CVR for trust-barrier products)
2. **BAT** — Before/After Transformation, specific timeframe (+45% CTR for personal transformation)
3. **CLO** — Curiosity Loop Opening, information gap (+55% CTR, needs strong landing page)
4. **SPS** — Social Proof Stacking, weave numbers+testimonial+media into one flow (+30% CVR)
5. **OP** — Objection Preemption, address top 1-2 objections upfront (+25% CVR for high-ticket)
6. **CLM** — Customer Language Mirror, use exact phrases real customers use (+40-60% engagement)

## HOOK TYPES (first 2-3 seconds of primary_text):
- Question: "Are you still [painful situation]?"
- Number: "[X] businesses [achieved outcome] in [timeframe]"
- Reverse Psychology: "Stop doing [common thing] if you want [result]"
- Tension: "The [mistake] that's costing you [specific loss]"
- First-Person: "I used to [struggle] until I found [solution]"
- FOMO: "Only [X] left — [specific benefit]"

## OUTPUT — valid JSON only, no markdown:
{
  "framework": "which framework you chose and why (1 sentence)",
  "hook_type": "which hook type and why (1 sentence)",
  "headline": "max 40 chars — specific number or timeframe, NO generic phrases like 'Learn More' or 'Best Solution'",
  "primary_text": "max 125 chars — open with hook, deliver proof, close with CTA. Every word earns its place. Mobile-optimized: sentences under 12 words.",
  "description": "max 30 chars — reinforce the single most compelling benefit",
  "cta": "LEARN_MORE or BOOK_NOW or SIGN_UP or GET_QUOTE or CONTACT_US",
  "target_audience": "specific age, interests, behaviors, life events for Meta Ads Manager — be precise",
  "image_prompt": "detailed english prompt: show the emotional AFTER state (desired outcome achieved), real person with genuine emotion, no text overlays, mobile-first 1:1 or 4:5 ratio, natural lighting"
}`
      : `あなたは世界最高レベルのMeta広告ストラテジストです。Nick Shackelford（$1億以上の広告運用）、Florind Metalla（DTC売上$1億以上に貢献）、PersadoのエモーションAIチームの思考で広告を作ってください。

## 2026年のアルゴリズム前提
Metaの「Andromeda」により**クリエイティブ自体がターゲティング**です。広告成果の70〜80%はクリエイティブの質で決まります。最初の2〜3秒がすべてを決めます。超具体的なベネフィットは曖昧な表現より67%高い成果を出します。

## ${localeInstruction}

## 事業情報
業種: ${industry}
事業説明: ${business_desc}
ターゲット顧客: ${customer_desc}
解決する悩み: ${main_problem}
商品/サービス: ${product || "サービス全般"}
目標: ${goal || "新規顧客獲得"}

## フレームワーク選択（この事業に最適な1つを選ぶ）：
1. **PASP** — 問題→煽る→解決→証明（信頼障壁のある商品で+35% CVR）
2. **BAT** — ビフォーアフター変容、具体的な期間付き（自己変容商品で+45% CTR）
3. **CLO** — 好奇心ループ、情報ギャップ（+55% CTR、LPとのセット必須）
4. **SPS** — 社会的証明スタッキング、数字+証言+メディアを1つの流れに（+30% CVR）
5. **OP** — 反論先取り、上位1〜2つの反論を広告内で潰す（高額商品で+25% CVR）
6. **CLM** — 顧客の言葉ミラー、実際のお客様の言葉をそのまま使う（+40〜60% エンゲージメント）

## フックタイプ（primary_textの冒頭2〜3秒）：
- 質問型：「まだ〇〇で悩んでいますか？」
- 数字型：「〇〇社が〇日で〇〇を達成」
- 逆説型：「〇〇をやめると〇〇が改善します」
- テンション型：「あなたの〇〇を毎月〇万円奪っているもの」
- 一人称型：「私も〇〇で苦しんでいました。〇〇するまでは」
- FOMO型：「残り〇名 — 〇〇が無料で使えます」

## 出力 — 有効なJSONのみ、マークダウン不要:
{
  "framework": "選んだフレームワークと理由（1文）",
  "hook_type": "選んだフックの種類と理由（1文）",
  "headline": "見出し40文字以内 — 具体的な数字か期間を含む。「最高の〇〇」などの曖昧表現禁止",
  "primary_text": "本文125文字以内 — フックで始め、証明を届け、CTAで締める。1文12文字以内。無駄な一言もない",
  "description": "説明30文字以内 — 最も説得力あるベネフィット1つだけ",
  "cta": "LEARN_MORE または BOOK_NOW または SIGN_UP または GET_QUOTE または CONTACT_US",
  "target_audience": "Meta広告マネージャー用：具体的な年齢・地域・興味関心・ライフイベント・行動ターゲティング",
  "image_prompt": "詳細な英語プロンプト：After状態（理想の結果が実現した瞬間）を映す、本物感のある人物、感情が伝わる表情、テキストオーバーレイなし、モバイルファースト1:1または4:5比率、自然光"
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
        max_tokens: 600,
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
