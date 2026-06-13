import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 55;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      industry, business_desc, customer_desc, main_problem, product, goal, lang, locale,
      proof_numbers, before_state, after_state, competitor_diff, price_or_offer, customer_quote,
      booking_url,  // ユーザーのウェブサイトURL（あれば内容をスクレイプして参考にする）
      hook_hint,    // 任意: 複数バリアントテスト用。指定フックタイプ(質問型/数字型/逆説型/一人称型/FOMO型 等)で書かせる
    } = body;
    // バリアント生成用: フックタイプ指定があれば最優先指示として注入（別アングルのコピーを得る）
    const hookSuffix = hook_hint
      ? `\n\n## 🅰️最優先指示（バリアントテスト）: フックタイプは必ず「${String(hook_hint)}」で、全コピー(headline/primary_text)をその切り口に統一して書くこと。他案と差別化された角度にすること。`
      : "";

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

    // undefined/null/空文字を安全な文字列に変換するヘルパー
    const safe = (v: unknown, fallback = ""): string =>
      !v || v === "undefined" || v === "null" ? fallback : String(v);

    // ターゲット設計：コア層・拡張層 + 態度変容マップ
    const targetDesign = isEn
      ? `## TARGET AUDIENCE DESIGN (mandatory — apply to all ad copy)
CORE LAYER (highest purchase intent — write the ad primarily for this person):
The person who is already aware of the problem, actively searching for a solution, and has the budget and motivation to buy now.
Typical profile: ${safe(customer_desc, "your most ready-to-buy customer segment")}

EXTENDED LAYER (broader resonance — secondary audience who shares the same insight):
People who have the same underlying frustration but haven't yet committed to seeking a solution.
Goal: Use the ad copy to make them realize "this is my problem too."

IMPORTANT: Meta's Andromeda algorithm means creative IS targeting. A well-crafted ad for your core layer will automatically find both layers. Write for one specific person in deep pain — not for everyone.

## ATTITUDE CHANGE MAP — which stage is this ad targeting?
AWARENESS: Customer doesn't know the problem exists → use curiosity/education hook
INTEREST: Customer knows the problem but not your solution → use comparison/benefit hook
DESIRE: Customer is considering options → use proof/USP/objection-preemption
ACTION: Customer almost ready → use risk-removal (trial price, guarantee, no commitment)
LOYALTY: Customer bought once → use community/results/upsell hooks
→ Identify which stage has the biggest bottleneck and write the ad to move people through that specific gap.

## USP ARCHITECTURE — separate strategy from customer copy:
STRATEGIC USP (internal): The honest claim only this product can make — the non-copyable fact.
CUSTOMER HOOK (ad copy): Translate that fact into the emotional outcome the customer actually wants.
Example: Strategic USP = "Only functional certified kale juice with 2 live bacteria strains" → Customer Hook = "The morning guilt is gone. One cup. 780 yen."
→ Write the customer hook in the headline. The strategic USP becomes proof in the body copy.`
      : `## ターゲット設計（必須 — 全ての広告コピーに反映すること）
コア層（購買確度が最も高い層 — この人に向けて広告を書く）：
既に問題を自覚し、解決策を積極的に探していて、予算と意欲が揃っている人。
想定プロフィール：${safe(customer_desc, "最も購買意欲の高い顧客層")}

拡張層（コア層と同じインサイトを持つ周辺層 — 二次ターゲット）：
同じ根本的な不満を抱えているが、まだ積極的に解決策を探していない層。
目標：広告コピーで「これは自分の問題だ」と気づかせること。

重要：MetaのAndromedaアルゴリズムではクリエイティブがターゲティング。深く悩んでいる一人の人に向けて書いた広告が、アルゴリズムが両層を自動で見つける。「全員向け」ではなく「深い悩みを持つ一人向け」に書くこと。

## 態度変容マップ — この広告はどのステージを動かすか？
AWARENESS（認知）：問題の存在すら知らない層 → 好奇心・教育型フック
INTEREST（興味）：問題は知っているが解決策を探していない層 → 比較・ベネフィット型フック
DESIRE（欲求）：選択肢を比較検討中の層 → 証拠・USP・反論先取り型
ACTION（行動）：買いたいが踏み出せない層 → リスク除去（初回価格・保証・縛りなし）
LOYALTY（継続）：一度購入した層 → コミュニティ・結果報告・アップセル型
→ 最もボトルネックになっているステージを特定し、そのギャップを動かす広告を書くこと。

## USPアーキテクチャ — 戦略USPと顧客向けコピーを分けて設計する
戦略USP（社内の核）：この商品だけが正直に言える競合にコピーできないファクト
顧客向けコピー（広告フック）：そのファクトを「顧客が実際に手に入れたい感情・生活の変化」に翻訳したもの
例：戦略USP「生菌2種×国産ケールの日本初機能性表示青汁」→ 顧客コピー「朝の罪悪感がなくなった。もう一杯。780円から。」
→ 見出しには顧客コピーを。戦略USPは本文の「証拠」として使う。`;

    // 4つのクリエイティブ訴求軸 + UGC戦略 + 競合カウンター
    const creativeAxisGuide = isEn
      ? `## 4 CREATIVE AXIS TYPES — choose the best fit for this product:
1. PAIN ATTACK: Open by naming the exact pain. "Are you still [specific frustration]?" Best for: products solving acute, recognized problems.
2. FUNCTIONAL PROOF: Lead with a specific, verifiable benefit. "[Specific ingredient/mechanism] → [Specific outcome]". Best for: functional foods, supplements, tech products with provable claims.
3. BRAND TRUST: Lead with authority or legacy. "Since [year] / [Certification] / [Award]". Best for: established brands, regulated products, trust-barrier categories.
4. UGC TESTIMONIAL: Open with a real customer's exact words or transformation. "I used to [struggle]... now [result]". Best for: products where social proof overcomes skepticism.

## UGC CREATIVE STRATEGY (highest-performing format in 2026):
UGC (User Generated Content) style ads outperform polished brand ads in almost every category.
WHY it works: Andromeda's algorithm distributes UGC-style content more broadly because users engage with it like organic content.
HOW to write UGC-style copy even without real reviews:
- Write in first-person ("I was struggling with...")
- Include specific sensory details ("It dissolved instantly, no shaker needed")
- Show the before/after transformation through one person's experience
- End with a natural, non-pushy CTA ("I just reordered my 3rd pack")

## COMPETITIVE COUNTER COPY (when competitor_diff is provided):
If a key competitive weakness exists, use it as the ad's central tension — without naming the competitor:
Example: Competitors use heat-killed bacteria → "Not all bacteria survive the journey. Ours do."
This works in the FUNCTIONAL PROOF axis and turns a competitor's weakness into your proof point.

Select the best axis, explain why in "framework" field, and write ALL copy to match that axis consistently.`
      : `## 4つのクリエイティブ訴求軸 — この商品に最適なものを選択：
1. ペイン直撃型: 冒頭でターゲットの悩みをそのまま言葉にする。「まだ〇〇に悩んでいますか？」最適：既に問題を自覚している層への商品。
2. 機能証明型: 具体的・検証可能なベネフィットで始める。「〇〇成分 → 〇〇の効果」最適：機能性食品・サプリ・根拠を示せる商品。
3. ブランド安心型: 権威・歴史・認定で始める。「〇〇年の歴史 / 機能性表示食品 / No.1」最適：信頼障壁の高い商品・大手ブランド。
4. UGC体験談型: 実際の顧客の言葉・変化で始める。「飲み始めて〇週間、お腹の調子が…」最適：実績・口コミが購入の決め手になる商品。

## UGC（口コミ風）クリエイティブ戦略（2026年最高パフォーマンス形式）：
UGCスタイルの広告は、ほぼ全ての商品カテゴリでブランド広告を圧倒する。
なぜ機能するか：Andromedaアルゴリズムはオーガニックコンテンツと区別がつかないUGC風広告を有機的に拡散する。
実際のレビューなしでUGCスタイルのコピーを書く方法：
- 一人称で書く（「私は〇〇に悩んでいました。でも…」）
- 具体的な感覚的詳細を入れる（「スプーンで混ぜるだけで、シャカシャカが不要で朝が楽に」）
- 一人の体験を通じてビフォーアフターを描く
- 自然なCTAで締める（「3袋目をもう注文しました」）

## 競合カウンターコピー（competitor_diffが提供された場合）：
競合の弱点が明確なら、競合名を出さずに「その弱点」を広告の中心的な緊張感として使う：
例：競合が殺菌乳酸菌 → 「菌が届かない青汁を、知らずに飲んでいませんか？」
機能証明型の軸で使うと、競合の弱みが自社の証拠ポイントに変わる。

最適な軸を選び、選んだ理由を "framework" フィールドに明記すること。全てのコピーをその軸で一貫させること。`;

    // 個人事業主・中小企業 全業態適応プレイブック — 2026各業種ベストプラクティスより
    const localBusinessGuide = isEn
      ? `## SMB PLAYBOOK — first CLASSIFY the business type, then write to that type
This serves sole proprietors & small businesses across ALL categories. Pick the ONE best-matching type from the brief and apply its objective + CTA + angle.

A) IN-PERSON LOCAL (restaurant, cafe, salon, gym, clinic, retail, repair): GOAL = a VISIT/booking this week from nearby people. Hook = sensory/craving (food) or visible result (salon/gym) or relief (clinic/repair) + the neighborhood. CTA = BOOK_NOW / GET_DIRECTIONS / "come by this week".
B) LOCAL SERVICE / TRADES (cleaning, pest control, plumber, contractor, mobile services): GOAL = a LEAD/quote (short cycle). Hook = the urgent problem + fast, trusted response (licensed/local/years). CTA = GET_QUOTE / CONTACT_US.
C) EXPERT / PROFESSIONAL SERVICE (consultant, coach, lawyer, accountant, designer, freelancer): GOAL = a qualified INQUIRY/consultation. Hook = a specific outcome or a costly mistake they're making; authority + specificity; the person's face/credibility. Offer = free consult/audit/guide. CTA = BOOK_NOW / CONTACT_US.
D) E-COMMERCE / ONLINE PRODUCT (physical or digital goods): GOAL = a PURCHASE. Hook = product-in-use / transformation / social proof; benefit + offer + light urgency. CTA = SHOP_NOW.
E) DIGITAL / SAAS / COURSE / SUBSCRIPTION: GOAL = signup / free trial. Hook = the pain of the status quo → the "after" with the tool; specific. CTA = SIGN_UP / LEARN_MORE.
F) B2B SERVICE: GOAL = a LEAD/demo (long cycle, higher CPL). Hook = ROI/authority/specificity. CTA = GET_QUOTE / CONTACT_US.

UNIVERSAL (all types):
- Match the CTA to the action that creates value (call→lead, buy→purchase, visit→booking). Don't default to LEARN_MORE.
- REAL photos beat stock/AI (owner's product, real before/after, real staff faces) — 2-3x more clicks. If a real photo is provided, write copy that honors what is shown.
- One SPECIFIC offer if price_or_offer is provided; otherwise an honest low-friction CTA. NEVER fabricate a discount, price, or number (compliance).
- Trust = specificity + honesty + a human face, not corporate hype.`
      : `## 個人事業主・中小企業プレイブック — まず業態を分類し、その型で書く
あらゆる業種の個人事業主・小規模事業者向け。ブリーフから最も合う型を1つ選び、その目的・CTA・訴求を適用する。

A) 実店舗・対面（飲食/カフェ/サロン/ジム/クリニック/小売/修理）：目的＝近隣の人を今週の来店/予約へ。ホック＝食欲・五感（飲食）/見える成果（サロン・ジム）/安心（クリニック・修理）＋地元の具体性。CTA＝BOOK_NOW / GET_DIRECTIONS /「今週ぜひ」。
B) 地域サービス・職人（清掃/害虫/水道/工務店/出張系）：目的＝リード/見積（短サイクル）。ホック＝緊急の困りごと＋迅速で信頼できる対応（資格/地元/実績年数）。CTA＝GET_QUOTE / CONTACT_US。
C) 専門・士業（コンサル/コーチ/弁護士/税理士/デザイナー/フリーランス）：目的＝質の高い問い合わせ/相談。ホック＝具体的な成果、または相手が犯している高コストな失敗。権威＋具体性＋本人の顔/信頼。オファー＝無料相談/診断/ガイド。CTA＝BOOK_NOW / CONTACT_US。
D) EC・オンライン商品（物販/デジタル）：目的＝購入。ホック＝使用シーン/変化/社会的証明。ベネフィット＋オファー＋軽い緊急性。CTA＝SHOP_NOW。
E) デジタル/SaaS/講座/サブスク：目的＝登録/無料体験。ホック＝現状の痛み→導入後の変化を具体的に。CTA＝SIGN_UP / LEARN_MORE。
F) B2Bサービス：目的＝リード/デモ（長サイクル・高CPL）。ホック＝ROI/権威/具体性。CTA＝GET_QUOTE / CONTACT_US。

共通（全業態）：
- CTAは「価値が生まれる行動」に合わせる（電話→リード、購入→購入、来店→予約）。汎用LEARN_MOREに逃げない。
- 実写真がストック/AIに勝つ（店主の商品・実物のビフォーアフター・スタッフの顔）＝クリック2-3倍。実写真があれば、写っているものを尊重したコピーに。
- price_or_offer があれば具体オファーを1つ。無ければ正直で摩擦の低いCTA。**割引・価格・数字を捏造しない（コンプラ）**。
- 信頼＝具体性＋正直さ＋人間の顔。企業的誇張はしない。`;

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

## TARGET ARCHITECTURE — Core Layer vs. Expansion Layer
Before writing any copy, mentally define TWO layers from the business data:
- **Core Layer (コア層)**: Primary customers most likely to convert now. Specific pain + specific life stage + specific awareness level. (Example: "Women 40-50s who started noticing gut decline and are actively looking for a solution")
- **Expansion Layer (拡張層)**: Adjacent customers who share the pain but haven't started searching yet. (Example: "Busy working mothers 30-40s who feel guilty about not eating enough vegetables in the morning")
Write primary_text_full targeting the CORE layer. Write carousel_cards that also speak to the expansion layer.

## 3C → USP → CREATIVE CHAIN
The best Meta ad is built on this chain — do not skip steps:
1. **3C insight**: What gap does the competitor's ★2-3 reviews reveal? (What are customers repeatedly complaining about?)
2. **USP extraction**: What can this business claim that competitors CANNOT? (The intersection of customer need × brand strength × competitor weakness)
3. **Creative direction**: Translate the USP into the first 2-3 seconds of emotional impact. The hook is NOT about the product — it's about the customer's life BEFORE the product.
When business data is limited, infer the 3C gap from the industry type and create copy based on the most common competitor weakness patterns.

## CAMPAIGN STRUCTURE THINKING
Think in campaign objectives before writing:
- **Awareness campaign**: Curiosity hook → broad pain agitation → brand name last. (TOFU — top of funnel)
- **Consideration campaign**: Specific solution copy → social proof → comparison to competitor weakness → CTA. (MOFU)
- **Conversion campaign**: Objection preemption → risk removal (guarantee, trial) → urgency → single clear CTA. (BOFU)
Default to CONSIDERATION copy unless the product/service is completely unknown in the market.

## ${localeInstruction}

${targetDesign}

${creativeAxisGuide}

${localBusinessGuide}

## PRODUCT BRIEF
Business: ${safe(business_desc, "a local small business")}
Industry: ${safe(industry, "small business")}
Ideal customer: ${safe(customer_desc, "local customers")}
Their #1 pain: ${safe(main_problem, "not getting enough new customers")}
Product: ${safe(product, "our service")}
Goal: ${safe(goal, "get more customers")}
${safe(proof_numbers) ? `Proof/Numbers: ${proof_numbers}` : ""}
${safe(before_state) ? `Customer BEFORE: ${before_state}` : ""}
${safe(after_state) ? `Customer AFTER: ${after_state}` : ""}
${safe(competitor_diff) ? `Why we're different: ${competitor_diff}` : ""}
${safe(price_or_offer) ? `Offer: ${price_or_offer}` : ""}
${safe(customer_quote) ? `Real customer quote: "${customer_quote}"` : ""}
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
  "headline": "max 40 chars — MUST contain a number, specific timeframe, or strong emotional trigger. BANNED: product category as headline ('Marketing Course', 'Personal Gym'), vague pain noun ('Your Struggle', 'The Problem'). GOOD examples: 'Lost 9 lbs in 3 months. Here's how.' / 'Stop guessing. Your 3 actions this week.'",
  "primary_text_short": "under 125 chars — stops the scroll. Use curiosity gap or direct pain hit. 'Are you still [specific struggle]?' or '[Specific fear] is costing you [specific loss].'",
  "primary_text_full": "MINIMUM 300 chars, TARGET 400-500 chars. MANDATORY structure: [Hook sentence] [2-3 sentences agitating the pain - make it real and specific] [Introduce solution naturally] [Proof point using provided data or qualitative if no data] [Emotional close] [CTA]. DO NOT summarize. Write the FULL narrative. Every section must be present.",
  "description": "max 30 chars — a specific benefit, result, or offer. BANNED generic phrases: 'Transform Your Body', 'Change Your Life', 'Achieve Your Goals', 'Take Control', 'Get Results'. Use what makes THIS product different (e.g. 'Only 2x/week. Built for moms.' or 'First session free.').",
  "cta": "Choose by campaign goal: AWARENESS→LEARN_MORE / CONSIDERATION→LEARN_MORE or SIGN_UP / CONVERSIONS or SALES→BOOK_NOW or GET_QUOTE (mandatory for conversion goals) / LEAD_GEN→CONTACT_US",
  "target_audience": "Detailed audience spec — include: age range + life stage/event + specific interests + behaviors. Example: 'Women 28-40, life event: new parent, interests: postpartum fitness/baby care, behaviors: engaged with fitness content, exclude: current gym members'",
  "carousel_cards": [
    {"card_headline": "Use a specific number, timeframe, or named pain — NEVER just 'Before' or 'After'. Example: '8 months postpartum' or 'Still 11 lbs over'", "card_body": "max 60 chars — specific detail from the product brief, not category description", "card_image_prompt": "English visual prompt — show THIS specific transformation/benefit, authentic real person, genuine emotion, no text overlay, mobile 1:1"},
    {"card_headline": "Specific result or turning point — Example: 'Lost 9 lbs in 3 months' or 'Energy came back'", "card_body": "max 60 chars — one concrete proof point or benefit", "card_image_prompt": "English prompt only — specific after-state scene, genuine emotion, no text"},
    {"card_headline": "Address the expansion layer objection — Example: 'Only 2x/week. Fits mom life.' or 'First session free'", "card_body": "max 60 chars — removes the biggest objection or shows the offer", "card_image_prompt": "English prompt only — specific scene showing ease/accessibility/offer, no text"}
  ],
  "image_prompt_single": "[Write a unique English image-generation prompt for THIS specific business. VISUAL GROUNDING (critical): the image MUST depict the actual product/business itself, not a generic person. For food & beverage / restaurants: show appetizing, photorealistic real food, the signature dish, or an inviting dining scene/storefront. For other businesses: show the product in authentic real-world use. BANNED: generic corporate stock imagery (people wearing call-center headsets, office handshakes, anonymous suited businesspeople) UNLESS the business literally is that. If people appear, match ethnicity to the locale and keep it natural. Include: subject + setting + lighting + mood + 'no text overlay' + aspect ratio. Do NOT copy this instruction — write a fresh custom prompt.]"
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

## ターゲット設計：コア層 vs 拡張層
広告コピーを書く前に、入力データから2つのターゲット層を頭の中で定義すること：
- **コア層**：今すぐ購入する可能性が最も高い顧客層。具体的な悩み・ライフステージ・課題認知レベルが明確。（例：「腸の衰えが気になり始め、解決策を積極的に探している40〜50代」）
- **拡張層**：同じ悩みを持ちながらまだ解決策を探していない周辺層。（例：「朝の野菜不足に罪悪感を持つ、仕事・家事・子育てに多忙な30〜40代の共働き主婦」）
primary_text_full はコア層に向けて書く。carousel_cards は拡張層にも届くよう、悩みの入口を複数用意する。

## 3C → USP → クリエイティブ の連鎖
最強のMeta広告はこの連鎖から生まれる。順番を飛ばさないこと：
1. **3Cギャップ発見**：競合の★2〜3レビューで繰り返される不満は何か？（「競合ではまだ解決されていない顧客の欲求」）
2. **USP導出**：このビジネスだけが正直に言えることは何か？（顧客ニーズ × 自社強み × 競合弱みの3つが重なる領域）
3. **クリエイティブ方向性**：USPを最初の2〜3秒の感情的インパクトに翻訳する。フックは商品説明ではなく「この商品と出会う前の顧客の日常と感情」

## キャンペーン目的別の書き方
キャンペーンの目的ステージを意識してコピーを書き分けること：
- **認知目的（TOFU）**：好奇心フック → 広く痛みを煽る → ブランドは後半。「まだ知らない人に存在を届ける」
- **検討目的（MOFU）**：具体的な解決策 → 社会的証明 → 競合との違い → CTA。「比較・検討中の人を選ばせる」
- **購入目的（BOFU）**：反論先取り → リスク除去（保証・初回トライアル）→ 背中を押すCTA。「今すぐ買う理由を作る」
入力データから推測できる場合は検討目的（MOFU）をデフォルトとして書くこと。

## ${localeInstruction}

${targetDesign}

${creativeAxisGuide}

${localBusinessGuide}

## 商品情報
業種: ${safe(industry, "小規模店舗")}
事業説明: ${safe(business_desc, "地域に根ざした小規模ビジネス")}
理想顧客: ${safe(customer_desc, "地域の一般消費者")}
最大の悩み: ${safe(main_problem, "新規顧客が増えない")}
商品/サービス: ${safe(product, "サービス全般")}
目標: ${safe(goal, "新規顧客獲得")}
${safe(proof_numbers) ? `実績・数字: ${proof_numbers}` : ""}
${safe(before_state) ? `顧客のビフォー状態: ${before_state}` : ""}
${safe(after_state) ? `顧客のアフター状態: ${after_state}` : ""}
${safe(competitor_diff) ? `競合との差別化: ${competitor_diff}` : ""}
${safe(price_or_offer) ? `価格・オファー: ${price_or_offer}` : ""}
${safe(customer_quote) ? `実際のお客様の声: 「${customer_quote}」` : ""}
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
  "headline": "40文字以内厳守。必ず数字・具体的期間・感情トリガーのいずれかを含める。禁止ワード：「〇〇の悩み」「〇〇のご案内」「〇〇サービス」「〇〇について」など商品説明・カテゴリ名のみの表現。良い例：「産後8ヶ月、体重が戻らないのは方法が違うから」「週2回で体が変わる。産後専門が伴走」",
  "primary_text_short": "125文字以内 — 最初の一言でスクロールを止める。「まだ〇〇ですか？」「〇〇している間に〇〇」など好奇心か痛みを直撃するフックのみ",
  "primary_text_full": "最低300文字・目標400〜500文字。必須構成：[フック文] [痛みを深く煽る2〜3文（具体的な状況・感情を描写）] [解決策の自然な導入] [証拠ポイント（提供データがあれば使用、なければ定性表現）] [感情的クロージング] [CTA]。要約は禁止。各セクションを省略せず完全に書き切ること。",
  "description": "30文字以内 — 変化・ベネフィットを動詞で表現（禁止：商品名のみ・カテゴリ名のみ）",
  "cta": "目標ステージで選択：認知(AWARENESS)→LEARN_MORE / 検討(CONSIDERATION)→LEARN_MORE or SIGN_UP / 購入(CONVERSIONS/SALES)→BOOK_NOW or GET_QUOTE / リード→CONTACT_US。goal=CONVERSIONSまたはSALESの場合は必ずBOOK_NOWかGET_QUOTEを使用すること",
  "target_audience": "具体的：年齢・特定の興味関心・行動・ライフイベント・職種（B2Bなら）",
  "carousel_cards": [
    {"card_headline": "40文字以内", "card_body": "60文字以内 — 1つの角度/ベネフィット。拡張層にも届く悩みの入口を複数用意する", "card_image_prompt": "English visual prompt — show THIS specific transformation or benefit, authentic real person showing genuine emotion (NOT stock photo style), no text overlay, mobile 1:1"},
    {"card_headline": "...", "card_body": "...", "card_image_prompt": "English prompt only — specific scene, emotion, no text"},
    {"card_headline": "...", "card_body": "...", "card_image_prompt": "English prompt only — specific scene, emotion, no text"}
  ],
  "image_prompt_single": "[Write a custom English image-generation prompt specific to THIS business. VISUAL GROUNDING (critical): depict the actual product/business itself, not a generic person. For 飲食店/restaurants: show appetizing photorealistic real food, the signature dish, or an inviting dining scene/storefront. For other businesses: show the product in authentic use. BANNED: generic corporate stock (call-center headset people, office handshakes, anonymous businesspeople) unless the business literally is that. If people appear, match Japanese/local ethnicity and keep it natural. Format: subject + setting + lighting + mood + 'no text overlay' + aspect ratio. Output the prompt in English. Do NOT copy this instruction — write your own unique prompt.]"
}`;

    // DeepSeek → Groq → Gemini フォールバック
    let adCopy: Record<string, unknown> | null = null;

    // 1st: Groq（無料枠・高速、8秒タイムアウト）
    if (!adCopy && process.env.GROQ_API_KEY) try {
      const groqController = new AbortController();
      const groqTimeout = setTimeout(() => groqController.abort(), 8000);
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt + hookSuffix }],
          max_tokens: 3000,
          response_format: { type: "json_object" },
        }),
        signal: groqController.signal,
      });
      clearTimeout(groqTimeout);
      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const raw = groqData.choices?.[0]?.message?.content;
        if (raw) {
          try { adCopy = JSON.parse(raw); } catch {}
        }
      }
    } catch {
      // Groq タイムアウト or エラー → Gemini へ
    }

    // 2nd: Gemini（無料枠）
    if (!adCopy && process.env.GEMINI_API_KEY) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt + hookSuffix + "\n\nRespond with valid JSON only." }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
            }),
          }
        );
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            try { adCopy = JSON.parse(match[0]); } catch {}
          }
        }
      } catch {}
    }

    // 3rd: DeepSeek（有料fallback・Prefix Cachingで入力コスト削減）
    // プロンプトをフレームワーク部(system)とPRODUCT BRIEF部(user)に分割。
    // 同じユーザー・同一ロケールの2回目以降はsystemメッセージがキャッシュヒット → コスト削減。
    if (!adCopy && process.env.DEEPSEEK_API_KEY) {
      try {
        const dsController = new AbortController();
        const dsTimeout = setTimeout(() => dsController.abort(), 20000);

        // PRODUCT BRIEF / 商品情報 の直前で分割
        const briefMarker = isEn ? "\n## PRODUCT BRIEF" : "\n## 商品情報";
        const splitIdx = prompt.lastIndexOf(briefMarker);
        const dsMessages: { role: "system" | "user"; content: string }[] =
          splitIdx > 0
            ? [
                { role: "system", content: prompt.slice(0, splitIdx).trim() },
                { role: "user",   content: prompt.slice(splitIdx).trim() },
              ]
            : [{ role: "user", content: prompt }];

        const dsRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-v4-flash",
            messages: dsMessages,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          }),
          signal: dsController.signal,
        });
        clearTimeout(dsTimeout);
        if (dsRes.ok) {
          const dsData = await dsRes.json();
          const raw = dsData.choices?.[0]?.message?.content;
          if (raw) {
            try { adCopy = JSON.parse(raw); } catch {}
          }
        }
      } catch {
        // DeepSeek タイムアウト or エラー
      }
    }

    if (!adCopy) {
      throw new Error("AI generation failed. Please try again in a few minutes.");
    }

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
