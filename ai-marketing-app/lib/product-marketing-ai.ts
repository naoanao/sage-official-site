/**
 * product-marketing-ai.ts
 * ============================================================
 * 商品をインプットすれば売って、継続して買い続けてくれるAI
 * ============================================================
 * 理論的基盤:
 *   - AISAS モデル (Attention→Interest→Search→Action→Share)
 *   - ジョブ理論 (Value Proposition / Jobs-to-be-done)
 *   - コミュニティマーケティング (ロイヤルユーザー育成)
 *   - AEO/GEO (AI検索・Perplexity・ChatGPT への上位表示)
 *   - ステップメール設計 (Day2/7/14/21)
 *   - 顧客ロイヤリティピラミッド (見込み客→ロイヤルユーザー)
 *   - ダブルファネル (購買ファネル + インフルエンスファネル)
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

export interface ProductProfile {
  name: string;           // 商品名
  category: "physical" | "digital" | "service" | "subscription"; // カテゴリ
  price: number;          // 価格（円）
  description: string;    // 商品の説明（特徴・成分・仕様など）
  target: string;         // ターゲット顧客（誰の・どんな悩みに応えるか）
  usp: string;            // 独自の強み（競合にはない価値）
  purchase_url?: string;  // 購入URL（省略可）
  industry: string;       // 業種 (restaurant / salon / ec / professional / etc.)
  social_proof?: string;   // お客様の声・実績（あれば）
  limited_offer?: string;  // 限定オファー（あれば）
  competitor_diff?: string; // 競合との違い（一言で）
}

export interface StepEmail {
  day: number;             // 何日後に送るか
  subject: string;         // 件名（4U原則: 冒頭13文字で訴求）
  purpose: string;         // 送る目的
  body: string;            // 本文（コピペ用）
}

export interface LoyaltyStage {
  stage: string;           // ステージ名
  condition: string;       // 判定条件
  action: string;          // その顧客に取るべきアクション
  message: string;         // 送るメッセージ例
}

export interface AEOBlock {
  question: string;        // Q（疑問文形式）
  answer: string;          // A（冒頭40-60文字で直接回答）
}

export interface ProductMarketingPlan {
  product: ProductProfile;

  /** AEO/GEO — AI検索（Perplexity・ChatGPT・Gemini）上位表示 */
  aeo: {
    faq_schema_jsonld: string;     // FAQPage JSON-LD（そのままHTMLに埋め込める）
    product_schema_jsonld: string; // Product JSON-LD
    qa_blocks: AEOBlock[];         // コンテンツページ用Q&Aブロック（5問）
    meta_description: string;      // AIが引用しやすい meta description
  };

  /** AISAS 販売ファネル — 商品を売る */
  funnel: {
    unique_angle: string;       // 競合が言っていない独自の切り口（CoT Step1）
    objection_rebuttal: string; // 最大の購買障壁と反論コピー（CoT Step2）
    attention: string;   // SNS投稿文（最初の3行でスクロールを止める）
    interest: string;    // ブログ冒頭・LP導入文（ストーリー×問題提起）
    search: string;      // 検索対策FAQ・比較コンテンツ
    action: string;      // セールスコピー＋CTA（購入背中押し）
    share: string;       // レビュー依頼文・UGC促進メッセージ
  };

  /** リピート購入システム — 継続して買い続けてもらう */
  retention: {
    step_emails: StepEmail[];          // ステップメール（Day2/7/14/21）
    loyalty_stages: LoyaltyStage[];    // ロイヤリティステージ設計（4段階）
    community_tactics: string[];       // コミュニティマーケ施策（3つ）
    vip_event_idea: string;            // コアファン向けイベントアイデア
    ugc_campaign: string;              // UGC（レビュー・口コミ）促進キャンペーン
  };

  strategy_note: string;  // 今回の戦略を経営者目線で説明（2文）
  week_actions: Array<{ title: string; detail: string; content_type: string; content: string; when_where?: string }>;
}

// ─────────────────────────────────────────────────────────────
// AI API 呼び出し（Groq→Gemini フォールバック）
// ─────────────────────────────────────────────────────────────

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq: API key not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini: API key not set");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// 1回分: Groq→Geminiフォールバック。空応答は失敗扱いにして上位でリトライさせる。
async function callOnce(prompt: string): Promise<string> {
  try {
    const r = await callGroq(prompt);
    if (r && r.trim()) return r;
    throw new Error("empty groq response");
  } catch {
    const r = await callGemini(prompt);
    if (r && r.trim()) return r;
    throw new Error("empty response from both providers");
  }
}

// リトライ付き呼び出し（一過性のレート制限・空応答・ネットワーク失敗に強くする）。
// 既定で最大3回（バックオフ 0.6s, 1.2s）。これで「生成に失敗しました」の頻発を防ぐ。
async function callAI(prompt: string, retries = 2): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callOnce(prompt);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ─────────────────────────────────────────────────────────────
// AEO プロンプト — AI検索上位表示コンテンツ生成
// ─────────────────────────────────────────────────────────────

function buildAEOPrompt(p: ProductProfile): string {
  return `
あなたはAEO（Answer Engine Optimization）とGEO（Generative Engine Optimization）の専門家です。
ChatGPT・Perplexity・Gemini・Google AIオーバービューなどのAI検索で引用・上位表示されるコンテンツを生成してください。

単なる商品説明の言い換えを禁止します。AI検索で実際に引用される質問と回答を設計する戦略家として、以下の思考をしてください:
- この商品を「使う前」「使っている最中」「使った後」に顧客が検索する疑問を想定し、Q5には必ず「なぜ競合ではなくこれを選ぶか」という差別化の質問を含めること
- 各回答は「競合が答えられない・答えにくい」独自の情報を含めること

【商品情報】
商品名: ${p.name}
カテゴリ: ${p.category}
価格: ${p.price}円
説明: ${p.description}
ターゲット: ${p.target}
独自の強み（USP）: ${p.usp}
${p.competitor_diff ? `競合との違い: ${p.competitor_diff}` : ""}

【AEO/GEO の原則を必ず守ること】
1. 直接回答（Direct Response）: 各答えの冒頭40-60文字で質問に直接答える
2. 数値データは【商品情報】に明示されたもののみ使用する。入力に存在しない数字・パーセント・件数・認証・受賞歴を自分で作ることは絶対禁止。数字がなければ定性表現を使う。
3. Q&A形式で情報を整理する（箇条書きより自然な一文の回答を優先）
4. 専門性（Original Expertise）: 一般論ではなくこの商品固有の知識を示す
5. 入力にない固有情報（住所・距離・営業時間・認定・資格・受賞・第三者評価）は絶対に推測・捏造しない
6. 「〜円」「〜分」「〜%」など具体的な数値は必ず商品情報内の数字のみ使用すること

【出力形式 — 必ずこのJSONのみ返すこと、コードブロック不要】
{
  "qa_blocks": [
    { "question": "Q1（購入前の疑問・検索クエリ形式）", "answer": "冒頭40-60文字で直接回答。競合が答えにくい独自情報を含める。" },
    { "question": "Q2（使い方・効果の確認）", "answer": "..." },
    { "question": "Q3（不安・リスクへの回答）", "answer": "..." },
    { "question": "Q4（価格・購入方法）", "answer": "..." },
    { "question": "Q5（なぜこの商品か・競合との違い）", "answer": "..." }
  ],
  "meta_description": "AI検索エンジンが引用しやすい150文字以内のmeta description（冒頭で直接回答・数値を含む）"
}
`.trim();
}

// AEO: JSON-LDスキーマをコードで生成（LLMに任せると二重エスケープで壊れるため）
function buildFaqSchemaJsonLd(qaBlocks: AEOBlock[]): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qaBlocks.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
      },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function buildProductSchemaJsonLd(p: ProductProfile): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
      ...(p.purchase_url ? { url: p.purchase_url } : {}),
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

// ─────────────────────────────────────────────────────────────
// AISAS 販売ファネル プロンプト
// ─────────────────────────────────────────────────────────────

function buildFunnelPrompt(p: ProductProfile): string {
  const urlInstruction = p.purchase_url
    ? `購入・申込のURLは「${p.purchase_url}」を必ず使う。`
    : "架空のURLは絶対に使わない。「詳細はDMまたはプロフィールリンクへ」と書く。";

  return `
あなたはAISASモデルに基づいた販売コンテンツの戦略家です。
単なる情報の要約・言い換えを禁止します。あなたは「売れるコピーを書く戦略家」として、以下の3ステップで思考してからコンテンツを生成してください。

【商品情報】
商品名: ${p.name}
価格: ${p.price.toLocaleString()}円
説明: ${p.description}
ターゲット: ${p.target}
独自の強み（USP）: ${p.usp}
${p.purchase_url ? `購入URL: ${p.purchase_url}` : ""}
${p.social_proof ? `お客様の声・実績: ${p.social_proof}` : ""}
${p.limited_offer ? `限定オファー: ${p.limited_offer}` : ""}
${p.competitor_diff ? `競合との違い: ${p.competitor_diff}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — 競合分析（何を「言わない」かを決める）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
この業種・カテゴリの競合が「必ず言うこと」を想定してください（価格訴求・スペック羅列・一般的なベネフィット等）。
次に、競合が「言っていないこと」「言えないこと」を1つ特定してください。
→ これを「unique_angle」（独自の切り口）として全コンテンツに貫いてください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — 購買障壁の特定と反論コピー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このターゲット顧客が購入をためらう「最大の1つの理由」を特定してください（価格・効果への不安・タイミング・競合比較等）。
次に、その不安を正面から解消する反論コピーを書いてください（入力された数値・実績・保証を使い、推測は禁止）。
→ これを「objection_rebuttal」として、特に「action」フェーズのコピーに組み込んでください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — コンテンツ生成（STEP 1・2の分析を反映すること）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【ルール】
- Markdown記号（**、##など）は一切使わない。プレーンテキストのみ
- 専門用語・フレームワーク名は使わない
- 標準的な日本語・丁寧語を使う
- 「〜することができます」「〜となっています」などの弱い表現を禁止。「〜できます」「〜です」と言い切る
- 各フェーズの末尾に必ず明確なCTA（行動喚起）を入れる
- ${urlInstruction}
- 入力フォームにない固有情報（住所・駅からの距離・営業時間・スタッフ数など）は絶対に推測・出力しない
- ツール名・サービス名・会社名などの固有名詞は入力情報に含まれない限り使わない
- 入力情報に価格がない場合、具体的な金額・価格帯を推測して出力しない
- 【架空商品禁止】contentに登場する商品名・成分名・コース名は入力情報に明記されたものだけを使う。入力にない新商品・新成分・新コース・新メニューを「追加」「新発売」「スタート」として生成することを禁止する

【ジョブ理論を意識すること】
- 顧客は「機能」ではなく「用事（ジョブ）を片付けたい」から買う
- Gains（得られるもの）とPains（取り除かれる悩み）を必ず含める

【出力形式 — 必ずこのJSONのみ返すこと、コードブロック不要】
{
  "unique_angle": "STEP1で特定した独自の切り口（競合が言っていないこと・1文）",
  "objection_rebuttal": "STEP2で特定した最大の購買障壁と、それを解消する反論コピー（2文以内）",
  "attention": "SNS投稿文。最初の3行でスクロールを止める冒頭。Instagram向け、3〜5文＋ハッシュタグ5〜8個",
  "interest": "ブログ冒頭またはLP導入文（300文字以内）。ストーリー×問題提起×共感の順",
  "search": "検索で来た人向けのFAQ比較コンテンツ（200文字以内）。unique_angleを軸に他社との違いを明確に",
  "action": "購入を促すセールスコピー（200文字以内）。objection_rebutalで障壁を解消し、限定感・ベネフィット明示＋CTA",
  "share": "購入後に送るレビュー依頼文（150文字以内）。自然に口コミを促す温かいメッセージ"
}
`.trim();
}

// ─────────────────────────────────────────────────────────────
// リピート購入システム プロンプト
// ─────────────────────────────────────────────────────────────

function buildRetentionPrompt(p: ProductProfile): string {
  return `
あなたはEC・通販のリピート購入専門コンサルタントです。
以下の商品を「継続して買い続けてもらう」ための完全なリテンションシステムを設計してください。

【商品情報】
商品名: ${p.name}
カテゴリ: ${p.category}
価格: ${p.price.toLocaleString()}円
説明: ${p.description}
ターゲット: ${p.target}
独自の強み: ${p.usp}
${p.purchase_url ? `購入URL: ${p.purchase_url}` : ""}

【設計の理論的基盤（必ず反映すること）】

■ リピートが重要な理由（数値で語ること）
- パレートの法則: 2割の顧客が8割の売上を担う
- 5:25の法則: 既存顧客5%増→利益25%改善
- 3回購入モデル: 初回赤字→2回損益分岐→3回黒字化
- 初回→2回目の橋渡しが最重要（2回目購入時に7割が離脱）

■ ステップメール設計原則
- Day2（到着確認）: 感謝と使い方ガイド
- Day7（体験確認）: 効果の確認・活用事例の提供
- Day14（声の収集）: 率直な感想・口コミ依頼
- Day21（リピート喚起）: 限定特典付きの再購入促進
- 件名は4Uの原則: 冒頭13文字以内に訴求内容を入れる

■ 顧客ロイヤリティピラミッド（4ステージ）
見込み客 → 顧客（初回購入）→ 得意客（2〜3回）→ ロイヤルユーザー（4回以上）

■ コミュニティマーケティング施策
- ファンとの1on1インタビュー（N1ニーズ把握）
- 限定イベント・先行案内（特別感演出）
- UGC促進（ファンが発信→新規認知→循環）

【ルール】
- Markdown記号は一切使わない。プレーンテキストのみ
- メール件名は必ず13文字以内
- 本文は「コピペしてすぐ使える」完成文を書く
- 自然な日本語・丁寧語のみ使う
- 入力情報にない固有情報（住所・電話番号など）は推測しない。商品情報のみから内容を作成する
- ツール名・サービス名・会社名などの固有名詞は入力情報に含まれない限り使わない。必要な場合は一般名詞＋代表例形式に限定する
- 入力情報に価格がない場合、具体的な金額・価格帯の数値を推測して出力しない

【出力形式 — 必ずこのJSONのみ返すこと、コードブロック不要】
{
  "step_emails": [
    {
      "day": 2,
      "subject": "件名（13文字以内）",
      "purpose": "送る目的を1文で",
      "body": "本文（コピペ用・完成文。感謝→使い方ガイド→次のステップ誘導の順）"
    },
    { "day": 7, "subject": "...", "purpose": "...", "body": "..." },
    { "day": 14, "subject": "...", "purpose": "...", "body": "..." },
    { "day": 21, "subject": "...", "purpose": "...", "body": "..." }
  ],
  "loyalty_stages": [
    {
      "stage": "顧客（初回購入後）",
      "condition": "初回購入から14日以内",
      "action": "取るべきアクション",
      "message": "送るメッセージ例（コピペ用）"
    },
    { "stage": "得意客（2〜3回購入）", "condition": "...", "action": "...", "message": "..." },
    { "stage": "ロイヤルユーザー（4回以上）", "condition": "...", "action": "...", "message": "..." },
    { "stage": "離脱予備軍", "condition": "最終購入から60日以上経過", "action": "...", "message": "..." }
  ],
  "community_tactics": [
    "施策1（具体的な行動レベルで記述）",
    "施策2",
    "施策3"
  ],
  "vip_event_idea": "コアファン限定イベントのアイデア（ヤッホーブルーイングの超宴のような体験型企画）",
  "ugc_campaign": "UGC（レビュー・口コミ・SNS投稿）を促進するキャンペーン案（コピペ用告知文付き）"
}
`.trim();
}

// ─────────────────────────────────────────────────────────────
// 今週のアクション（商品特化版）
// ─────────────────────────────────────────────────────────────

function buildWeekActionsPrompt(p: ProductProfile): string {
  const urlInstruction = p.purchase_url
    ? `予約・購入のURLは必ず「${p.purchase_url}」を使う。`
    : "架空のURLは絶対に使わない。URLが必要な場合は「詳細はDMまたはプロフィールリンクへ」と書く。";

  return `
あなたは優秀なマーケティング部長です。単なる情報の要約・言い換えを禁止します。
以下の思考ステップを踏んでから、今週やること3つを生成してください。

【商品情報】
商品名: ${p.name}
カテゴリ: ${p.category}
価格: ${p.price.toLocaleString()}円
説明: ${p.description}
ターゲット: ${p.target}
独自の強み（USP）: ${p.usp}
業種: ${p.industry}
${p.competitor_diff ? `競合との違い: ${p.competitor_diff}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — 競合分析（独自の切り口を発見する）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
この業種の競合が典型的に言うこと（価格・機能・一般的なメリット）を想定し、
競合が「言っていない・言えない」独自の角度を1つ特定してください。
→ この角度を「共感獲得」アクションのcontentに反映してください。

STEP 2 — 購買障壁の特定（今週の背中を押す）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このターゲットが購入をためらう最大の理由を1つ特定し、
入力情報（実績・数値・保証）を使って直接解消するコピーを考えてください。
→ この反論コピーを「行動促進」アクションのcontentに必ず組み込んでください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【3つのアクションの役割（必ず異なる役割で生成すること）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- actions[0] の role: 「共感獲得」— ターゲットが「そうそう、その悩みわかる」と感じる共感型コンテンツ（STEP1の独自角度を使う）
- actions[1] の role: 「行動促進」— 今すぐ購入・問い合わせを促すCTA型コンテンツ（STEP2の反論コピーを入れる）
- actions[2] の role: 「信頼構築」— 実績・お客様の声・専門性を証拠として示す信頼型コンテンツ

【絶対ルール】
- Markdown記号は一切使わない。プレーンテキストのみ
- アクションの数は必ずちょうど3つ
- フレームワーク名・専門用語は絶対に使わない
- titleは15文字以内の「〜する」形式
- detailはそのアクションの目的を説明する一文（60文字以内）
- content_typeの選択肢: Instagram投稿文、LINE配信文、Googleレビュー返信文、商品紹介文、メール文、告知文
- contentはお客さんに直接届けるコピペ用の完成文章（ビジネスオーナーへのアドバイスは書かない）
- when_whereは「どこに・いつ投稿・送信するか」を具体的に書く（例: Instagramに火・木・土の19時に投稿）
- ${urlInstruction}
- 入力フォームにない固有情報（住所・営業時間・スタッフ数など）は絶対に推測・出力しない
- 入力情報に価格がない場合、具体的な金額・価格帯の数値を推測して出力しない
- 【架空商品禁止】contentに登場する商品名・成分名・コース名・メニュー名は入力情報に明記されたものだけを使う。「〇〇を新たに追加」「〇〇を新発売」のような形で入力にない商品を告知することを禁止する

【出力形式 — JSONのみ、コードブロック不要】
{"strategy_note":"理由2文以内","actions":[{"role":"共感獲得","title":"15文字以内","detail":"60文字以内","content_type":"...","when_where":"例: Instagramに月・水・金の19時に投稿","content":"コピペ用完成文章"},{"role":"行動促進","title":"...","detail":"...","content_type":"...","content":"..."},{"role":"信頼構築","title":"...","detail":"...","content_type":"...","content":"..."}]}
`.trim();
}

// ─────────────────────────────────────────────────────────────
// JSON パーサー（堅牢版）
// ─────────────────────────────────────────────────────────────

function parseJSON<T>(text: string, section = "不明"): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`AI応答からJSONが見つかりませんでした（${section}）。時間をおいて再試行してください。`);
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    throw new Error(`AI応答の解析に失敗しました（${section}）。少し時間をおいてから再試行してください。`);
  }
}

// ─────────────────────────────────────────────────────────────
// メイン関数 — 商品マーケティングプラン生成
// ─────────────────────────────────────────────────────────────

export async function generateProductMarketingPlan(
  product: ProductProfile
): Promise<ProductMarketingPlan> {
  // 4つのプロンプトを並列実行（速度最適化）
  const [aeoResult, funnelResult, retentionResult, weekResult] = await Promise.allSettled([
    callAI(buildAEOPrompt(product)),
    callAI(buildFunnelPrompt(product)),
    callAI(buildRetentionPrompt(product)),
    callAI(buildWeekActionsPrompt(product)),
  ]);

  // 各セクションを個別にパース（1つ失敗しても他は表示できる）
  const getRaw = (result: PromiseSettledResult<string>, section: string): string => {
    if (result.status === "rejected") throw new Error(`${section}の生成に失敗しました。時間をおいて再試行してください。`);
    return result.value;
  };

  // AEO: qa_blocks + meta_description のみLLMに任せ、JSON-LDはコードで生成
  const aeoRaw = getRaw(aeoResult, "AI検索対策");
  const aeoBase = parseJSON<{
    qa_blocks: AEOBlock[];
    meta_description: string;
  }>(aeoRaw, "AI検索対策");

  // ハルシネーション検知: 入力データに含まれない数字が生成されていないか検証
  const inputFacts = [
    String(product.price), product.description, product.usp,
    product.social_proof || "", product.competitor_diff || "", product.target,
  ].join(" ");
  const aeoText = (aeoBase.qa_blocks ?? []).map((qa) => qa.answer).join(" ")
    + " " + (aeoBase.meta_description ?? "");
  const numbersInAEO = aeoText.match(/\d+[%万円名社人ヶ月日週時間]+|\d{2,}/g) || [];
  const suspiciousAEONumbers = [...new Set(numbersInAEO)].filter((n) => {
    // 数字部分だけ（単位なし）でも入力に含まれていれば正当な数字とみなす
    const digitsOnly = n.replace(/[^\d]/g, "");
    return !inputFacts.includes(n) && !inputFacts.includes(digitsOnly);
  });
  const aeoWarnings = suspiciousAEONumbers.map(
    (n) => `「${n}」は入力情報にありません。公開前に事実確認してください`
  );

  const aeoData = {
    faq_schema_jsonld: buildFaqSchemaJsonLd(aeoBase.qa_blocks ?? []),
    product_schema_jsonld: buildProductSchemaJsonLd(product),
    qa_blocks: aeoBase.qa_blocks ?? [],
    meta_description: aeoBase.meta_description ?? "",
    warnings: aeoWarnings,
  };

  const funnelData = parseJSON<{
    unique_angle: string;
    objection_rebuttal: string;
    attention: string;
    interest: string;
    search: string;
    action: string;
    share: string;
  }>(getRaw(funnelResult, "販売ファネル"), "販売ファネル");

  const retentionData = parseJSON<{
    step_emails: StepEmail[];
    loyalty_stages: LoyaltyStage[];
    community_tactics: string[];
    vip_event_idea: string;
    ugc_campaign: string;
  }>(getRaw(retentionResult, "リピート施策"), "リピート施策");

  const weekData = parseJSON<{
    strategy_note: string;
    actions: Array<{ title: string; detail: string; content_type: string; content: string; when_where?: string }>;
  }>(getRaw(weekResult, "今週のアクション"), "今週のアクション");

  return {
    product,
    aeo: aeoData,
    funnel: funnelData,
    retention: retentionData,
    strategy_note: weekData.strategy_note,
    week_actions: weekData.actions,
  };
}

// ─────────────────────────────────────────────────────────────
// ユーティリティ — ロイヤリティステージ判定
// ─────────────────────────────────────────────────────────────

export function detectLoyaltyStage(
  purchaseCount: number,
  daysSinceLastPurchase: number
): "prospect" | "customer" | "regular" | "loyal" | "at_risk" {
  if (purchaseCount === 0) return "prospect";
  if (daysSinceLastPurchase >= 60) return "at_risk";
  if (purchaseCount >= 4) return "loyal";
  if (purchaseCount >= 2) return "regular";
  return "customer";
}

// ─────────────────────────────────────────────────────────────
// ユーティリティ — AEO JSON-LD スキーマ生成（静的）
// ─────────────────────────────────────────────────────────────

export function buildProductSchemaStatic(p: ProductProfile): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
      url: p.purchase_url ?? "",
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}
