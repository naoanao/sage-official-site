import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      industry, business_desc, customer_desc, main_problem, product, goal, lang, locale,
      // 追加の深掘り情報（あれば使う）
      proof_numbers,    // 実績・数字「300社導入」「平均CVR3倍」等
      before_state,     // 顧客のビフォー状態（具体的に）
      after_state,      // 顧客のアフター状態（具体的に）
      competitor_diff,  // 競合との差別化ポイント
      price_or_offer,   // 価格・オファー「月額980円」「初月無料」等
      customer_quote,   // 実際のお客様の声（あれば）
    } = body;

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
      ? `You are Nick Shackelford, Florind Metalla, and the Superside creative team combined — the world's best Meta ads creators responsible for $100M+ in ad spend and countless 4-6x ROAS campaigns.

## ALGORITHM TRUTH (2026)
Meta's Andromeda: creative IS targeting. 70-80% of performance = creative quality. The ad you write will find its own audience. Write to one specific person in deep pain, not to everyone.

## ${localeInstruction}

## PRODUCT BRIEF
Business: ${business_desc}
Industry: ${industry}
Ideal customer: ${customer_desc}
Their #1 pain: ${main_problem}
Product: ${product || "our service"}
Goal: ${goal || "get more customers"}
${proof_numbers ? `Proof/Numbers: ${proof_numbers}` : ""}
${before_state ? `Customer BEFORE: ${before_state}` : ""}
${after_state ? `Customer AFTER: ${after_state}` : ""}
${competitor_diff ? `Why we're different: ${competitor_diff}` : ""}
${price_or_offer ? `Offer: ${price_or_offer}` : ""}
${customer_quote ? `Real customer quote: "${customer_quote}"` : ""}

## WHAT WORLD-CLASS META ADS ACTUALLY DO (from top DTC brands):
- Dyson: 10 carousel cards showing different customer transformations
- Monday.com: "Your team deserves better" — emotional guilt + clear before/after
- Dollar Shave Club: Curiosity hook + competitor callout + simple visual
- BarkBox: Emotional narrative + sequential carousel story
- Slack: Pain point #1 + Pain point #2 in first 5 words
- Duolingo: Humor + genuine value upfront + zero "salesy" feeling

## PRIMARY TEXT REALITY CHECK:
125 chars = mobile preview ONLY. Real top ads use 300-600 chars with a COMPLETE story.
Write primary_text_full as a complete narrative (300-500 chars): Hook → Agitate pain → Solution → Specific proof → CTA
Write primary_text_short (under 125 chars) for the mobile preview hook only.

## CAROUSEL STRATEGY (most effective format in 2026):
Each card tells ONE angle. Together they build an irresistible case. Think Dyson's 10 hair transformations.

## OUTPUT — valid JSON only, no markdown, no truncation:
{
  "framework": "chosen framework + why (1 sentence)",
  "hook_type": "chosen hook + why (1 sentence)",
  "headline": "max 40 chars — number, timeframe, or emotional trigger. NEVER generic.",
  "primary_text_short": "under 125 chars — ONLY the hook. This is what shows before 'See More'. Must make them tap.",
  "primary_text_full": "300-500 chars — complete story: hook → pain agitation (2-3 sentences making it hurt) → solution introduction → specific proof with numbers → emotional close → CTA. Write like a top copywriter.",
  "description": "max 30 chars — strongest single benefit",
  "cta": "LEARN_MORE or BOOK_NOW or SIGN_UP or GET_QUOTE or CONTACT_US",
  "target_audience": "precise: age range, specific interests, behaviors, life events, job titles if B2B",
  "carousel_cards": [
    {"card_headline": "max 40 chars", "card_body": "max 60 chars — one specific angle/benefit", "card_image_prompt": "english visual prompt — show THIS specific transformation/benefit, real person, emotion, no text, mobile 1:1"},
    {"card_headline": "...", "card_body": "...", "card_image_prompt": "..."},
    {"card_headline": "...", "card_body": "...", "card_image_prompt": "..."}
  ],
  "image_prompt_single": "For single image ad: detailed english prompt — show the AFTER state emotionally, real person, genuine joy/relief/confidence, natural environment, no text overlays, mobile 1:1 or 4:5"
}`
      : `あなたはNick Shackelford、Florind Metalla、SupersideクリエイティブチームをすべてあわせたMeta広告の世界最高クリエイターです。$1億以上の広告運用で4〜6倍ROASを達成してきた思考で広告を作ってください。

## 2026年のアルゴリズム真実
MetaのAndromeda：クリエイティブがターゲティング。成果の70〜80%はクリエイティブの質。あなたが書く広告が自分で適切な人を見つける。「全員」ではなく「深く悩んでいる一人の人」に向けて書いてください。

## ${localeInstruction}

## 商品情報
業種: ${industry}
事業説明: ${business_desc}
理想顧客: ${customer_desc}
最大の悩み: ${main_problem}
商品/サービス: ${product || "サービス全般"}
目標: ${goal || "新規顧客獲得"}
${proof_numbers ? `実績・数字: ${proof_numbers}` : ""}
${before_state ? `顧客のビフォー状態: ${before_state}` : ""}
${after_state ? `顧客のアフター状態: ${after_state}` : ""}
${competitor_diff ? `競合との差別化: ${competitor_diff}` : ""}
${price_or_offer ? `価格・オファー: ${price_or_offer}` : ""}
${customer_quote ? `実際のお客様の声: 「${customer_quote}」` : ""}

## 世界トップ広告が実際にやっていること：
- Dyson：10枚カルーセルで異なる顧客変容を見せる
- Monday.com：「あなたのチームはもっといい環境に値する」感情的罪悪感+ビフォーアフター
- Dollar Shave Club：好奇心フック+競合への言及+シンプルビジュアル
- BarkBox：感情的ナラティブ+シーケンシャルカルーセルストーリー
- Slack：最初の5文字でペインポイント2つを直撃
- Duolingo：ユーモア+最初から本物の価値提供+売り込み感ゼロ

## primary_textの現実：
125文字＝モバイル「もっと見る」前の表示量のみ。本物のトップ広告は300〜600文字で完全なストーリーを語る。
primary_text_full（300〜500文字）：フック→痛みを煽る→解決策→具体的証拠→CTA の完全ナラティブ
primary_text_short（125文字以内）：「もっと見る」前のフックのみ

## カルーセル戦略（2026年最強フォーマット）：
各カードが一つの角度を語る。合わせて圧倒的な説得力を作る。

## 出力 — 有効なJSONのみ、省略なし：
{
  "framework": "選んだフレームワークと理由（1文）",
  "hook_type": "選んだフックと理由（1文）",
  "headline": "40文字以内 — 数字・期間・感情トリガー。ありきたり表現は絶対禁止",
  "primary_text_short": "125文字以内 — フックのみ。「もっと見る」をタップさせる一言",
  "primary_text_full": "300〜500文字 — 完全ストーリー：フック→痛みを煽る（2〜3文で深く刺す）→解決策導入→具体的な証拠・数字→感情的クロージング→CTA。世界最高のコピーライターとして書く",
  "description": "30文字以内 — 最強のベネフィット1つ",
  "cta": "LEARN_MORE または BOOK_NOW または SIGN_UP または GET_QUOTE または CONTACT_US",
  "target_audience": "具体的：年齢・特定の興味関心・行動・ライフイベント・職種（B2Bなら）",
  "carousel_cards": [
    {"card_headline": "40文字以内", "card_body": "60文字以内 — 1つの特定の角度/ベネフィット", "card_image_prompt": "英語のビジュアルプロンプト — この特定の変容/ベネフィットを映す、本物感のある人物、感情、テキストなし、モバイル1:1"},
    {"card_headline": "...", "card_body": "...", "card_image_prompt": "..."},
    {"card_headline": "...", "card_body": "...", "card_image_prompt": "..."}
  ],
  "image_prompt_single": "シングル画像広告用：アフター状態の感情を映す詳細英語プロンプト — 本物の喜び/安堵/自信、自然な環境、テキストオーバーレイなし、モバイル1:1または4:5"
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
        max_tokens: 1500,
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
