export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────
// 業種別コンテキスト
// ────────────────────────────────────────────
const INDUSTRY_CONTEXTS: Record<string, string> = {
  restaurant:
    "飲食店として分析する。食材コスト・客単価・ランチ/夜の集客差・SNS映え・口コミ・季節メニューの視点を重視すること。",
  salon:
    "美容サロンとして分析する。技術差別化・リピート率・予約導線・Instagram集客・指名客の獲得・ビフォーアフターの見せ方を重視すること。",
  ec: "EC・通販として分析する。商品訴求・購入導線・カゴ落ち対策・レビュー活用・SNS集客・プレゼント需要・季節需要を重視すること。",
  professional:
    "士業・コンサルとして分析する。専門性の可視化・信頼構築・問い合わせ導線・SEO・メディア露出・紹介循環の仕組みを重視すること。",
  construction:
    "工務店・建設業として分析する。地域密着・施工実績の見せ方・口コミ・リフォーム需要・季節メンテナンス需要・チラシ効果を重視すること。",
};

function getIndustryContext(industry?: string): string {
  if (!industry) return "";
  return INDUSTRY_CONTEXTS[industry] ?? "";
}

function getPriceContext(price?: string): string {
  if (!price) return "";
  return `価格帯・客単価: ${price}（この価格帯を前提に、ターゲット顧客の購買心理・競合との価格戦略・高単価または低単価ならではのリスクと戦略を分析すること）`;
}

function getSiteContext(siteContent?: string): string {
  if (!siteContent) return "";
  return `【Webサイトから読み取った実際の情報（これを最優先で分析に使うこと）】
${siteContent}
（上記はWebサイトから自動取得したテキストです。この実際の情報を手がかりに、より具体的・精度の高い分析を行ってください）`;
}

// ────────────────────────────────────────────
// 共通ルール（全プロンプト先頭に挿入）
// ────────────────────────────────────────────
const COMMON_RULES = `
━━ あなたの役割と思考の軸 ━━
あなたはDavid Ogilvy・神田昌典・Philip Kotlerの思想を血肉とした、日本の個人・零細事業主専門の世界トップクラスのマーケティングストラテジストだ。

【思考の鉄則 — Ogilvy】
「誰でも言えること」は分析ではない。
競合が気づいていない、またはこの事業者にしか使えない「独自の勝ち筋」を発掘することがあなたの仕事だ。
一般論・教科書的な回答を禁止する。この事業者の具体的な情報から、「他の誰の分析とも違う答え」を導け。

【インサイトと行動の品質基準】
- insightは「2文で経営者の行動が変わる」レベルの洞察のみ。「〜が重要です」という一般論は禁止
- actionsは「スマホ一台・今週中・30分以内・費用ゼロ」で完結できる具体的な行動のみ。「SNSを活用する」「ターゲットを明確にする」レベルの曖昧な行動は禁止

【絶対ルール】
- Markdown記号（**、##、___、\`など）は一切使わず、プレーンテキストのみで出力すること
- 出力はJSONのみ。説明文・コードブロック・前置きは一切不要
`;

// ────────────────────────────────────────────
// Webサイト内容取得（失敗しても分析は続行）
// ────────────────────────────────────────────
async function fetchSiteContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrowlBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return "";

    const html = await res.text();

    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    return stripped.slice(0, 2000);
  } catch {
    return "";
  }
}

// ────────────────────────────────────────────
// プロンプト定義
// ────────────────────────────────────────────
interface CompanyInfo {
  name: string;
  product: string;
  target: string;
  url?: string;
  siteContent?: string;
  industry?: string;
  price?: string;
}

const FRAMEWORK_PROMPTS: Record<string, (c: CompanyInfo) => string> = {
  pest: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のPEST分析を日本語で行ってください。
${COMMON_RULES}
【重要】この分析はAIの学習データ（2025年5月時点）に基づきます。特にP（政治・法規制）とE（経済）の項目は現在の状況と異なる可能性があるため、実務では必ず最新情報を確認すること。

【PEST分類の厳守ルール（混入禁止）】
- P（政治・法規制）: 法律改正・規制強化/緩和・補助金・行政指導・政策・税制のみ。消費者意識・健康トレンド・ライフスタイル変化はPに絶対含めない
- E（経済・市場動向）: GDP・物価指数・インフレ・金利・為替・賃金動向・業界全体の売上規模（円）・競合の価格戦略のみ。「消費者の需要増加」「ニーズの高まり」「〜への関心の高まり」「〜意識の向上」という表現は全てS（社会）に分類すること。Eは「数値で表せる経済指標」だけに限定する
- S（社会・消費者トレンド）: 消費者の意識・需要・ニーズの変化、ライフスタイル、人口動態、健康志向、食トレンド、環境意識、社会的価値観はすべてここ。「〜への需要増加」「〜ニーズの高まり」は必ずSに入れる
- T（技術・AI）: テクノロジー革新・DX・AI・デジタル化・SNSプラットフォームの変化のみ

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent)}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "PEST分析",
  "why": "PEST分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "P（政治・法規制）": ["この業種に直接影響する法規制・補助金・規制緩和の具体的な動向1", "同2", "同3"],
    "E（経済・市場動向）": ["この業種の価格帯・客層に影響する経済・市場トレンド1", "同2", "同3"],
    "S（社会・消費者トレンド）": ["ターゲット顧客の行動変化・価値観・健康意識・ライフスタイルの変化1", "同2", "同3"],
    "T（技術・AI）": ["この業種で今すぐ使えるテクノロジー・AIツール1", "同2", "同3"]
  },
  "insight": "このビジネスが今すぐ取るべき具体的な一手（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  "3c": (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社の3C分析を日本語で行ってください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "3C分析",
  "why": "3C分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Customer（顧客・市場）": ["このターゲット顧客が本当に求めていること1", "購買の決め手となる感情・動機2", "購買を妨げている不安・障壁3"],
    "Competitor（競合）": ["同業の最大の強み1", "同業が手を抜いている弱み2", "ここで差別化できるポイント3"],
    "Company（自社）": ["今すぐ活かせる自社の最大の強み1", "他社に真似されにくい独自資源2", "正直に認めるべき改善すべき課題3"]
  },
  "insight": "3Cから見えてくる自社の勝ち筋（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  swot: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のSWOT分析を日本語で行ってください。
2026年現在の市場環境（AI技術の普及・物価高騰・人口減少・高齢化・Z世代消費行動・SNSマーケティングの変化）を反映してください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "SWOT分析",
  "why": "SWOT分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Strength（強み）": ["競合に真似されにくい自社独自の強み1", "同2", "同3"],
    "Weakness（弱み）": ["正直に認めるべき自社の弱み1", "同2", "同3"],
    "Opportunity（機会）": ["2026年の市場変化でこのビジネスに生まれたチャンス1", "同2", "同3"],
    "Threat（脅威）": ["このビジネスを脅かす外部リスク1", "同2", "同3"]
  },
  "insight": "強みで機会を活かすSO戦略の具体的な一手（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  stp: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のSTP分析を日本語で行ってください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "STP分析",
  "why": "STP分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Segmentation（市場細分化）": ["最も有望なセグメント軸1（年齢・価値観・行動など）", "同2", "各セグメントの規模感と特徴3"],
    "Targeting（ターゲット選定）": ["今すぐ狙うべき最優先セグメント1", "そのセグメントを選ぶ具体的な理由2", "このセグメントの市場規模の見立て3"],
    "Positioning（ポジション）": ["競合との明確な差別化軸1", "自社だけが伝えられる独自のポジション2", "このターゲットに刺さるキャッチコピーの方向性3"]
  },
  "insight": "このSTPに基づく最も効果的なマーケティングメッセージの核心（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  "4p": (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社の4P/4C分析を日本語で行ってください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "4P / 4C分析",
  "why": "4P/4C分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Product / 顧客価値": ["このターゲットが本当に買っているもの（機能ではなく感情・体験）1", "差別化できる特徴・こだわり2", "顧客が得るベネフィットを一言で3"],
    "Price / 顧客コスト": ["${c.price ? `入力された価格帯（${c.price}）の妥当性と根拠` : "最適な価格帯と根拠"}1", "価格設定戦略（プレミアム/コスト競争/バンドルなど）2", "顧客が感じる心理的コストを下げる工夫3"],
    "Place / 利便性": ["最適な販売・接点チャネル1", "顧客が購入するまでの導線設計2", "アクセスしやすさを高める具体策3"],
    "Promotion / コミュニケーション": ["今すぐ始められる最優先のプロモーション施策1", "SNS・コンテンツ戦略の具体案2", "口コミ・紹介を自然に生む仕掛け3"]
  },
  "insight": "最初に着手すべきPと今週の具体的なアクション（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  vrio: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のVRIO分析を日本語で行ってください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "VRIO分析",
  "why": "VRIO分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Value（経済価値）": ["顧客の課題を解決している自社の強み1", "それが利益につながる具体的な理由2", "競合に対して優位に立てるポイント3"],
    "Rarity（希少性）": ["競合が持っていない希少な強み・ノウハウ1", "参入障壁となる技術・関係性・経験2", "この業界で珍しい自社の特徴3"],
    "Imitability（模倣困難性）": ["競合が真似するのが難しい理由1", "コストや時間がかかりすぎる要素2", "ブランド・信頼・コミュニティの強み3"],
    "Organization（組織活用）": ["この強みを最大限に活かせている体制1", "強みを活かしきれていない改善余地2", "次の6ヶ月でやるべきこと3"]
  },
  "insight": "持続的競争優位を生む最大の強みとその磨き方（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  aeo: (c) => `あなたはプロのデジタルマーケティングストラテジストです。2026年のAI検索時代に向けた以下の会社のAEO（AI検索最適化）戦略を日本語で立案してください。
${COMMON_RULES}
AEOとは：ChatGPT・Perplexity・Google AI Overviewsなどの「回答生成AI」に自社ブランドが「最適解」として引用・推薦されるための戦略です。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "AEO（AI検索最適化）戦略",
  "why": "2026年にAEOが重要な理由（1文、プレーンテキスト）",
  "items": {
    "AI Visibility Audit": ["ChatGPT/Geminiに自社ブランドを質問して現状把握する方法1", "競合との比較調査の具体的なやり方2", "今すぐ改善すべき情報発信のギャップ3"],
    "Answer-first コンテンツ": ["AIが引用しやすいコンテンツ構造（結論先行・FAQ形式）1", "50〜70文字で答えられる頻出質問の洗い出し方2", "このビジネスに最適な「答え方」の具体例3"],
    "E-E-A-T（権威性）": ["この業種でAIに信頼される専門家としての証明方法1", "一次情報・独自データを作る現実的な手段2", "メディア掲載・引用獲得の具体的な第一歩3"],
    "LLM Citation戦略": ["AIに引用されるための情報発信の優先順位1", "スマホで今日から実装できる構造化情報の整理法2", "SNSでのブランド言及を増やす口コミ設計3"]
  },
  "insight": "最初の1ヶ月でAI検索に引用されるために最優先でやること（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なAEOアクション1", "同2", "同3"]
}`,

  ulssas: (c) => `あなたはプロのSNSマーケティングストラテジストです。以下の会社のULSSAS分析（SNS時代の購買モデル）を日本語で行ってください。
${COMMON_RULES}
ULSSASとは：UGC→Like→Search1（SNS検索）→Search2（指名検索）→Action→Spreadの拡散サイクルです。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "ULSSAS分析",
  "why": "SNS時代にULSSASが重要な理由（1文、プレーンテキスト）",
  "items": {
    "UGC（ユーザー生成コンテンツ）": ["このビジネスでお客さんが投稿したくなる具体的な瞬間・仕掛け1", "投稿を促すシンプルな声かけやキャンペーン案2", "このビジネスに合った最適なハッシュタグ戦略3"],
    "Like & Search1（SNS検索対策）": ["いいねを集めるコンテンツの工夫（業種に合った具体例）1", "SNS検索で見つかるキーワード・ハッシュタグ設計2", "フォロワーのエンゲージメントを高める投稿パターン3"],
    "Search2（指名検索・Google）": ["ブランド名で検索されるきっかけを作る仕掛け1", "SEO対策の最優先施策（今週から始められること）2", "オフライン・口コミで指名検索を増やす方法3"],
    "Action & Spread（購買・拡散）": ["SNSから購入・予約への最短導線設計1", "リピーターが自然に口コミを広げる仕掛け2", "紹介・シェアを促すインセンティブの具体案3"]
  },
  "insight": "このビジネスで最も拡散が起きやすいUGCシナリオと最初の一手（2文、プレーンテキスト）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`
};

// ────────────────────────────────────────────
// AI呼び出し
// ────────────────────────────────────────────
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
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
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────
// ハンドラ
// ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, product, target, url, framework, industry, price } = body;

    if (!name || !product || !target || !framework) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    const promptFn = FRAMEWORK_PROMPTS[framework];
    if (!promptFn) {
      return NextResponse.json({ error: "不明なフレームワークです" }, { status: 400 });
    }

    // URLがあれば実際にサイトを取得（失敗しても分析は続行）
    const siteContent = url ? await fetchSiteContent(url) : "";

    const prompt = promptFn({ name, product, target, url, siteContent, industry, price });

    // Gemini → Groq フォールバック
    let raw = await callGemini(prompt);
    if (!raw) raw = await callGroq(prompt);
    if (!raw) {
      return NextResponse.json({ error: "AI生成に失敗しました。時間をおいて再試行してください。" }, { status: 500 });
    }

    // JSON抽出
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "レスポンスの解析に失敗しました" }, { status: 500 });
    }

    const result = JSON.parse(match[0]);
    return NextResponse.json({ result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
