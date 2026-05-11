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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAI(prompt: string): Promise<string> {
  try {
    return await callGroq(prompt);
  } catch {
    return await callGemini(prompt);
  }
}

// ─────────────────────────────────────────────────────────────
// AEO プロンプト — AI検索上位表示コンテンツ生成
// ─────────────────────────────────────────────────────────────

function buildAEOPrompt(p: ProductProfile): string {
  const urlLine = p.purchase_url ? `購入URL: ${p.purchase_url}` : "";
  return `
あなたはAEO（Answer Engine Optimization）とGEO（Generative Engine Optimization）の専門家です。
ChatGPT・Perplexity・Gemini・Google AIオーバービューなどのAI検索で引用・上位表示されるコンテンツを生成してください。

【商品情報】
商品名: ${p.name}
カテゴリ: ${p.category}
価格: ${p.price}円
説明: ${p.description}
ターゲット: ${p.target}
独自の強み（USP）: ${p.usp}
${urlLine}

【AEO/GEO の7大原則を必ず守ること】
1. 直接回答（Direct Response）: 各答えの冒頭40-60文字で質問に直接答える
2. 数値データ（Numerical Data）: 具体的な数字・パーセント・期間を含める
3. 構造化（Extractable Structure）: Q&A形式で情報を整理する
4. 専門性（Original Expertise）: 一般論ではなくこの商品固有の知識を示す
5. 引用しやすさ: 箇条書きより自然な一文の回答を優先する
6. フレッシュネス: 「2026年現在」など時事性を示す表現を入れる
7. FAQSchema対応: JSON-LD形式でマークアップできる構造にする
8. 入力情報にない固有情報（住所・跻離・営業時間など）は推測しない。商品情報のみから断言する

【出力形式 — 必ずこのJSONのみ返すこと、コードブロック不要】
{
  "faq_schema_jsonld": "<script type=\\"application/ld+json\\">{ \\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"FAQPage\\", \\"mainEntity\\": [{各QAをここに}] }</script>",
  "product_schema_jsonld": "<script type=\\"application/ld+json\\">{ \\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"Product\\", ...商品情報 }</script>",
  "qa_blocks": [
    { "question": "Q1（疑問文・検索クエリ形式）", "answer": "冒頭40-60文字で直接回答。その後補足説明。" },
    { "question": "Q2", "answer": "..." },
    { "question": "Q3", "answer": "..." },
    { "question": "Q4（価格・購入方法）", "answer": "..." },
    { "question": "Q5（他社との違い・なぜこれを選ぶか）", "answer": "..." }
  ],
  "meta_description": "AI検索エンジンが引用しやすい150文字以内のmeta description"
}
`.trim();
}

// ─────────────────────────────────────────────────────────────
// AISAS 販売ファネル プロンプト
// ─────────────────────────────────────────────────────────────

function buildFunnelPrompt(p: ProductProfile): string {
  const urlInstruction = p.purchase_url
    ? `購入・申込のURLは「${p.purchase_url}」を必ず使う。`
    : "架空のURLは絶対に使わない。「詳細はDMまたはプロフィールリンクへ」と書く。";

  return `
あなたはAISASモデルに基づいたマーケングコンテンツの「フォーマッター」です。
【重要】以下の「商品情報」に記載されたファクトのみを使い、AISASファーズのコンテンツに変換してください。
商品情報にないデータを追加するのではなく、提供されたファクトを説得力のある文章に変換するまでがあなたの仕事です。

【商品情報】
商品名: ${p.name}
価格: ${p.price.toLocaleString()}円
説明: ${p.description}
ターゲット: ${p.target}
独自の強み: ${p.usp}
${p.purchase_url ? `購入URL: ${p.purchase_url}` : ""}
${p.social_proof ? `お客様の声・実績: ${p.social_proof}` : ""}
${p.limited_offer ? `限定オファー: ${p.limited_offer}` : ""}
${p.competitor_diff ? `競合との違い: ${p.competitor_diff}` : ""}

【ルール】
- Markdown記号（**、##など）は一切使わない。プレーンテキストのみ
- 専門用語・フレームワーク名は使わない
- 標準的な日本語・丁寧語を使う
- 「〜することができます」「〜となっています」などの弱い表現を禁止。「〜できます」「〜です」と言い切る
- 各ファースの末尾に必ず明確なCTA（行動喚起）を入れる
- ${urlInstruction}
- 入力フォームにない固有情報（住所・駅からの跻離・営業時間・スタッフ数など）は絶対に推測・出力しない。不明な情報は省く
- ツール名・サービス名・会社名などの固有名詞は入力情報に含まれない限り使わない。必要な場合は「クラウド会計ソフト（freee / マネーフォワード等）」のように一般名詞＋代表例形式に限定する
- 入力情報に価格がない場合、具体的な金額・価格帯の数値を推測して出力しない

【POMモデル（口コミ最強の原則）を意識すること】
- 人は口コミ（Other）を最も信頼する（NTTコムリサーチ: 口コミで購買決定68%）
- 企業発信（Marketer）より体験談・数値・証拠を前に出す
- Shareフェーズで次の顧客の認知（Attention）を生む循環を設計する

【ジョブ理論（Value Proposition）を意識すること】
- 顧客はこの商品の「機能」ではなく「用事（ジョブ）を片付けたい」から買う
- ジョブ = ターゲット顧客が本当に解決したい課題・得たい状態
- Gains（得られるもの）とPains（取り除かれる悩み）を必ず含める

【出力形式 — 必ずこのJSONのみ返すこと、コードブロック不要】
{
  "attention": "SNS投稿文（最初の3行でスクロールを止める）。Instagram向け、3〜5文＋ハッシュタグ5〜8個",
  "interest": "ブログ記事冒頭またはLP導入文（300文字以内）。ストーリー×問題提起×共感の順",
  "search": "検索で来た人向けのFAQ比較コンテンツ（200文字以内）。他社との違いと選ばれる理由を明確に",
  "action": "購入を促すセールスコピー（200文字以内）。限定感・緊急性・ベネフィット明示＋CTA",
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
あなたは優秀なマーケティング部長です。
【重要】以下の「商品情報」に記載されたファクトのみを使って、今週やるこ3つを生成してください。
ファクトにない情報を創作・追加することは禁止です。提供データをコンテンツに変換するのがあなたの役割です。

【商品情報】
商品名: ${p.name}
カテゴリ: ${p.category}
価格: ${p.price.toLocaleString()}円
説明: ${p.description}
ターゲット: ${p.target}
独自の強み: ${p.usp}
業種: ${p.industry}

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
- 入力フォームにない固有情報（住所・駅からの跻離・営業時間・スタッフ数など）は絶対に推測・出力しない。不明な情報は省く
- ツール名・サービス名・会社名などの固有名詞は入力情報に含まれない限り使わない。必要な場合は一般名詞＋代表例形式に限定する
- 入力情報に価格がない場合、具体的な金額・価格帯の数値を推測して出力しない

【出力形式 — JSONのみ、コードブロック不要】
{"strategy_note":"理由2文以内","actions":[{"title":"15文字以内","detail":"60文字以内","content_type":"...","when_where":"例: Instagramに月・水・釓19時に投稿","content":"コピペ用完成文章"},{"title":"...","detail":"...","content_type":"...","content":"..."},{"title":"...","detail":"...","content_type":"...","content":"..."}]}
`.trim();
}

// ─────────────────────────────────────────────────────────────
// JSON パーサー（堅牢版）
// ─────────────────────────────────────────────────────────────

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON not found in response");
  return JSON.parse(match[0]) as T;
}

// ─────────────────────────────────────────────────────────────
// メイン関数 — 商品マーケティングプラン生成
// ─────────────────────────────────────────────────────────────

export async function generateProductMarketingPlan(
  product: ProductProfile
): Promise<ProductMarketingPlan> {
  // 3つのプロンプトを並列実行（速度最適化）
  const [aeoRaw, funnelRaw, retentionRaw, weekRaw] = await Promise.all([
    callAI(buildAEOPrompt(product)),
    callAI(buildFunnelPrompt(product)),
    callAI(buildRetentionPrompt(product)),
    callAI(buildWeekActionsPrompt(product)),
  ]);

  // パース
  const aeoData = parseJSON<{
    faq_schema_jsonld: string;
    product_schema_jsonld: string;
    qa_blocks: AEOBlock[];
    meta_description: string;
  }>(aeoRaw);

  const funnelData = parseJSON<{
    attention: string;
    interest: string;
    search: string;
    action: string;
    share: string;
  }>(funnelRaw);

  const retentionData = parseJSON<{
    step_emails: StepEmail[];
    loyalty_stages: LoyaltyStage[];
    community_tactics: string[];
    vip_event_idea: string;
    ugc_campaign: string;
  }>(retentionRaw);

  const weekData = parseJSON<{
    strategy_note: string;
    actions: Array<{ title: string; detail: string; content_type: string; content: string; when_where?: string }>;
  }>(weekRaw);

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
