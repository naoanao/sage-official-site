import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      industry, business_desc, customer_desc, main_problem, product, goal, lang, locale,
      proof_numbers, before_state, after_state, competitor_diff, price_or_offer, customer_quote,
      booking_url,  // ユーザーのウェブサイトURL（あれば内容をスクレイプして参考にする）
    } = body;

    // ウェブサイトURL → テキスト抽出（最大2000文字、失敗しても続行）
    let siteContent = "";
    if (booking_url) {
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        const res = await fetch(booking_url, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GrowlBot/1.0)", "Accept": "text/html" },
        });
        if (res.ok) {
          const html = await res.text();
          siteContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 2000);
        }
      } catch {}
    }

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

## ⚠️ ABSOLUTE RULE — NO HALLUCINATION (legal & policy compliance):
NEVER invent, fabricate, or assume ANY of the following unless explicitly provided in the PRODUCT BRIEF below:
- Numbers, percentages, statistics (e.g. "78% success rate", "saves 3 hours/day")
- Customer counts (e.g. "10,000 customers", "300 businesses")
- Timeframes for results (e.g. "in 30 days", "within 72 hours")
- Testimonials or customer quotes
- Revenue figures, ROI claims, cost savings
- Awards, media mentions, certifications

If proof_numbers, customer_quote, or price_or_offer are NOT provided: write benefit-focused copy WITHOUT inventing specific numbers. Use qualitative language instead ("many businesses", "significant results", "proven approach").
Violation = false advertising = illegal. Do NOT improvise facts.

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
${siteContent ? `\n## WEBSITE CONTENT (use specific details, services, language from this site — but only verified facts):\n${siteContent}` : ""}

## CHOOSE YOUR FRAMEWORK (pick ONE that fits this product best):
1. **PASP** — Problem → Agitate → Solution → Proof (+35% CVR for trust-barrier products)
2. **BAT** — Before/After Transformation with specific timeframe (+45% CTR for transformation products)
3. **CLO** — Curiosity Loop Opening, create information gap (+55% CTR)
4. **SPS** — Social Proof Stacking: weave numbers + testimonial + media mention (+30% CVR)
5. **OP** — Objection Preemption: address top objections directly in the ad (+25% CVR for high-ticket)
6. **CLM** — Customer Language Mirror: use exact words real customers use (+40-60% engagement)

## CHOOSE YOUR HOOK TYPE (first 2-3 seconds):
- **Question**: "Are you still [painful situation]?"
- **Number**: "[X] businesses achieved [result] in [timeframe]"
- **Reverse Psychology**: "Stop doing [common mistake] if you want [result]"
- **Tension**: "The [mistake/secret] that's costing you [specific loss]"
- **First-Person**: "I used to [struggle] until I found [solution]"
- **FOMO**: "Only [X] spots left — [specific benefit]"

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
  "primary_text_full": "MINIMUM 300 chars, TARGET 400-500 chars. MANDATORY structure: [Hook sentence] [2-3 sentences agitating the pain - make it real and specific] [Introduce solution naturally] [Proof point using provided data or qualitative if no data] [Emotional close] [CTA]. DO NOT summarize. Write the FULL narrative. Every section must be present.",
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

## ⚠️ 絶対ルール — ハルシネーション禁止（法的・ポリシー遵守）：
以下の情報は、下の「商品情報」に明示されていない限り、絶対に作り上げてはいけません：
- 数字・パーセンテージ・統計（例：「78%が達成」「3時間短縮」）
- 顧客数・導入数（例：「1万社」「300名以上」）
- 結果までの期間（例：「30日で」「72時間以内に」）
- お客様の声・証言
- 売上・ROI・コスト削減の具体的数値
- 受賞歴・メディア掲載・資格・認定

proof_numbers・customer_quote・price_or_offerが未入力の場合：具体的な数字を一切使わず、ベネフィット重視の表現にする。「多くのお客様が」「確かな実績で」のような定性的表現を使う。
違反＝虚偽広告＝違法。事実を勝手に作ることは絶対禁止。

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
${siteContent ? `\n## ウェブサイト内容（このサイトの具体的なサービス・言葉・特徴を活用すること。ただし確認できた事実のみ使用）：\n${siteContent}` : ""}

## フレームワーク選択（この商品に最適な1つ）：
1. **PASP** — 問題→煽る→解決→証明（信頼障壁のある商品で+35% CVR）
2. **BAT** — ビフォーアフター変容＋具体的期間（変容系商品で+45% CTR）
3. **CLO** — 好奇心ループ、情報ギャップで止める（+55% CTR）
4. **SPS** — 社会的証明スタッキング：数字+証言+メディア言及を1つの流れで（+30% CVR）
5. **OP** — 反論先取り：広告内で上位2つの反論を潰す（高額商品で+25% CVR）
6. **CLM** — 顧客の言葉ミラー：実際のお客様が使う言葉をそのまま使う（+40〜60% エンゲージメント）

## フックタイプ選択（冒頭2〜3秒）：
- **質問型**：「まだ〇〇で悩んでいますか？」
- **数字型**：「〇〇社が〇日で〇〇を達成」
- **逆説型**：「〇〇をやめると〇〇が改善します」
- **テンション型**：「あなたの〇〇を毎月〇万円奪っているもの」
- **一人称型**：「私も〇〇で苦しんでいました。〇〇するまでは」
- **FOMO型**：「残り〇名 — 〇〇が無料で使えます」

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
  "primary_text_full": "最低300文字・目標400〜500文字。必須構成：[フック文] [痛みを深く煽る2〜3文（具体的な状況・感情を描写）] [解決策の自然な導入] [証拠ポイント（提供データがあれば使用、なければ定性表現）] [感情的クロージング] [CTA]。要約は禁止。各セクションを省略せず完全に書き切ること。",
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
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const adCopy = JSON.parse(groqData.choices[0].message.content);

    // ハルシネーション検出：入力にない数字が生成テキストに含まれていないかチェック
    const inputFacts = [proof_numbers, customer_quote, price_or_offer, business_desc, customer_desc, main_problem, product]
      .filter(Boolean).join(" ");
    const generatedText = [adCopy.primary_text_full, adCopy.primary_text_short, adCopy.headline,
      ...(adCopy.carousel_cards || []).map((c: {card_body?: string}) => c.card_body)].filter(Boolean).join(" ");

    // 数字パターンを抽出して入力に含まれているか検証
    const numbersInOutput = generatedText.match(/\d+[%万円名社人ヶ月日週時間]+|\d{2,}/g) || [];
    const suspiciousNumbers = numbersInOutput.filter(n => !inputFacts.includes(n));

    return NextResponse.json({
      success: true,
      ad_copy: adCopy,
      // 警告フラグ（UIで表示）
      warnings: suspiciousNumbers.length > 0
        ? suspiciousNumbers.map(n => isEn
            ? `"${n}" was not in your input — please verify this is accurate before publishing`
            : `「${n}」は入力情報にありませんでした。公開前に事実確認してください`)
        : [],
    });
  } catch (err) {
    console.error("meta-ads/generate error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
