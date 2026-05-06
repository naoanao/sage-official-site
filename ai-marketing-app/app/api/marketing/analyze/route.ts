export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const QUALITY_RULES = `
【品質基準 — 必ず守ること】
・2026年現在の日本市場・業界の最新動向を前提にする
・「健康意識の高まり」「デジタル化」「ニーズの変化」のような汎用的すぎる表現は禁止
・できる限り具体的な法律名・政策名・数値・企業名・サービス名・年度を含める
・分析対象の業種・商品に固有の内容にする（どの業種にも当てはまる内容は避ける）
・各アクションは必ず分析項目の具体的な気づきから直接導出し、「なぜそのアクションか」が1文で分かる形にする
・アクションは「〇〇（分析で判明した課題/機会）に対応するため、〇〇を今週中に実施する」という形式で書く
`;

const FRAMEWORK_PROMPTS: Record<string, (c: CompanyInfo) => string> = {
  pest: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のPEST分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${c.url ? `Webサイト: ${c.url}` : ""}
${QUALITY_RULES}
【PEST分析の各軸で特に注意すること】
P（政治）: 2024〜2026年に実際に施行・改正された法律や補助金制度を具体的に挙げる。「規制強化」「政策推進」という曖昧な表現は禁止。
E（経済）: 物価上昇率・人件費・客単価の変化など数値を伴う動向を示す。「増加傾向」「減少傾向」では不十分で、業界固有の金額感・%感を含める。
S（社会）: 2025〜2026年現在の消費行動・ライフスタイルの具体的なシフトを示す。コロナ後に定着したトレンドではなく、現在進行形の変化を記述する。
T（技術）: すでに業界標準になったもの（POSレジ、SNS等）は除外し、現在導入が進んでいる・今後1〜2年で普及する技術・サービスを挙げる。

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "PEST分析",
  "why": "PEST分析が重要な理由（この業種・商品に固有の理由を1文で）",
  "items": {
    "P（政治・法規制）": ["具体的な法律名/政策名を含む気づき1", "具体的な気づき2", "具体的な気づき3"],
    "E（経済・市場動向）": ["数値や方向性を含む気づき1", "具体的な気づき2", "具体的な気づき3"],
    "S（社会・トレンド）": ["2026年現在固有のトレンド1", "具体的な気づき2", "具体的な気づき3"],
    "T（技術・AI）": ["今後1〜2年で普及する技術1", "具体的な気づき2", "具体的な気づき3"]
  },
  "insight": "上記分析から${c.name}が今最も注力すべきチャンスと回避すべきリスクを具体的に（2文）",
  "actions": ["P/E/S/Tの具体的な気づきXから導出したアクション1", "気づきYから導出したアクション2", "気づきZから導出したアクション3"]
}`,

  "3c": (c) => `あなたはプロのマーケティングストラテジストです。以下の会社の3C分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${QUALITY_RULES}
【3C分析の各軸で特に注意すること】
Customer: 「健康志向」「利便性重視」などの一般論ではなく、このターゲット層が2026年現在抱えている具体的な課題・行動変容・意思決定の瞬間を記述する。
Competitor: 実在する競合カテゴリ・競合の勝ちパターンを具体的に挙げ、${c.name}が勝てる/負けるポイントを明示する。
Company: 実際に入力された商品・サービス情報から読み取れる強み・弱みを推定し、「一般的な強み」ではなく${c.name}固有の視点で書く。

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "3C分析",
  "why": "3C分析がこの業種・フェーズで重要な理由（1文）",
  "items": {
    "Customer（顧客・市場）": ["このターゲット層の具体的な課題/行動1", "購買意思決定の特徴2", "2026年現在の変化3"],
    "Competitor（競合）": ["実在する競合カテゴリの強み1", "競合の弱みと${c.name}が入れる隙間2", "差別化の核心3"],
    "Company（自社）": ["${c.product}から読み取れる固有の強み1", "活かすべきリソース2", "最優先で改善すべき課題3"]
  },
  "insight": "3Cから見えてくる${c.name}だけの勝ち筋（競合が真似できない理由を含めて2文）",
  "actions": ["Customer分析から導出：〇〇という顧客課題に対応するため今週〇〇を実施する", "Competitor分析から導出：〇〇という競合の弱みを突くため今週〇〇を実施する", "Company分析から導出：〇〇という自社課題を解消するため今週〇〇を実施する"]
}`,

  swot: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のSWOT分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${QUALITY_RULES}
【SWOT分析で特に注意すること】
・2026年現在の日本市場を前提にする。COVID-19の影響ではなく、現在進行中の変化（物価高騰、人手不足、AI活用の民主化、Z世代の消費行動等）を反映する。
・Strength/Weaknessは${c.name}固有のもの（どこでも言える「立地が良い」「スタッフが親切」は禁止）
・Opportunity/Threatは業界・市場の外部変化から来るもの（内部要因を混入させない）
・insightはSO戦略（強みで機会を掴む最も優先度の高い一手）を具体的に書く

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "SWOT分析",
  "why": "この業種・フェーズでSWOT分析が必要な理由（1文）",
  "items": {
    "Strength（強み）": ["${c.product}に固有の強み1", "競合優位につながる強み2", "顧客が選ぶ理由になる強み3"],
    "Weakness（弱み）": ["${c.name}固有の改善すべき弱み1", "リソース・体制上の弱み2", "顧客離れにつながるリスク3"],
    "Opportunity（機会）": ["2026年の市場環境から来る具体的な機会1（数値・トレンド名を含む）", "機会2", "機会3"],
    "Threat（脅威）": ["2026年現在の具体的な脅威1（業界固有のもの）", "脅威2", "脅威3"]
  },
  "insight": "Strengthで最大のOpportunityを掴むSO戦略の具体的な一手（実施可能な行動レベルで2文）",
  "actions": ["SO戦略から導出したアクション1（強みXで機会Yを掴む）", "WO戦略から導出したアクション2（弱みZを克服して機会Yを取りに行く）", "ST戦略から導出したアクション3（強みXで脅威Wを回避する）"]
}`,

  stp: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のSTP分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${QUALITY_RULES}
【STP分析で特に注意すること】
・Segmentationは「年齢・性別」だけでなく、心理的セグメント（価値観・ライフスタイル・課題）で切ること
・Targetingは「なぜそのセグメントが最も収益性が高いか」という根拠を含める
・Positioningは競合との相対的な位置関係を明示し、「唯一〇〇できる」という形で表現する

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "STP分析",
  "why": "この業種でSTPが必要な理由（1文）",
  "items": {
    "Segmentation（市場細分化）": ["デモグラフィック×心理的セグメント軸1", "行動・利用シーン軸2", "各セグメントの規模感と特徴3"],
    "Targeting（ターゲット選定）": ["最も優先すべきセグメントとその理由（収益性・到達可能性の観点）1", "このセグメントが抱える未解決の課題2", "競合が手薄なポイント3"],
    "Positioning（ポジション）": ["競合Aとの差別化軸（具体的な競合名またはカテゴリ）1", "${c.name}だけが提供できる唯一の価値2", "刺さるメッセージの核心（15文字以内のコピー方向性）3"]
  },
  "insight": "このSTPに基づく最も刺さるターゲットへのメッセージとチャネルの組み合わせ（2文）",
  "actions": ["Segmentation結果から導出：〇〇セグメントへの訴求を強化するため今週〇〇を実施", "Targeting根拠から導出：〇〇の課題解決を訴求するため今週〇〇を実施", "Positioning確立のため今週〇〇を実施（競合との差別化を可視化する）"]
}`,

  "4p": (c) => `あなたはプロのマーケティングストラテジストです。以下の会社の4P/4C分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${QUALITY_RULES}
【4P/4C分析で特に注意すること】
・Productは「何を売るか」ではなく「顧客が得るベネフィット・体験」を中心に記述する
・Priceは競合比較・ターゲットの支払い意欲・心理的価格帯を具体的な金額感を含めて記述する
・Placeは2026年現在の購買導線（オンライン/オフライン/SNS経由）の組み合わせで考える
・Promotionは「SNS投稿」「キャンペーン」という曖昧な表現ではなく、具体的なコンテンツ形式・プラットフォーム・訴求軸を記述する

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "4P / 4C分析",
  "why": "この業種でいま4P/4C整理が必要な理由（1文）",
  "items": {
    "Product / 顧客価値": ["顧客が得る具体的なベネフィット1", "${c.product}の差別化できる機能・体験2", "競合にない独自価値3"],
    "Price / 顧客コスト": ["適切な価格帯と根拠（競合比・顧客の支払意欲から）1", "価格設定戦略（値引きvs価値訴求）2", "顧客の心理的コスト（手間・不安）を下げる施策3"],
    "Place / 利便性": ["2026年の購買導線に合ったチャネル設計1", "オンライン/オフラインの連携方法2", "顧客が最も便利に購入できる接点3"],
    "Promotion / コミュニケーション": ["最優先プラットフォームと具体的コンテンツ形式1", "ターゲットに刺さる訴求軸とメッセージ2", "口コミ・紹介を自然発生させる仕掛け3"]
  },
  "insight": "4Pの中で最も投資対効果が高く今すぐ着手すべきPとその理由（2文）",
  "actions": ["Product改善から導出したアクション（〇〇というベネフィットを強化するため）", "Place/Promotion戦略から導出したアクション（〇〇チャネルで〇〇訴求を今週始める）", "Price戦略から導出したアクション（〇〇の心理的コストを下げるため〇〇を実施）"]
}`,

  vrio: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のVRIO分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${QUALITY_RULES}
【VRIO分析で特に注意すること】
・入力された商品・サービス情報から読み取れる具体的なリソース・能力を分析する
・「顧客との関係性」「独自レシピ」「立地」などの具体的なリソース名で表現する
・「模倣困難」の理由は「時間・コスト・因果関係の曖昧さ・社会的複雑性」のどれかで説明する
・Organizationは「体制が整っているか」だけでなく、強みを活かすための具体的な次のアクションを示す

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "VRIO分析",
  "why": "この業種でVRIOが必要な理由（差別化が難しい理由に触れて1文）",
  "items": {
    "Value（経済価値）": ["${c.product}が解決する顧客課題と経済価値1", "競合と比較した優位性2", "収益に直結するリソース3"],
    "Rarity（希少性）": ["競合が持っていない具体的なリソース/能力1（リソース名を明示）", "業界内での希少性の理由2", "参入障壁になっている要素3"],
    "Imitability（模倣困難）": ["真似しにくい理由（時間/コスト/社会的複雑性のどれか）1", "構築に要した時間・経験2", "ブランド・信頼関係の蓄積3"],
    "Organization（組織体制）": ["現在の強みを活かせている体制1", "強みを十分に活用できていない課題2", "持続的競争優位を強化する次の一手3"]
  },
  "insight": "持続的競争優位を生む${c.name}最大の強みと、今後3ヶ月でその強みをどう磨くか（2文）",
  "actions": ["Value強化から導出：〇〇という価値をより明確に顧客に伝えるため今週〇〇を実施", "Rarity保護から導出：〇〇という希少資源を守るため今週〇〇を実施", "Organization改善から導出：〇〇という体制課題を解消するため今週〇〇を実施"]
}`,

  aeo: (c) => `あなたはプロのデジタルマーケティングストラテジストです。2026年のAI検索時代に向けた以下の会社のAEO（AI検索最適化）戦略を日本語で立案してください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

AEOとは：ChatGPT・Perplexity・Google AI Overviewsなどの「回答生成AI」に自社ブランドが「最適解」として引用・推薦されるための戦略です。
${QUALITY_RULES}
【AEO戦略で特に注意すること】
・${c.product}業界で実際にAI検索されそうな質問を想定し、その回答としてブランドが引用されるための具体策を示す
・「コンテンツを充実させる」ではなく、どのプラットフォームで・どんな形式で・何について書くかを具体的に示す
・E-E-A-Tは「専門家に見せる」ではなく、AIが引用判断に使う具体的なシグナル（一次データ・引用数・メディア掲載等）で考える

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "AEO（AI検索最適化）戦略",
  "why": "${c.product}業界でAEOが2026年に必要な具体的な理由（1文）",
  "items": {
    "AI Visibility Audit": ["ChatGPT/Gemini/Perplexityで${c.product}に関する質問を実際に試す方法と確認ポイント1", "競合ブランドとの引用頻度比較方法2", "${c.name}が引用されるために埋めるべき情報ギャップ3"],
    "Answer-first コンテンツ": ["${c.product}に関してAIが引用しやすい具体的なコンテンツ形式・テーマ1", "FAQ設計：AIが答えやすい質問形式と理想的な回答長2", "Webサイト・SNSに今すぐ追加すべき具体的なコンテンツ3"],
    "E-E-A-T（権威性）": ["${c.name}の専門性・実績をAIに認識させる具体的な方法1", "独自データ・一次情報（何を・どこで発信するか）2", "業界メディア・地域メディアへの掲載獲得策3"],
    "LLM Citation戦略": ["AIに引用される確率を上げる構造化データの実装（具体的なschema.orgタイプ）1", "Googleビジネスプロフィール・Wikipediaなどの権威サイトへの情報登録2", "SNSでブランド言及を自然に増やす具体的な施策3"]
  },
  "insight": "最初の1ヶ月でAI検索に引用されるために${c.name}が最優先でやるべきこと（具体的なアクションレベルで2文）",
  "actions": ["AI Visibility Auditから導出：今週〇〇というキーワードでChatGPT/Geminiを試し〇〇を確認する", "Answer-firstコンテンツから導出：〇〇というFAQページ/投稿を今週作成し〇〇に公開する", "E-E-A-T強化から導出：〇〇というデータ/実績を〇〇に掲載し権威性シグナルを追加する"]
}`,

  ulssas: (c) => `あなたはプロのSNSマーケティングストラテジストです。以下の会社のULSSAS分析（SNS時代の購買モデル）を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

ULSSASとは：UGC→Like→Search1（SNS検索）→Search2（指名検索）→Action→Spreadの拡散サイクルです。
${QUALITY_RULES}
【ULSSAS分析で特に注意すること】
・${c.product}業界で実際に拡散しているコンテンツのパターンを想定して分析する
・「ハッシュタグを使う」ではなく、具体的なハッシュタグ案・投稿フォーマット・投稿頻度を示す
・${c.target}が実際に使っているSNSプラットフォーム（Instagram/TikTok/X等）を特定して分析する

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "ULSSAS分析",
  "why": "${c.product}業界でULSSASが重要な理由（1文）",
  "items": {
    "UGC（ユーザー生成コンテンツ）": ["${c.target}が自発的に投稿したくなる具体的なシチュエーション・仕掛け1", "UGC投稿を促す具体的なキャンペーン案（特典・動機）2", "推奨ハッシュタグ案（#〇〇）と投稿促進の動線設計3"],
    "Like & Search1（SNS検索対策）": ["${c.target}がSNS検索するキーワード・シチュエーション1", "いいねを集めるコンテンツの具体的な形式・テーマ2", "SNS検索で上位表示されるための投稿設計3"],
    "Search2（指名検索・Google）": ["${c.name}の指名検索を増やすためのオフライン接点設計1", "Google検索で上位表示すべきキーワードと対策2", "SNSから指名検索への導線設計3"],
    "Action & Spread（購買・拡散）": ["SNS閲覧から購買までの最短導線設計1", "購入後に口コミ・紹介が自然に起きる仕掛け2", "リピーター化してUGCの担い手になってもらう施策3"]
  },
  "insight": "${c.product}業界で最も拡散が起きやすいUGCシナリオと、そのシナリオを意図的に作り出す方法（2文）",
  "actions": ["UGC起点から導出：〇〇というシチュエーションでUGCが生まれる仕掛けを今週〇〇に実装する", "SNS検索対策から導出：〇〇というキーワードで検索されるため今週〇〇を投稿する", "Spread促進から導出：〇〇という購後体験を設計し口コミ発生率を上げるため今週〇〇を実施する"]
}`
};

interface CompanyInfo {
  name: string;
  product: string;
  target: string;
  url?: string;
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, product, target, url, framework } = body;

    if (!name || !product || !target || !framework) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    const promptFn = FRAMEWORK_PROMPTS[framework];
    if (!promptFn) {
      return NextResponse.json({ error: "不明なフレームワークです" }, { status: 400 });
    }

    const prompt = promptFn({ name, product, target, url });

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
