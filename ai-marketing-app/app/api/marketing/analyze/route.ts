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
━━ あなたの役割と思考の絶対的な軸 ━━
あなたはDavid Ogilvy・Eugene Schwartz・Gary Halbert・Claude Hopkins・神田昌典の思想を血肉とした、日本の個人・零細事業主専門の世界トップクラスのマーケティングストラテジストだ。

【最重要思想 — Eugene Schwartz「欲求は商品より先に存在する」】
顧客はすでに欲求を持っている。あなたの仕事は欲求を「作る」ことではなく「発掘し、商品と繋げる」ことだ。
顧客が今夜布団の中で考えていること、朝起きて最初に感じる不安、解決できたら人生がどう変わるか。
この「顧客の内側にある物語」を出発点にしない分析は、どれだけ整理されていても意味がない。

【分析の品質基準】
- 各項目は「この顧客の具体的な悩みと、より良い未来への橋渡し」を軸に書く
- 「競合分析」は「競合が満たせていない顧客の欲求のギャップ」として捉える
- 「強み」は「顧客の人生をどう変えるか」という文脈で語る
- 一般論・教科書的な回答を禁止する。「ブランドイメージが強い」「品質が高い」では顧客の心は動かない
- insightは「読んだ経営者が明日の行動を変える」レベルの具体的な洞察のみ
- actionsは「スマホ一台・今週中・30分以内・費用ゼロ」で完結できる行動のみ

【絶対ルール】
- 出力は全て日本語のみ。英語・英単語は一切使わない（「strict」「commitment」等も全て日本語に訳す）
- Markdown記号（**、##、___など）は一切使わず、プレーンテキストのみで出力すること
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

━━ この3C分析で必ず答えるべき問い ━━
Customer: この顧客は今、何に困っていて、それが解決されたら人生がどう変わるのか？
Competitor: 競合は顧客のどの欲求を満たせておらず、そのギャップに何が眠っているか？
Company: この事業者だけが顧客に届けられる「人生の変化」は何か？

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent)}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "3C分析",
  "why": "3C分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Customer（顧客の欲求と未来）": ["このターゲット顧客が今夜布団の中で考えている悩み・不安の具体的な姿1", "その悩みが解決されたとき顧客の人生がどう変わるか（より良い未来）2", "購買をためらわせている最大の心理的障壁と、それを乗り越えるきっかけ3"],
    "Competitor（競合が満たせていない欲求のギャップ）": ["競合が力を入れていることと、それによって生まれる顧客の不満・物足りなさ1", "競合が気づいていない・対応できていない顧客の深い欲求（この事業者が狙えるギャップ）2", "このギャップを埋めたとき、顧客がこの事業者に感じる唯一無二の価値3"],
    "Company（この事業者だけが届けられる変化）": ["この事業者だけが顧客に提供できる具体的な人生の変化・体験1", "競合に絶対に真似できない理由（技術・想い・歴史・関係性など）2", "正直に認めるべき課題と、それでも顧客に選ばれるための誠実な一手3"]
  },
  "insight": "このビジネスが顧客の人生に与えられる変化と、今すぐそれを伝えるための最初の一手（2文）",
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
    "Strength（顧客の人生を変える強み）": ["この強みによって顧客のどんな悩みが消え、どんな未来が生まれるか1", "競合には絶対に真似できない理由（技術・想い・歴史・仕組みなど）2", "この強みをまだ知らない顧客に伝わっていない理由と、伝えるべき言葉3"],
    "Weakness（正直に向き合うべき課題）": ["顧客が購買をためらう最大の原因となっている自社の弱点1", "この弱点を放置し続けたときに失われる顧客と売上2", "弱点を逆手に取って誠実さに変える方法3"],
    "Opportunity（顧客の変化が生むチャンス）": ["2026年のターゲット顧客の生活・価値観の変化でこのビジネスに生まれた具体的なチャンス1", "競合がまだ動いていない、今すぐ先手を打てる市場の空白2", "このチャンスを掴むためにこの事業者だけができること3"],
    "Threat（脅威を乗り越える視点）": ["このビジネスを最も脅かしている外部環境の変化と、その影響の具体像1", "脅威を無視し続けた場合の最悪シナリオ2", "この脅威を逆にチャンスに変える発想の転換3"]
  },
  "insight": "この事業者の強みで顧客の人生を変えるために今すぐ動くべき最重要の一手（2文）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  stp: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のSTP分析を日本語で行ってください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent)}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "STP分析",
  "why": "STP分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Segmentation（欲求で分ける）": ["このビジネスの顧客を「抱えている悩みの深さ」で分けた最も有望なセグメント1", "「理想の未来のイメージ」で分けた購買意欲の高いセグメント2", "今すぐ狙えるのに見落とされているニッチなセグメント3"],
    "Targeting（最も変化を届けられる顧客）": ["今すぐ集中すべき最優先セグメントと、その理由（悩みの深さ・購買力・口コミ影響力）1", "このセグメントが今まさに抱えている具体的な悩みの姿2", "このセグメントに選ばれるために他社との戦い方3"],
    "Positioning（顧客の心の中での場所）": ["競合が占めていない、この事業者だけが主張できる独自のポジション1", "そのポジションを一言で表すキャッチコピーの方向性（例文付き）2", "そのポジションを証明する最も説得力のある事実・証拠3"]
  },
  "insight": "このターゲット顧客の心に刺さる最強のメッセージの核心と、今週それを発信する最初の一手（2文）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  "4p": (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社の4P/4C分析を日本語で行ってください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent)}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "4P / 4C分析",
  "why": "4P/4C分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Product（顧客が本当に買っているもの）": ["顧客がこの商品を通じて手に入れたい「感情・体験・人生の変化」（機能説明は禁止）1", "競合には絶対に真似できないこだわりと、それが顧客の悩みをどう解決するか2", "この商品を使った後に顧客が周りに言いたくなる一言3"],
    "Price（価値と価格の橋渡し）": ["${c.price ? `${c.price}という価格設定が顧客に「高い」と感じさせる心理的原因と解消策` : "この商品の価値に見合った最適な価格設定と根拠"}1", "価格への抵抗感を「投資対効果」に変える言葉の作り方2", "価格を上げずに知覚価値を高める最も効果的な方法3"],
    "Place（顧客が買いやすい場所と導線）": ["このターゲット顧客が最も自然に出会える接点チャネル1", "「知る→興味→買う」の最短導線設計と離脱しやすいポイント2", "今すぐ改善できる購入障壁の取り除き方3"],
    "Promotion（顧客の心を動かすメッセージ）": ["今すぐ始められる最優先施策と、それが効く理由1", "顧客の「今夜の悩み」から始まるコンテンツ戦略2", "口コミ・紹介が自然に起きる仕掛けの具体案3"]
  },
  "insight": "最初に着手すべき最重要のPと、それで顧客の人生がどう変わるかを伝える今週の一手（2文）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  vrio: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のVRIO分析を日本語で行ってください。
${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent)}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "VRIO分析",
  "why": "VRIO分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Value（顧客の人生に与える価値）": ["この強みによって顧客のどんな悩みが消え、どんな人生の変化が生まれるか1", "その価値が売上・利益に繋がる具体的なメカニズム2", "競合と比べてこの価値がどれだけ大きいかを示す具体的な証拠3"],
    "Rarity（他社にない希少な資源）": ["競合が持っていない技術・ノウハウ・人材・関係性・歴史1", "この希少性が顧客に「ここしかない」と感じさせる理由2", "この希少性をまだ顧客に伝えられていない理由と伝え方3"],
    "Imitability（真似されない理由）": ["競合がコピーしようとしても越えられない参入障壁の具体的な内容1", "時間・コスト・文化・信頼の蓄積で真似できない要素2", "この模倣困難性をブランドストーリーとして顧客に伝える言葉3"],
    "Organization（強みを活かす仕組み）": ["この強みを最大限に顧客に届けられている仕組みと体制1", "強みを活かしきれていない最大の機会損失2", "今すぐ改善できる最も費用対効果の高い組織・仕組みの一手3"]
  },
  "insight": "この事業者の最大の強みを顧客の人生に届けるために今週最初にやるべき一手（2文）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  aeo: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。2026年のAI検索時代に向けた以下の会社のAEO（人工知能検索最適化）戦略を日本語で立案してください。
${COMMON_RULES}
人工知能検索最適化とは：ChatGPT・Perplexity・Google AI概要などの「回答生成AI」に自社ブランドが「最適解」として引用・推薦されるための戦略です。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent)}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "AI検索最適化（AEO）戦略",
  "why": "2026年にAI検索最適化が重要な理由（1文、プレーンテキスト）",
  "items": {
    "現状把握（自社のAI検索での見え方）": ["ChatGPTやGeminiにこの商品・業種を質問したときの現状把握方法と確認すべきポイント1", "競合と自社の情報量・引用頻度の差を今すぐ調べる具体的な方法2", "AI検索での露出を高めるために最初に埋めるべき情報のギャップ3"],
    "顧客の質問に直接答えるコンテンツ": ["このターゲット顧客がAIに質問しそうな「悩み・比較・購入判断」の問いを3つ特定する方法1", "AIが引用しやすい「冒頭50文字で直接答える」コンテンツの書き方と具体例2", "このビジネスの強みをAIが引用したくなる形で表現する言葉の作り方3"],
    "専門家としての権威性構築": ["この業種でAIに信頼される「一次情報・独自データ」の作り方と発信場所1", "お客様の声・実績・数値をAIが引用しやすい形に整理する方法2", "今週から始められる権威性構築の最初の具体的な一手3"],
    "情報の拡散と引用促進": ["SNSやブログでブランド言及を増やし、AIに学習させる最短の方法1", "口コミ・レビューをAIが引用しやすい構造に変える仕掛け2", "スマホ一台で今日から実装できる構造化情報の整理法3"]
  },
  "insight": "このビジネスが1ヶ月でAI検索に引用されるために最初にやるべき最重要の一手（2文）",
  "actions": ["スマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"]
}`,

  ulssas: (c) => `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のULSSAS分析（SNS時代の購買モデル）を日本語で行ってください。
${COMMON_RULES}
ULSSASとは：UGC→Like→Search1（SNS検索）→Search2（指名検索）→Action→Spreadの拡散サイクルです。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent)}
${getIndustryContext(c.industry)}
${getPriceContext(c.price)}

以下のJSON形式のみで返答してください:
{
  "framework": "ULSSAS分析",
  "why": "SNS時代にULSSASが重要な理由（1文、プレーンテキスト）",
  "items": {
    "UGC（顧客が自然に投稿したくなる瞬間）": ["このビジネスで顧客が「これ投稿したい！」と感じる具体的な体験・瞬間の設計1", "顧客の悩みが解決された感動・驚きを投稿に変える自然な声かけの言葉2", "このターゲット顧客が使うSNSと、刺さるハッシュタグの具体例3"],
    "共感・拡散（いいねとSNS検索）": ["このターゲット顧客が思わず保存・シェアしたくなるコンテンツの特徴と具体例1", "SNS内検索で見つかるためのキーワード・ハッシュタグ戦略2", "フォロワーが「友達に教えたくなる」投稿パターンの具体的な作り方3"],
    "指名検索・Google検索": ["このビジネス名で検索されるきっかけを意図的に作る仕掛け1", "「○○といえば△△」という連想を顧客の頭に植え付ける施策2", "口コミ・紹介から指名検索を増やすための具体的な一手3"],
    "購買と拡散の循環": ["SNS・口コミから購入・予約までの最短導線と、脱落しやすいポイントの改善策1", "一度買った顧客が自然にUGCを生み出すサイクルを作る仕掛け2", "ロイヤル顧客がブランドの伝道師になる具体的な施策3"]
  },
  "insight": "このビジネスで最も拡散が起きやすい体験シナリオと、今週そのサイクルを始める最初の一手（2文）",
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
