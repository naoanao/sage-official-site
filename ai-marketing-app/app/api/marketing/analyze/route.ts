export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────
// 業種別コンテキスト（日本語・英語）
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
  health:
    "整体・鍼灸・マッサージ・エステなど健康・ボディケア業として分析する。症状改善の実績・施術の根拠・リピート率・口コミ・Googleマップ集客・before/afterの見せ方を重視すること。",
  education:
    "塾・英会話・スポーツ教室など教育・スクール業として分析する。指導実績・合格率・体験授業の設計・保護者への安心感・生徒の変化を伝えるコンテンツ・口コミを重視すること。",
};

const INDUSTRY_CONTEXTS_EN: Record<string, string> = {
  restaurant: "Analyze as a restaurant. Focus on: food cost, average spend, lunch vs dinner traffic differences, social media visual appeal, reviews, and seasonal menu strategy.",
  salon: "Analyze as a beauty salon. Focus on: skill differentiation, repeat visit rate, booking funnel, Instagram marketing, building regular clients, and before/after content.",
  ec: "Analyze as an e-commerce business. Focus on: product appeal, purchase funnel, cart abandonment, review strategy, social traffic, gift demand, and seasonal peaks.",
  professional: "Analyze as a consulting or professional services business. Focus on: expertise visibility, trust building, inquiry funnel, SEO, media presence, and referral systems.",
  construction: "Analyze as a construction or renovation business. Focus on: local community presence, project portfolio showcase, reviews, renovation demand, seasonal maintenance, and print/flyer effectiveness.",
  health: "Analyze as a health, wellness, or bodycare business. Focus on: treatment results, evidence-based positioning, repeat rate, Google Maps visibility, reviews, and before/after content.",
  education: "Analyze as an education or school business. Focus on: teaching results, completion/pass rates, trial lesson design, parent reassurance, student transformation content, and word of mouth.",
};

function getIndustryContext(industry?: string, lang?: string): string {
  if (!industry) return "";
  if (lang === "en") return INDUSTRY_CONTEXTS_EN[industry] ?? "";
  return INDUSTRY_CONTEXTS[industry] ?? "";
}

function getPriceContext(price?: string, lang?: string): string {
  if (!price) return "";
  if (lang === "en") {
    return `Price point: ${price} — use this as context for pricing psychology, value communication, and competitive positioning throughout your analysis.`;
  }
  return `価格帯・客単価: ${price}（この価格帯を前提に、ターゲット顧客の購買心理・競合との価格戦略・高単価または低単価ならではのリスクと戦略を分析すること）`;
}

function getSiteContext(siteContent?: string, lang?: string): string {
  if (!siteContent) return "";
  if (lang === "en") {
    return `[Website content — use as primary source data for your analysis]:
${siteContent}
(Auto-extracted from their website. Prioritize these real facts over assumptions.)`;
  }
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

【デザイン思考：顧客が「言えていないニーズ」を掘り起こす】
顧客が口に出す要望は「表面の欲求」に過ぎない。本当に設計すべきは、顧客自身もまだ言語化できていない「潜在欲求」だ。
「もっと便利にしてほしい」の裏にある「本当は時間を家族に使いたい」という感情こそが、心を動かすコピーの源泉になる。
各分析項目で「顧客の言葉の裏にある感情・渇望・理想の生活像」まで掘り下げること。

【コミュニティマーケティング・LTV思考：既存顧客こそ最強の資産】
ロイヤリティには深さのステージがある：知ってる → いいね！ → 役立つ → 好き！ → 信頼 → 欠かせない
広告・販促が届かせられるのは「役立つ」まで。「好き・信頼・欠かせない」は顧客との直接的な体験と対話によってのみ生まれる。
売上の約80%は上位20%のロイヤル顧客が生み出す（デシル分析の鉄則）。新規獲得コストは既存顧客維持の5〜7倍かかる。
施策を提案するとき「この施策はリピート率・LTV・NPS（推奨意欲）のどれを改善するか」を必ず明示すること。
同品質・同価格の競合が現れたとき、コアファン（欠かせないステージ）だけが離れない。これが最強の競争優位だ。
コアファンの声（N1インタビュー・レビュー分析）が次の戦略コンテンツの源泉になる。顧客調査なしの分析は仮説に過ぎない。

【ブランド戦略：カテゴリーの「代表格」を狙え】
ブランドとは「消費者の頭の中に形成された認知システム」だ。ロゴや名前はその入口に過ぎない。
強いブランドとは、そのカテゴリーで「まず思い浮かぶ存在（プロトタイプ）」になることだ。
分析では「このビジネスがどのカテゴリーで・どのターゲットの頭の中で・何番目に思い浮かべられているか」を起点に置くこと。

【USP・バリュープロポジション：「競合には言えない言葉」で差別化する】
バリュープロポジション = ①顧客が求めている × ②自社が提供できる × ③競合には実現できない の3つが重なる領域だ。
USPは「機能説明」ではなく「顧客の人生の変化を、自社だけの言葉で語ること」。
戦略USP（社内の核）と顧客向けコピー（広告・LPフック）は分けて設計する。
例：戦略USP「生菌2種を持つ唯一の機能性青汁」→ 顧客コピー「腸活生活もう一杯。780円から。」
分析では「この事業者だけが正直に言える具体的なファクト」を最低1つ見つけ、顧客の感情変化に翻訳して提示すること。

【競合分析の思想：実データから差別化根拠を見つける】
競合分析は「競合が強い・弱い」の評価ではなく「競合が満たせていない顧客の欲求のギャップ」を探す作業だ。
競合のレビュー（★5の感動と★2〜3の不満）の中に、このビジネスが入り込める差別化根拠が眠っている。
「競合の弱みが自社の強みになる」という視点で、具体的な顧客の言葉レベルで差別化を語ること。

【分析の品質基準】
- 各項目は「この顧客の具体的な悩みと、より良い未来への橋渡し」を軸に書く
- 「強み」は「顧客の人生をどう変えるか」という文脈で語る
- 一般論・教科書的な回答を禁止する。「ブランドイメージが強い」「品質が高い」では顧客の心は動かない
- insightは「読んだ経営者が明日の行動を変える」レベルの具体的な洞察のみ
- actionsは「スマホ一台・今週中・30分以内・費用ゼロ」で完結できる行動のみ

【態度変容モデル・ファネル思考：施策の「効く段階」を特定する】
顧客は「知る→興味→比較・検討→購入→継続→紹介・発信」の段階を経て動く（AIDMA/AISASモデル）。
各施策を提案するとき、必ずその施策が「顧客のどの段階を動かすか」を意識すること。
- 認知段階: 広告・SNS・PR → まず存在を知らせる
- 興味・比較検討段階: LP・レビュー・コンテンツ → 選ばれる理由を見せる
- 購入段階: CTA・初回オファー → 背中を押す
- 継続・紹介段階: フォロー施策・口コミ誘発 → ダブルファネルを回す
「全段階を同時に改善しようとしない。最もボトルネックになっている1段階に集中してPDCAを回す」こと。

【カスタマージャーニー思考：タッチポイントで顧客の感情に寄り添う】
顧客がSNS→LP→購入→利用→口コミという旅の各フェーズで「何を考え・何を感じているか」を起点に置くこと。
特にネガティブ感情（不安・迷い・面倒）が生じているフェーズが最大の改善チャンス。
施策提案は「そのタッチポイントで顧客の感情的な障壁を取り除く」設計にすること。

【PDCA・効果検証思考：「やりっぱなし」の施策を禁止する】
施策ごとに「測定できる数値KPI」を必ずセットで設計すること。
例：Instagram投稿 → リーチ数・プロフィール訪問率・保存率 / Google Maps口コミ依頼 → 月次件数・平均評価点 / LINE配信 → 開封率・クリック率
目標値と実績値のギャップが最も大きい段階がボトルネック。全段階を同時に改善しようとしない。
「まず最もボトルネックになっている1つのKPIだけ改善する施策を選ぶ」が、最短で成果を出す原則だ。
actionsに盛り込む施策は、効果検証できない「やりっぱなし」施策を禁止する。必ず「何を計測するか」をセットで書くこと。

【定量データ必須ルール（言葉だけの分析を禁止）】
- 各分析セクションに必ず1つ以上の具体的な数値を含めること（市場規模・成長率・割合・人数・金額・検索ボリュームなど）
- 数値は「〜万人規模」「〜億円市場」「〜%増加」などの推計値でよいが、根拠となる傾向・出典分野を括弧内に示すこと（例: 国内健康食品市場は約9,000億円規模（矢野経済研究所推計）、定期購入市場は年10〜15%成長中）
- 「多い」「増加傾向」「人気がある」などの定性表現のみの項目は禁止。必ず数値に変換すること

【絶対ルール】
- 出力言語はユーザーの入力言語に合わせること。入力が日本語なら日本語、英語なら英語、ポルトガル語ならポルトガル語で全て出力する
- 出力言語内で自然に使われる言葉のみを使う（日本語出力時に英単語を混ぜない、英語出力時に日本語を混ぜない）
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
  lang?: string;
}

function getLangInstruction(lang?: string): string {
  if (lang === "en") {
    return `\n⚠️ CRITICAL RULES FOR ENGLISH OUTPUT — MANDATORY, NO EXCEPTIONS:
1. Respond ENTIRELY in English. Every JSON value, section label, and text must be in English. Output ZERO Japanese characters.
2. Do NOT recommend LINE, WeChat, or any Japan/Asia-specific platform. Use Instagram, Google, Email, Facebook, YouTube, or other globally available channels ONLY.
3. Do NOT invent discounts, coupon codes, referral discount programs, limited-time offers, events, or any pricing NOT explicitly stated in the business description. Only use facts from the input data.
4. Do NOT recommend TikTok or any specific social platform unless it was explicitly mentioned in the business description.
5. Write in natural, friendly American English — no translated Japanese marketing phrases.
6. All JSON "framework" values and section key labels must be in English (e.g., "PEST Analysis" not "PEST分析", use English section headers throughout).
7. CRITICAL: Copy the EXACT section key names shown in the JSON template below. Do NOT add Japanese text in parentheses after them. Do NOT rewrite them in Japanese. Output keys verbatim as shown in the template.
8. NEVER translate, transliterate, or paraphrase any business name, brand name, place name, or proper noun. If the business name is "Solo Yoga Brooklyn", output it as "Solo Yoga Brooklyn" — NOT "ソロヨガブルックリン" or any other form.\n`;
  }
  return "";
}

const FRAMEWORK_PROMPTS: Record<string, (c: CompanyInfo) => string> = {
  pest: (c) => {
    const isEn = c.lang === "en";
    const jsonTemplate = isEn ? `{
  "framework": "PEST Analysis",
  "why": "Why PEST Analysis matters for this business right now (1 sentence, plain text)",
  "items": {
    "P (Political & Regulatory)": ["Specific law, regulation, subsidy, or policy directly affecting this industry in this market 1 — include a real named regulation or program", "same 2", "same 3"],
    "E (Economic & Market Trends)": ["Economic indicator or market size figure with a source field in parentheses, relevant to this price point and customer base 1 — NOTE: all figures are AI estimates, not verified data; include (estimated) tag", "same 2", "same 3"],
    "S (Social & Consumer Trends)": ["Consumer behavior, lifestyle shift, or demographic change creating demand for this type of business 1", "same 2", "same 3"],
    "T (Technology & AI)": ["Specific technology or AI tool this business can use right now to grow 1", "same 2", "same 3"]
  },
  "insight": "The single most important move for this business given the PEST landscape (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. Only suggest platforms the customer would actually use; do not invent events or promotions", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  }
}` : `{
  "framework": "PEST分析",
  "why": "PEST分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "P（政治・法規制）": ["この業種に直接影響する法規制・補助金・規制緩和の具体的な動向1", "同2", "同3"],
    "E（経済・市場動向）": ["この業種の価格帯・客層に影響する経済・市場トレンド1", "同2", "同3"],
    "S（社会・消費者トレンド）": ["ターゲット顧客の行動変化・価値観・健康意識・ライフスタイルの変化1", "同2", "同3"],
    "T（技術・AI）": ["この業種で今すぐ使えるテクノロジー・AIツール1", "同2", "同3"]
  },
  "insight": "このビジネスが今すぐ取るべき具体的な一手（2文、プレーンテキスト）",
  "actions": [
    "【絶対条件：広告費・外部依頼・イベント企画・インフルエンサー依頼は禁止。スマホのみ・今週中・30分以内・無料で完結するアクションのみ】具体的なアプリ名・ハッシュタグ・文章例・実行後に確認するKPIをセットで書くこと（例：Instagramで「#産後ダイエット神奈川」を付けてビフォーアフター投稿を作成→24時間後のリーチ数とプロフィール訪問数を記録する）",
    "【同条件・別チャネル】2つ目のアクション（例：Googleマップの口コミ依頼DM文を作成し過去顧客3名にLINEで送る→1週間で口コミ件数を確認する）",
    "【同条件・競合分析系】3つ目のアクション（例：競合上位3社のInstagramで保存数の多い投稿3〜5件を分析し、自社との差異をメモして次の投稿テーマに反映する）"
  ],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・具体的な悩みを含む20文字以内。例：30代産後ダイエット挫折経験ありの主婦）",
    "usp": "この事業者だけが正直に言えるファクト（競合が使えない具体的な言葉・強み・資格・歴史で20文字以内。入力に証拠数値がない場合は数字を作らず定性的な独自性を書くこと。ハルシネーション禁止）",
    "main_channel": "この業種・ターゲットで最も費用対効果が高いチャネル（Googleマップ/Instagram/LINE/チラシ等。ECは飲食・物販以外は記載禁止）",
    "top_priority": "今月だけに集中する施策を1つ（スマホで実行可能な具体的行動を25文字以内で）",
    "winning_message": "フック力のあるキャッチコピー（25文字以内厳守・数字か感情トリガーを必ず含める。例：週2回で体が変わる。産後専門が伴走。禁止：商品名のみ・「〇〇の悩み」という名詞止め）"
  }
}`;
    return isEn ? `You are a world-class marketing strategist. Perform a PEST Analysis for the following business.
${getLangInstruction(c.lang)}
NOTE: This analysis is based on AI training data. For P (Political) and E (Economic) items, always recommend verifying with current sources.

PEST CLASSIFICATION RULES (strictly enforce — no cross-contamination):
- P (Political & Regulatory): laws, regulations, subsidies, government policy, tax changes ONLY. Consumer attitudes and lifestyle changes go in S.
- E (Economic): GDP, inflation, interest rates, industry revenue size, competitor pricing trends ONLY. "Consumer demand increasing" belongs in S.
- S (Social): consumer attitudes, demand shifts, lifestyle, demographics, health consciousness — all here.
- T (Technology): tech innovation, AI, digitalization, platform changes ONLY.

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
${jsonTemplate}` : `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のPEST分析を行ってください。
${getLangInstruction(c.lang)}${COMMON_RULES}
【重要】この分析はAIの学習データ（2025年5月時点）に基づきます。特にP（政治・法規制）とE（経済）の項目は現在の状況と異なる可能性があるため、実務では必ず最新情報を確認すること。

【PEST分類の厳守ルール（混入禁止）】
- P（政治・法規制）: 法律改正・規制強化/緩和・補助金・行政指導・政策・税制のみ。消費者意識・健康トレンド・ライフスタイル変化はPに絶対含めない
- E（経済・市場動向）: GDP・物価指数・インフレ・金利・為替・賃金動向・業界全体の売上規模・競合の価格戦略のみ。「消費者の需要増加」「ニーズの高まり」はS（社会）に分類すること
- S（社会・消費者トレンド）: 消費者の意識・需要・ニーズの変化、ライフスタイル、人口動態、健康志向はすべてここ
- T（技術・AI）: テクノロジー革新・DX・AI・デジタル化・SNSプラットフォームの変化のみ

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent, c.lang)}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
${jsonTemplate}`;
  },

  "3c": (c) => {
    const isEn = c.lang === "en";
    const jsonTemplate = isEn ? `{
  "framework": "3C Analysis",
  "why": "Why 3C Analysis matters for this business (1 sentence, plain text)",
  "items": {
    "Customer (desires and future)": ["Specific worry or fear this target customer thinks about late at night 1", "How their life changes when this problem is solved — paint the better future 2", "Biggest psychological barrier stopping them from buying, and what breaks through it 3"],
    "Competitor (gaps they leave unfilled)": ["What competitors tend to focus on and what customer frustration that creates 1", "The deeper customer need competitors seem to miss — the gap this business can own 2", "The unique value this business delivers when it fills that gap 3"],
    "Company (change only you can deliver)": ["The specific life change or experience only this business can provide 1", "Why competitors cannot copy this — name the real barrier (skill, story, relationship) 2", "A weakness to own honestly, and the one move that still makes this business worth choosing 3"]
  },
  "insight": "The life change this business can create for customers, and the first move to communicate it this week (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. No invented discounts, coupons, referral programs, or events", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  }
}` : `{
  "framework": "3C分析",
  "why": "3C分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Customer（顧客の欲求と未来）": ["このターゲット顧客が今夜布団の中で考えている悩み・不安の具体的な姿1", "その悩みが解決されたとき顧客の人生がどう変わるか（より良い未来）2", "購買をためらわせている最大の心理的障壁と、それを乗り越えるきっかけ3"],
    "Competitor（競合が満たせていない欲求のギャップ）": ["競合が力を入れていることと、それによって生まれる顧客の不満・物足りなさ1", "競合が気づいていない・対応できていない顧客の深い欲求（この事業者が狙えるギャップ）2", "このギャップを埋めたとき、顧客がこの事業者に感じる唯一無二の価値3"],
    "Company（この事業者だけが届けられる変化）": ["この事業者だけが顧客に提供できる具体的な人生の変化・体験1", "競合に絶対に真似できない理由（技術・想い・歴史・関係性など）2", "正直に認めるべき課題と、それでも顧客に選ばれるための誠実な一手3"]
  },
  "promotion_gap": {
    "meta_ads_status": "この業種・商品カテゴリでのMeta広告の競争状況の推測（競合が注力しているか・空白があるか）",
    "google_ads_status": "この業種でのGoogle検索広告の競争状況の推測（主要キーワードの競合状況）",
    "untapped_channel": "競合がまだ手をつけていない・弱い広告チャネルまたはキーワード軸（先行できる空白領域）",
    "recommended_first_ad": "この事業者が今すぐ始めるべき最初の広告施策（チャネル・訴求軸・ターゲット層を具体的に）"
  },
  "insight": "このビジネスが顧客の人生に与えられる変化と、今すぐそれを伝えるための最初の一手（2文）",
  "actions": [
    "【絶対条件：広告費・外部依頼・イベント企画・インフルエンサー依頼は禁止。スマホのみ・今週中・30分以内・無料で完結するアクションのみ】具体的なアプリ名・ハッシュタグ・文章例・実行後に確認するKPIをセットで書くこと（例：Instagramで「#産後ダイエット神奈川」を付けてビフォーアフター投稿を作成→24時間後のリーチ数とプロフィール訪問数を記録する）",
    "【同条件・別チャネル】2つ目のアクション（例：Googleマップの口コミ依頼DM文を作成し過去顧客3名にLINEで送る→1週間で口コミ件数を確認する）",
    "【同条件・競合分析系】3つ目のアクション（例：競合上位3社のInstagramで保存数の多い投稿3〜5件を分析し、自社との差異をメモして次の投稿テーマに反映する）"
  ],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・具体的な悩みを含む20文字以内。例：30代産後ダイエット挫折経験ありの主婦）",
    "usp": "この事業者だけが正直に言えるファクト（競合が使えない具体的な言葉・強み・資格・歴史で20文字以内。入力に証拠数値がない場合は数字を作らず定性的な独自性を書くこと。ハルシネーション禁止）",
    "main_channel": "この業種・ターゲットで最も費用対効果が高いチャネル（Googleマップ/Instagram/LINE/チラシ等。ECは飲食・物販以外は記載禁止）",
    "top_priority": "今月だけに集中する施策を1つ（スマホで実行可能な具体的行動を25文字以内で）",
    "winning_message": "フック力のあるキャッチコピー（25文字以内厳守・数字か感情トリガーを必ず含める。例：週2回で体が変わる。産後専門が伴走。禁止：商品名のみ・「〇〇の悩み」という名詞止め）"
  }
}`;
    return isEn ? `You are a world-class marketing strategist. Perform a 3C Analysis for the following business.
${getLangInstruction(c.lang)}
Avoid definitive claims about competitors — use "typically," "tends to," or "analysis suggests."

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
${jsonTemplate}` : `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社の3C分析を行ってください。
${getLangInstruction(c.lang)}${COMMON_RULES}
競合分析では断定表現を禁止し「〜と推測される」「一般的に〜」など推測表現を使うこと。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent, c.lang)}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
${jsonTemplate}`;
  },

  swot: (c) => {
    const isEn = c.lang === "en";
    const jsonTemplate = isEn ? `{
  "framework": "SWOT Analysis",
  "why": "Why SWOT Analysis matters for this business right now (1 sentence, plain text)",
  "items": {
    "Strength (how it changes the customer's life)": ["What customer pain disappears and what positive future this strength creates 1", "Why competitors cannot replicate this — name the real barrier (skill, story, history, system) 2", "Why customers who would love this haven't heard about it yet, and the words to reach them 3"],
    "Weakness (face it honestly)": ["The real reason customers hesitate to buy — the weakest point in the current offer 1", "What loyal customers and revenue are lost if this weakness is ignored 2", "How to turn this weakness into an honest strength that builds trust 3"],
    "Opportunity (changes creating new openings)": ["Specific shift in target customer behavior or values in 2026 that benefits this business 1", "A market gap competitors haven't moved into yet — act now to claim it 2", "The one thing only this business can do to capture this opportunity 3"],
    "Threat (how to survive and flip it)": ["The biggest external change threatening this business — describe its concrete impact 1", "Worst-case scenario if this threat is ignored for 12 months 2", "How to reframe this threat into a competitive advantage 3"]
  },
  "insight": "The single strongest move to leverage this business's top SWOT asset for customers this week (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. Do NOT suggest discounts, coupons, exclusive deals, referral programs, or events not in the business description", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  }
}` : `{
  "framework": "SWOT分析",
  "why": "SWOT分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Strength（顧客の人生を変える強み）": ["この強みによって顧客のどんな悩みが消え、どんな未来が生まれるか1", "競合には絶対に真似できない理由（技術・想い・歴史・仕組みなど）2", "この強みをまだ知らない顧客に伝わっていない理由と、伝えるべき言葉3"],
    "Weakness（正直に向き合うべき課題）": ["顧客が購買をためらう最大の原因となっている自社の弱点1", "この弱点を放置し続けたときに失われる顧客と売上2", "弱点を逆手に取って誠実さに変える方法3"],
    "Opportunity（顧客の変化が生むチャンス）": ["2026年のターゲット顧客の生活・価値観の変化でこのビジネスに生まれた具体的なチャンス1", "競合がまだ動いていない、今すぐ先手を打てる市場の空白2", "このチャンスを掴むためにこの事業者だけができること3"],
    "Threat（脅威を乗り越える視点）": ["このビジネスを最も脅かしている外部環境の変化と、その影響の具体像1", "脅威を無視し続けた場合の最悪シナリオ2", "この脅威を逆にチャンスに変える発想の転換3"]
  },
  "insight": "この事業者の強みで顧客の人生を変えるために今すぐ動くべき最重要の一手（2文）",
  "actions": [
    "【絶対条件：広告費・外部依頼・イベント企画・インフルエンサー依頼は禁止。スマホのみ・今週中・30分以内・無料で完結するアクションのみ】具体的なアプリ名・ハッシュタグ・文章例・実行後に確認するKPIをセットで書くこと（例：Instagramで「#産後ダイエット神奈川」を付けてビフォーアフター投稿を作成→24時間後のリーチ数とプロフィール訪問数を記録する）",
    "【同条件・別チャネル】2つ目のアクション（例：Googleマップの口コミ依頼DM文を作成し過去顧客3名にLINEで送る→1週間で口コミ件数を確認する）",
    "【同条件・競合分析系】3つ目のアクション（例：競合上位3社のInstagramで保存数の多い投稿3〜5件を分析し、自社との差異をメモして次の投稿テーマに反映する）"
  ],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・具体的な悩みを含む20文字以内。例：30代産後ダイエット挫折経験ありの主婦）",
    "usp": "この事業者だけが正直に言えるファクト（競合が使えない具体的な言葉・強み・資格・歴史で20文字以内。入力に証拠数値がない場合は数字を作らず定性的な独自性を書くこと。ハルシネーション禁止）",
    "main_channel": "この業種・ターゲットで最も費用対効果が高いチャネル（Googleマップ/Instagram/LINE/チラシ等。ECは飲食・物販以外は記載禁止）",
    "top_priority": "今月だけに集中する施策を1つ（スマホで実行可能な具体的行動を25文字以内で）",
    "winning_message": "フック力のあるキャッチコピー（25文字以内厳守・数字か感情トリガーを必ず含める。例：週2回で体が変わる。産後専門が伴走。禁止：商品名のみ・「〇〇の悩み」という名詞止め）"
  }
}`;
    return isEn ? `You are a world-class marketing strategist. Perform a SWOT Analysis for the following business, reflecting the current 2026 market environment.
${getLangInstruction(c.lang)}

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
${jsonTemplate}` : `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のSWOT分析を行ってください。2026年現在の市場環境を反映してください。
${getLangInstruction(c.lang)}${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
${jsonTemplate}`;
  },

  stp: (c) => {
    const isEn = c.lang === "en";
    const jsonTemplate = isEn ? `{
  "framework": "STP Analysis",
  "why": "Why STP Analysis matters for this business (1 sentence, plain text)",
  "items": {
    "Segmentation (divide by desire)": ["Most promising customer segment defined by the depth of problem they face 1", "Segment defined by their ideal future outcome and high purchase motivation 2", "Underserved niche segment this business could capture that competitors overlook 3"],
    "Targeting (who deserves your full focus)": ["Top priority segment to focus on right now — explain why (depth of need, buying power, word-of-mouth reach) 1", "Specific pain point this segment is experiencing right now, in vivid detail 2", "How to win against competitors specifically for this segment 3"],
    "Positioning (your place in their mind)": ["Unique position competitors have NOT claimed that this business can own 1", "One-line positioning direction with an example tagline 2", "Most convincing proof point or fact that backs this position 3"]
  },
  "insight": "The core message that will resonate with this target and the first step to deliver it this week (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. No invented discounts, coupons, or events", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  },
  "positioning": {
    "x_label_left": "Left side of horizontal axis — most natural industry contrast (e.g., Budget / Mass-market / Broad)",
    "x_label_right": "Right side (e.g., Premium / Specialized / Niche)",
    "y_label_top": "Top of vertical axis (e.g., Emotional / Experiential / Wellness-focused)",
    "y_label_bottom": "Bottom of vertical axis (e.g., Functional / Practical / Fitness-focused)",
    "own": {"label": "${c.name}", "x": 0.7, "y": 0.6},
    "competitors": [
      {"label": "Budget gym chains", "x": -0.7, "y": -0.5},
      {"label": "Large yoga studios", "x": 0.1, "y": 0.0},
      {"label": "Online yoga apps", "x": -0.3, "y": 0.3}
    ]
  }
}` : `{
  "framework": "STP分析",
  "why": "STP分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Segmentation（欲求で分ける）": ["このビジネスの顧客を「抱えている悩みの深さ」で分けた最も有望なセグメント1", "「理想の未来のイメージ」で分けた購買意欲の高いセグメント2", "今すぐ狙えるのに見落とされているニッチなセグメント3"],
    "Targeting（最も変化を届けられる顧客）": ["今すぐ集中すべき最優先セグメントと、その理由（悩みの深さ・購買力・口コミ影響力）1", "このセグメントが今まさに抱えている具体的な悩みの姿2", "このセグメントに選ばれるために他社との戦い方3"],
    "Positioning（顧客の心の中での場所）": ["競合が占めていない、この事業者だけが主張できる独自のポジション1", "そのポジションを一言で表すキャッチコピーの方向性（例文付き）2", "そのポジションを証明する最も説得力のある事実・証拠3"]
  },
  "insight": "このターゲット顧客の心に刺さる最強のメッセージの核心と、今週それを発信する最初の一手（2文）",
  "actions": ["商品・サービスに関連する実際のハッシュタグや検索キーワードを使ったスマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・悩み・ライフスタイルを10〜20文字で）",
    "usp": "この事業者だけが言える独自の強み（競合が使えない言葉で15〜25文字）",
    "main_channel": "最も成果が出やすい主戦場チャネル（例: Instagram + 公式EC・LINE + 店舗・Google + チラシ）",
    "top_priority": "今月の最優先施策（具体的な行動レベルで20〜30文字）",
    "winning_message": "ターゲット顧客の心に刺さる最強のキャッチコピー（15〜25文字）"
  },
  "positioning": {
    "x_label_left": "この業界で最も自然な対立軸の左側（例: 低価格・一般的・広範囲など）",
    "x_label_right": "右側（例: 高価格・専門特化・ニッチなど）",
    "y_label_top": "縦軸の上側（例: 感情的価値・プレミアム・体験型など）",
    "y_label_bottom": "縦軸の下側（例: 機能的価値・スタンダード・実用型など）",
    "own": {"label": "${c.name}", "x": 自社のX軸位置（-1.0〜1.0の数値）, "y": 自社のY軸位置（-1.0〜1.0の数値）},
    "competitors": [
      {"label": "想定競合A（具体的な競合タイプ名）", "x": -0.5, "y": -0.5},
      {"label": "想定競合B", "x": 0.0, "y": 0.0},
      {"label": "想定競合C", "x": 0.3, "y": -0.3}
    ]
  }
}`;
    return isEn ? `You are a world-class marketing strategist. Perform an STP Analysis for the following business.
${getLangInstruction(c.lang)}

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
${jsonTemplate}` : `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のSTP分析を行ってください。
${getLangInstruction(c.lang)}${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent, c.lang)}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
${jsonTemplate}`;
  },

  "4p": (c) => {
    const isEn = c.lang === "en";
    const priceNote = isEn
      ? (c.price ? `${c.price} price point — explain what makes customers feel it's worth it, and how to communicate that value` : "the pricing strategy that best fits this business's positioning")
      : (c.price ? `${c.price}という価格設定が顧客に「高い」と感じさせる心理的原因と解消策` : "この商品の価値に見合った最適な価格設定と根拠");
    const jsonTemplate = isEn ? `{
  "framework": "4P / 4C Analysis",
  "why": "Why 4P/4C Analysis matters for this business (1 sentence, plain text)",
  "items": {
    "Product (what customers are really buying)": ["The emotion, experience, or life change customers want — not a feature description 1", "The one thing competitors cannot replicate, and how it solves the customer's real problem 2", "The single sentence customers would say to a friend after using this product or service 3"],
    "Price (bridging value and cost)": ["${priceNote} 1", "How to reframe price resistance as 'return on investment' in the customer's language 2", "The most effective way to increase perceived value without raising the actual price 3"],
    "Place (where customers find and buy)": ["The channel where this target customer most naturally discovers this type of business 1", "The fastest path from awareness to purchase — and where people drop off along the way 2", "The most impactful friction point to remove from the buying experience right now 3"],
    "Promotion (messages that move people)": ["The single highest-priority outreach tactic to start this week, and why it works 1", "A content strategy that starts from the customer's late-night worry — not a product feature 2", "A natural word-of-mouth trigger that doesn't require discounts or referral incentives 3"]
  },
  "insight": "The one P to tackle first this week and how fixing it changes the customer's experience (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. Do NOT suggest discounts, package deals, coupons, or referral programs not in the business description", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  }
}` : `{
  "framework": "4P / 4C分析",
  "why": "4P/4C分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Product（顧客が本当に買っているもの）": ["顧客がこの商品を通じて手に入れたい「感情・体験・人生の変化」（機能説明は禁止）1", "競合には絶対に真似できないこだわりと、それが顧客の悩みをどう解決するか2", "この商品を使った後に顧客が周りに言いたくなる一言3"],
    "Price（価値と価格の橋渡し）": ["${c.price ? `${c.price}という価格設定で顧客に「高い」と感じさせる心理的原因と解消策` : "この商品の価値に見合った最適な価格設定と根拠"}1", "価格への抵抗感を「投資対効果・LTV」に変える言葉の作り方（入口価格と継続価格を分けて設計する視点を含む）2", "価格を上げずに知覚価値を高める最も効果的な方法3"],
    "Place（顧客が買いやすい場所と導線）": ["このターゲット顧客が最も自然に出会える接点チャネル1", "「知る→興味→買う」の最短導線設計と離脱しやすいポイント2", "今すぐ改善できる購入障壁の取り除き方3"],
    "Promotion（顧客の心を動かすメッセージと広告空白）": ["今すぐ始められる最優先集客施策と、それが効く理由（SNS・MEO・チラシなど）1", "顧客の「今夜の悩み」から始まるコンテンツ戦略（認知段階・比較検討段階・購入後段階で使い分ける）2", "口コミ・紹介が自然に起きる仕掛けの具体案（ダブルファネルの継続・紹介・発信フェーズの設計）3"]
  },
  "ad_strategy": {
    "core_target": "広告のコア層：最もペインが深く購買確度が高い層（年齢・状況・悩みを具体的に）",
    "extended_target": "拡張層：コア層と共鳴するインサイトを持つ周辺層（コア層より広い層・潜在需要層）",
    "meta_ads_gap": "Meta広告でこの業種・商品カテゴリが攻略できる空白領域と推奨訴求軸",
    "google_ads_gap": "Google検索広告で競合が未出稿・弱い優先キーワード軸",
    "creative_axis": "最も効果が期待できるクリエイティブの訴求タイプ（ペイン直撃型 / 機能証明型 / ブランド安心型 / UGC体験談型 から選択・理由付き）"
  },
  "insight": "最初に着手すべき最重要のPと、それで顧客の人生がどう変わるかを伝える今週の一手（2文）",
  "actions": [
    "【絶対条件：広告費・外部依頼・イベント企画・インフルエンサー依頼は禁止。スマホのみ・今週中・30分以内・無料で完結するアクションのみ】具体的なアプリ名・ハッシュタグ・文章例・実行後に確認するKPIをセットで書くこと（例：Instagramで「#産後ダイエット神奈川」を付けてビフォーアフター投稿を作成→24時間後のリーチ数とプロフィール訪問数を記録する）",
    "【同条件・別チャネル】2つ目のアクション（例：Googleマップの口コミ依頼DM文を作成し過去顧客3名にLINEで送る→1週間で口コミ件数を確認する）",
    "【同条件・競合分析系】3つ目のアクション（例：競合上位3社のInstagramで保存数の多い投稿3〜5件を分析し、自社との差異をメモして次の投稿テーマに反映する）"
  ],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・具体的な悩みを含む20文字以内。例：30代産後ダイエット挫折経験ありの主婦）",
    "usp": "この事業者だけが正直に言えるファクト（競合が使えない具体的な言葉・強み・資格・歴史で20文字以内。入力に証拠数値がない場合は数字を作らず定性的な独自性を書くこと。ハルシネーション禁止）",
    "main_channel": "この業種・ターゲットで最も費用対効果が高いチャネル（Googleマップ/Instagram/LINE/チラシ等。ECは飲食・物販以外は記載禁止）",
    "top_priority": "今月だけに集中する施策を1つ（スマホで実行可能な具体的行動を25文字以内で）",
    "winning_message": "フック力のあるキャッチコピー（25文字以内厳守・数字か感情トリガーを必ず含める。例：週2回で体が変わる。産後専門が伴走。禁止：商品名のみ・「〇〇の悩み」という名詞止め）"
  }
}`;
    return isEn ? `You are a world-class marketing strategist. Perform a 4P / 4C Analysis for the following business.
${getLangInstruction(c.lang)}

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
${jsonTemplate}` : `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社の4P/4C分析を行ってください。
${getLangInstruction(c.lang)}${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent, c.lang)}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
${jsonTemplate}`;
  },

  vrio: (c) => {
    const isEn = c.lang === "en";
    const jsonTemplate = isEn ? `{
  "framework": "VRIO Analysis",
  "why": "Why VRIO Analysis matters for this business (1 sentence, plain text)",
  "items": {
    "Value (impact on customer's life)": ["What customer pain disappears and what life change happens because of this strength 1", "How this value directly translates into revenue, loyalty, and repeat business 2", "Concrete proof or evidence that this value exceeds what competitors deliver 3"],
    "Rarity (what competitors lack)": ["Specific skill, knowledge, relationship, history, or asset competitors do NOT have 1", "Why this rarity makes customers feel there is no real alternative 2", "How to communicate this rarity in a way that lands with the target customer 3"],
    "Imitability (why it cannot be copied)": ["Specific barrier preventing competitors from replicating this — name the barrier (time, cost, culture, trust) 1", "Elements built over years that simply cannot be fast-tracked or purchased 2", "How to turn this inimitability into a brand story customers will remember and share 3"],
    "Organization (systems to maximize this strength)": ["Current practices or systems that effectively deliver this strength to customers 1", "Biggest missed opportunity — where this strength is being underused right now 2", "Highest-ROI improvement available this week with no budget required 3"]
  },
  "insight": "The single action this week that best leverages this business's strongest VRIO asset to attract customers (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. Only suggest platforms relevant to this business; do NOT invent promotions or events", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  }
}` : `{
  "framework": "VRIO分析",
  "why": "VRIO分析が重要な理由（1文、プレーンテキスト）",
  "items": {
    "Value（顧客の人生に与える価値）": ["この強みによって顧客のどんな悩みが消え、どんな人生の変化が生まれるか1", "その価値が売上・利益に繋がる具体的なメカニズム2", "競合と比べてこの価値がどれだけ大きいかを示す具体的な証拠3"],
    "Rarity（他社にない希少な資源）": ["競合が持っていない技術・ノウハウ・人材・関係性・歴史1", "この希少性が顧客に「ここしかない」と感じさせる理由2", "この希少性をまだ顧客に伝えられていない理由と伝え方3"],
    "Imitability（真似されない理由）": ["競合がコピーしようとしても越えられない参入障壁の具体的な内容1", "時間・コスト・文化・信頼の蓄積で真似できない要素2", "この模倣困難性をブランドストーリーとして顧客に伝える言葉3"],
    "Organization（強みを活かす仕組み）": ["この強みを最大限に顧客に届けられている仕組みと体制1", "強みを活かしきれていない最大の機会損失2", "今すぐ改善できる最も費用対効果の高い組織・仕組みの一手3"]
  },
  "insight": "この事業者の最大の強みを顧客の人生に届けるために今週最初にやるべき一手（2文）",
  "actions": [
    "【絶対条件：広告費・外部依頼・イベント企画・インフルエンサー依頼は禁止。スマホのみ・今週中・30分以内・無料で完結するアクションのみ】具体的なアプリ名・ハッシュタグ・文章例・実行後に確認するKPIをセットで書くこと（例：Instagramで「#産後ダイエット神奈川」を付けてビフォーアフター投稿を作成→24時間後のリーチ数とプロフィール訪問数を記録する）",
    "【同条件・別チャネル】2つ目のアクション（例：Googleマップの口コミ依頼DM文を作成し過去顧客3名にLINEで送る→1週間で口コミ件数を確認する）",
    "【同条件・競合分析系】3つ目のアクション（例：競合上位3社のInstagramで保存数の多い投稿3〜5件を分析し、自社との差異をメモして次の投稿テーマに反映する）"
  ],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・具体的な悩みを含む20文字以内。例：30代産後ダイエット挫折経験ありの主婦）",
    "usp": "この事業者だけが正直に言えるファクト（競合が使えない具体的な言葉・強み・資格・歴史で20文字以内。入力に証拠数値がない場合は数字を作らず定性的な独自性を書くこと。ハルシネーション禁止）",
    "main_channel": "この業種・ターゲットで最も費用対効果が高いチャネル（Googleマップ/Instagram/LINE/チラシ等。ECは飲食・物販以外は記載禁止）",
    "top_priority": "今月だけに集中する施策を1つ（スマホで実行可能な具体的行動を25文字以内で）",
    "winning_message": "フック力のあるキャッチコピー（25文字以内厳守・数字か感情トリガーを必ず含める。例：週2回で体が変わる。産後専門が伴走。禁止：商品名のみ・「〇〇の悩み」という名詞止め）"
  }
}`;
    return isEn ? `You are a world-class marketing strategist. Perform a VRIO Analysis for the following business.
${getLangInstruction(c.lang)}

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
${jsonTemplate}` : `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のVRIO分析を行ってください。
${getLangInstruction(c.lang)}${COMMON_RULES}
会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent, c.lang)}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
${jsonTemplate}`;
  },

  aeo: (c) => {
    const isEn = c.lang === "en";
    const aeoPrompt = isEn ? `You are a world-class marketing strategist. Generate AEO (Answer Engine Optimization) content for this business that is ready to copy and use immediately.
${getLangInstruction(c.lang)}
AEO = getting your brand cited as the best answer by ChatGPT, Perplexity, and Google AI summaries.
ABSOLUTE RULE: Never say "check this," "search for," or "ask ChatGPT." Every item must be complete, ready-to-copy content.

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
{
  "framework": "AEO (Answer Engine Optimization) Strategy",
  "why": "Why AEO matters for this business in the AI search era of 2026 (1 sentence, plain text)",
  "items": {
    "Ready-to-use Q&A content (copy to website / landing page)": [
      "Q: A specific question ${c.target} would actually type into an AI assistant about ${c.product}\\nA: Direct answer in the first 40 words. Include a unique fact, number, or differentiator that only ${c.name} can claim.",
      "Q: A question about how to use, expected results, or life change from ${c.product}\\nA: Direct answer in the first 40 words with concrete specifics.",
      "Q: A question about price, purchase decision, or how ${c.name} differs from alternatives\\nA: Direct answer that makes the case for choosing ${c.name} without invented discounts."
    ],
    "Ready-to-paste meta description (copy to HTML head)": [
      "[COPY TO HTML meta description] A complete 130-150 character description of ${c.name}'s ${c.product}. Lead with direct value, include a specific number or unique differentiator."
    ],
    "AI-quotable social posts (copy and post now)": [
      "[Post 1] A complete social media post with expert authority + specific data + unique insight about ${c.product}. Include 3-5 relevant hashtags.",
      "[Post 2] A complete post that directly answers a common customer question. Different angle from Post 1. Include 3-5 hashtags."
    ],
    "This week's implementation steps (smartphone, 30 min max)": [
      "Step 1: Exactly which page to update, what to write, and how to publish it — highest priority action",
      "Step 2: Second priority implementation step with specific location, content, and method",
      "Step 3: Third step — SNS bio, blog, or profile update with exact content to add"
    ]
  },
  "insight": "The single most important AEO action this business can take in the next 30 days to get cited by AI assistants (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. No invented promotions or events", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  }
}` : `あなたは世界トップクラスのマーケティングストラテジストだ。2026年のAI検索時代に対応した、今すぐコピーして使えるコンテンツを生成してください。入力言語に合わせて同じ言語で回答してください。
${getLangInstruction(c.lang)}${COMMON_RULES}

【絶対禁止】「〜を調べてみてください」「〜を確認してみましょう」「ChatGPTで検索して」などのユーザーへの宿題を一切書かない。全ての項目は「今すぐコピーして使える完成コンテンツ」のみ生成すること。

AI検索最適化とは：ChatGPT・Perplexity・Google AI概要などに自社ブランドが「最適解」として引用・推薦されるための戦略。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent, c.lang)}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
{
  "framework": "AI検索最適化（AEO）戦略",
  "why": "2026年にAI検索最適化が重要な理由（1文、プレーンテキスト）",
  "items": {
    "今すぐ使えるQ&Aコンテンツ（サイト・LPに貼るだけ）": [
      "Q: ${c.target}が実際にAIに入力しそうな具体的な疑問文（例: 「${c.product}を選ぶときに何を比較すべき？」）\\nA: 冒頭40文字で直接回答。${c.name}だけが言える独自の事実・数値・強みを含む完成した回答文",
      "Q: 使い方・効果・期待できる変化への具体的な疑問\\nA: 冒頭40文字で直接回答。読んだ人が「これだ」と感じる具体性のある完成した回答文",
      "Q: 価格・購入判断・競合との違いへの疑問\\nA: 冒頭40文字で直接回答。${c.name}を選ぶ理由が明確になる完成した回答文"
    ],
    "そのまま使えるmeta description（HTMLに貼り付け）": [
      "【コピーしてHTMLのmeta descriptionに貼る】${c.name}の${c.product}を説明する130〜150文字の完成文。冒頭で直接的価値を伝え、数値・独自強みを含む文章"
    ],
    "AI引用を増やすSNS投稿文（そのままコピー可）": [
      "【投稿文1】AIが引用しやすい「専門性＋具体的数値＋独自情報」を盛り込んだSNS投稿完成文。${c.product}に関連するハッシュタグ3〜5個付き",
      "【投稿文2】顧客の疑問に直接答える形式のSNS投稿完成文。別パターン。ハッシュタグ3〜5個付き"
    ],
    "今週の実装手順（スマホ1台・30分以内）": [
      "手順1: どのページに・何を・どう書くかまで明記した最優先の具体的な実装手順",
      "手順2: 2番目に優先すべき実装手順（具体的な場所・内容・方法を明記）",
      "手順3: 3番目の実装手順（SNS・ブログ・プロフィール等、どこに何を書くか明記）"
    ]
  },
  "insight": "このビジネスが1ヶ月でAI検索に引用されるために最初にやるべき最重要の一手（2文）",
  "actions": ["${c.product}に関連する実際の検索キーワードやハッシュタグを使ったスマホ一台で今週30分以内に完結できる具体的なアクション1", "同2", "同3"],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・悩み・ライフスタイルを10〜20文字で）",
    "usp": "この事業者だけが言える独自の強み（競合が使えない言葉で15〜25文字）",
    "main_channel": "最も成果が出やすい主戦場チャネル（例: Instagram + 公式EC・LINE + 店舗・Google + チラシ）。英語出力時はLINEを使わずInstagram / Google / Email / TikTok等グローバルチャネルを使うこと",
    "top_priority": "今月の最優先施策（具体的な行動レベルで20〜30文字）",
    "winning_message": "ターゲット顧客の心に刺さる最強のキャッチコピー（15〜25文字）"
  }
}`;
    return aeoPrompt;
  },

  ulssas: (c) => {
    const isEn = c.lang === "en";
    const jsonTemplate = isEn ? `{
  "framework": "ULSSAS Analysis",
  "why": "Why ULSSAS matters for this business in the social media age (1 sentence, plain text)",
  "items": {
    "UGC (moments customers want to share)": ["Specific experience or moment in this business that makes customers want to post immediately 1", "Natural, non-pushy way to encourage customers to share their experience after the service 2", "Real hashtags or search terms this target customer actually uses on social media 3"],
    "Like & Discovery (shares and SNS search)": ["Type of content this target audience would save or share without being asked — with a specific example 1", "Keyword and hashtag strategy to be found through in-app social search 2", "Post pattern that makes followers want to recommend this business to friends — specific format 3"],
    "Brand Search & Google Search": ["Intentional tactic to create moments where people search this business by name 1", "How to plant the 'when I think of X, I think of this brand' association in customers' minds 2", "Concrete step to turn word-of-mouth into name-based search volume 3"],
    "Purchase & Spread Cycle": ["Shortest path from social discovery to booking or purchase — and where people drop off 1", "System or moment that makes paying customers naturally create UGC after their experience 2", "Specific way to turn loyal customers into genuine brand advocates without discounts or referral programs 3"]
  },
  "insight": "The experience scenario most likely to go viral for this business, and the first step to start that cycle this week (2 sentences, plain text)",
  "actions": ["Specific action using real hashtags or search terms — completable in 30 min on a smartphone 1. Do NOT suggest referral discounts, coupon programs, or events not in the business description", "same 2", "same 3"],
  "strategy_summary": {
    "target": "Top priority customer segment (age, gender, pain point, lifestyle — under 25 words)",
    "usp": "Unique strength only this business can honestly claim (under 15 words)",
    "main_channel": "Best channel for this market: Instagram / Google / Email / Facebook / YouTube (NO LINE, no Japan-only apps)",
    "top_priority": "Single most important action this month (specific, under 20 words)",
    "winning_message": "Most compelling tagline for this target customer (under 15 words)"
  }
}` : `{
  "framework": "ULSSAS分析",
  "why": "SNS時代にULSSASが重要な理由（1文、プレーンテキスト）",
  "items": {
    "UGC（顧客が自然に投稿したくなる瞬間）": ["このビジネスで顧客が「これ投稿したい！」と感じる具体的な体験・瞬間の設計1", "顧客の悩みが解決された感動・驚きを投稿に変える自然な声かけの言葉2", "このターゲット顧客が使うSNSと、刺さるハッシュタグの具体例3"],
    "共感・拡散（いいねとSNS検索）": ["このターゲット顧客が思わず保存・シェアしたくなるコンテンツの特徴と具体例1", "SNS内検索で見つかるためのキーワード・ハッシュタグ戦略2", "フォロワーが「友達に教えたくなる」投稿パターンの具体的な作り方3"],
    "指名検索・Google検索": ["このビジネス名で検索されるきっかけを意図的に作る仕掛け1", "「○○といえば△△」という連想を顧客の頭に植え付ける施策2", "口コミ・紹介から指名検索を増やすための具体的な一手3"],
    "購買と拡散の循環": ["SNS・口コミから購入・予約までの最短導線と、脱落しやすいポイントの改善策1", "一度買った顧客が自然にUGCを生み出すサイクルを作る仕掛け2", "ロイヤル顧客がブランドの伝道師になる具体的な施策3"]
  },
  "insight": "このビジネスで最も拡散が起きやすい体験シナリオと、今週そのサイクルを始める最初の一手（2文）",
  "actions": [
    "【絶対条件：広告費・外部依頼・イベント企画・インフルエンサー依頼は禁止。スマホのみ・今週中・30分以内・無料で完結するアクションのみ】具体的なアプリ名・ハッシュタグ・文章例・実行後に確認するKPIをセットで書くこと（例：Instagramで「#産後ダイエット神奈川」を付けてビフォーアフター投稿を作成→24時間後のリーチ数とプロフィール訪問数を記録する）",
    "【同条件・別チャネル】2つ目のアクション（例：Googleマップの口コミ依頼DM文を作成し過去顧客3名にLINEで送る→1週間で口コミ件数を確認する）",
    "【同条件・競合分析系】3つ目のアクション（例：競合上位3社のInstagramで保存数の多い投稿3〜5件を分析し、自社との差異をメモして次の投稿テーマに反映する）"
  ],
  "strategy_summary": {
    "target": "最優先ターゲット顧客（年齢・性別・具体的な悩みを含む20文字以内。例：30代産後ダイエット挫折経験ありの主婦）",
    "usp": "この事業者だけが正直に言えるファクト（競合が使えない具体的な言葉・強み・資格・歴史で20文字以内。入力に証拠数値がない場合は数字を作らず定性的な独自性を書くこと。ハルシネーション禁止）",
    "main_channel": "この業種・ターゲットで最も費用対効果が高いチャネル（Googleマップ/Instagram/LINE/チラシ等。ECは飲食・物販以外は記載禁止）",
    "top_priority": "今月だけに集中する施策を1つ（スマホで実行可能な具体的行動を25文字以内で）",
    "winning_message": "フック力のあるキャッチコピー（25文字以内厳守・数字か感情トリガーを必ず含める。例：週2回で体が変わる。産後専門が伴走。禁止：商品名のみ・「〇〇の悩み」という名詞止め）"
  }
}`;
    return isEn ? `You are a world-class marketing strategist. Perform a ULSSAS Analysis for the following business.
${getLangInstruction(c.lang)}
ULSSAS = UGC → Like & Discovery → SNS Search → Brand/Google Search → Action (purchase) → Spread (repeat UGC cycle).

Business Name: ${c.name}
Product / Service: ${c.product}
Target Customer: ${c.target}
${getSiteContext(c.siteContent, c.lang)}${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}
Respond ONLY in the following JSON format:
${jsonTemplate}` : `あなたは世界トップクラスのマーケティングストラテジストだ。以下の会社のULSSAS分析（SNS時代の購買モデル）を行ってください。
${getLangInstruction(c.lang)}${COMMON_RULES}
ULSSASとは：UGC→Like→Search1（SNS検索）→Search2（指名検索）→Action→Spreadの拡散サイクルです。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${getSiteContext(c.siteContent, c.lang)}
${getIndustryContext(c.industry, c.lang)}
${getPriceContext(c.price, c.lang)}

以下のJSON形式のみで返答してください:
${jsonTemplate}`;
  }
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
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
        max_tokens: 3000,
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
    const { name, product, target, url, framework, industry, price, lang } = body;

    if (!name || !product || !target || !framework) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    const promptFn = FRAMEWORK_PROMPTS[framework];
    if (!promptFn) {
      return NextResponse.json({ error: "不明なフレームワークです" }, { status: 400 });
    }

    // URLがあれば実際にサイトを取得（失敗しても分析は続行）
    const siteContent = url ? await fetchSiteContent(url) : "";

    const prompt = promptFn({ name, product, target, url, siteContent, industry, price, lang });

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
