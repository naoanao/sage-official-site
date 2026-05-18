/**
 * /api/market-research
 *
 * Growl 3C自動市場調査API（JP / US / Global 対応）
 *
 * Gemini 2.0 Flash + Google Search Grounding を使い、
 * リアルタイムのウェブ情報を収集して3C分析に整理する。
 *
 * region = "jp":    Amazon JP・楽天・矢野経済・厚労省・総務省
 * region = "us":    Amazon.com・G2・Trustpilot・Statista・IBISWorld・US Census
 * region = "global": JP + US 両方のソースをカバー
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

// ───────────────────────────────────────────────────
// 型定義
// ───────────────────────────────────────────────────
type Region = "jp" | "us" | "global";

interface ResearchRequest {
  industry: string;       // "restaurant" | "salon" | "ec" | "construction" | "health" | "education" | "professional"
  product: string;        // 商品・サービス名
  target: string;         // ターゲット顧客
  business_name?: string; // 店舗・企業名（オプション）
  location?: string;      // 所在地域
  keywords?: string[];    // 追加の検索キーワード（オプション）
  region?: Region;        // "jp" | "us" | "global"（デフォルト: "jp"）
}

interface ResearchResult {
  status: "success" | "partial" | "error";
  research: {
    customer: CustomerData;
    competitor: CompetitorData;
    company_gaps: CompanyGap[];
    market: MarketData;
    usp_candidates: string[];
    recommended_actions: string[];
    sources: string[];
  };
  summary: string;
  generated_at: string;
}

interface CustomerData {
  purchase_motives: string[];    // 購買動機（★5レビューから）
  pain_points: string[];         // 離脱理由・バリア（★2-3レビューから）
  latent_needs: string[];        // 潜在ニーズ（X・UGCから）
  quantitative: string[];        // 定量データ（政府統計から）
}

interface CompetitorData {
  top_competitors: CompetitorItem[];
  ad_landscape: string;          // Meta/Google広告の傾向
  white_space: string;           // 競合が埋められていないギャップ
}

interface CompetitorItem {
  name: string;
  strength: string;
  weakness: string;             // ★2-3レビューから
  ad_count?: string;
}

interface CompanyGap {
  gap: string;                  // 競合の弱み＝自社が入れるポイント
  opportunity: string;          // 具体的な機会
}

interface MarketData {
  market_size: string;           // 市場規模（矢野経済等）
  trend: string;                 // トレンド方向
  key_statistics: string[];      // 重要統計
}

// ───────────────────────────────────────────────────
// Gemini + Google Search Grounding
// ───────────────────────────────────────────────────
async function searchWithGemini(query: string, systemContext: string, region: Region = "jp"): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";

  try {
    const instruction = region === "us"
      ? `Research the following and summarize in English with specific data points, company names, and source citations:`
      : region === "global"
      ? `Research the following and summarize in English (with Japanese where available) including specific data, company names, and source citations:`
      : `以下について最新のウェブ情報を調べて、具体的な数値・企業名・出典付きで日本語でまとめてください:`;

    const prompt = `${systemContext}\n\n${instruction}\n${query}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!res.ok) {
      return await callGeminiFallback(prompt);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

async function callGeminiFallback(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

async function callGroqFallback(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

// ───────────────────────────────────────────────────
// 業種ラベル（JP / US）
// ───────────────────────────────────────────────────
function industryLabelJP(industry: string): string {
  const map: Record<string, string> = {
    restaurant: "飲食店 外食",
    salon: "美容サロン 美容院",
    ec: "EC 通販 ネットショップ",
    construction: "工務店 リフォーム 建設",
    health: "整体 鍼灸 マッサージ",
    education: "塾 学習塾 教育",
    professional: "士業 コンサル",
  };
  return map[industry] ?? industry;
}

function industryLabelUS(industry: string): string {
  const map: Record<string, string> = {
    restaurant: "restaurant food service",
    salon: "beauty salon hair",
    ec: "e-commerce online store",
    construction: "construction remodeling contractor",
    health: "health wellness massage chiropractic",
    education: "tutoring education learning",
    professional: "consulting professional services",
  };
  return map[industry] ?? industry;
}

// ───────────────────────────────────────────────────
// 3C分析 各ステップの検索クエリ設計（JP / US / Global）
// ───────────────────────────────────────────────────
function buildSearchQueries(req: ResearchRequest) {
  const { product, target, industry, location, region = "jp" } = req;
  const loc = location ? ` ${location}` : "";

  if (region === "us") {
    // US market: tap into Reddit communities, industry-specific review platforms,
    // direct response ad intelligence, and authoritative research sources
    const industryReviewSite = industry === "ec" ? "site:g2.com OR site:capterra.com OR site:producthunt.com"
      : industry === "restaurant" ? "site:yelp.com OR site:tripadvisor.com OR site:opentable.com"
      : industry === "salon" ? "site:yelp.com OR site:vagaro.com OR site:mindbodyonline.com"
      : industry === "construction" ? "site:angi.com OR site:houzz.com OR site:thumbtack.com OR site:bbb.org"
      : industry === "health" ? "site:yelp.com OR site:healthgrades.com OR site:zocdoc.com"
      : industry === "education" ? "site:reddit.com OR site:coursereport.com OR site:niche.com"
      : "site:g2.com OR site:clutch.co OR site:trustpilot.com";

    return {
      // Step1: Real competitor intelligence — "best X" searches + alternatives
      competitor_ranking: `"best ${product}" OR "top ${product}" OR "${product} alternatives" OR "${product} vs" ${industryReviewSite} 2025`,

      // Step2: Voice of customer — Reddit threads are gold in US market
      // High-rated (what they love) + critical reviews (pain points) + switch triggers
      competitor_reviews: `site:reddit.com "${product}" OR "${industryLabelUS(industry)}" ("what do you recommend" OR "switched from" OR "disappointed" OR "love" OR "best option" OR "avoid") 2025`,

      // Step3: Ad intelligence — US direct response: hook angle, offer structure, CTA
      // US ads lead with: pain agitation, social proof, free trial/guarantee, FOMO
      ad_landscape: `${product} ad copy "free trial" OR "money-back guarantee" OR "as seen on" OR "join 10000" site:facebook.com/ads OR Meta ad library ${industryLabelUS(industry)} marketing strategy 2025`,

      // Step4: Market size — TAM/SAM/SOM + funding signals (Crunchbase shows category health)
      market_size: `${industryLabelUS(industry)} market size TAM billion Statista OR IBISWorld OR "Grand View Research" OR Crunchbase funding 2025 2026`,

      // Step5: Demographics — Pew Research + Census + BLS + eMarketer for digital behavior
      government_stats: `${target} demographics income education "Pew Research" OR "US Census" OR "Bureau of Labor Statistics" OR eMarketer 2024 2025${loc}`,

      // Step6: UGC / unmet needs — Reddit "looking for X" reveals jobs-to-be-done
      ugc_needs: `site:reddit.com "${industryLabelUS(industry)}" ("looking for" OR "wish there was" OR "frustrated" OR "no solution" OR "nobody solves") 2025`,
    };
  }

  if (region === "global") {
    // Global market: identify which regional markets are accessible + platform fragmentation
    // + localization requirements + universal vs. culture-specific positioning
    return {
      // Competitor landscape across key markets (US, UK, APAC, LATAM, EMEA)
      competitor_ranking: `"best ${product}" OR "top ${product}" global market site:g2.com OR site:capterra.com OR site:amazon.com OR 楽天 OR site:trustpilot.com 2025`,

      // Cross-market voice of customer: what works in US vs. JP vs. EU
      competitor_reviews: `${product} reviews Reddit Trustpilot G2 口コミ "worth it" OR "disappointed" OR "better than" cross-market 2025`,

      // Global ad strategy: what platforms dominate by region
      // US: Meta/Google/TikTok | EU: Meta/Google | APAC: TikTok/LINE/Kakao | LATAM: WhatsApp/Meta
      ad_landscape: `${product} ${industryLabelUS(industry)} global marketing strategy "international" OR "expansion" Meta Google TikTok LinkedIn 2025 2026`,

      // Global market size + regional breakdown + growth rates by geography
      market_size: `${industryLabelUS(industry)} global market size regional breakdown APAC EMEA Americas Statista OR "Grand View Research" 2025 2026`,

      // Demographics by key English + Japanese speaking markets
      government_stats: `${target} global demographics "US Census" OR "Eurostat" OR OECD OR 総務省 statistics consumer behavior 2024 2025${loc}`,

      // UGC: international communities where target audience discusses problems
      ugc_needs: `site:reddit.com "${product}" OR "${industryLabelUS(industry)}" international OR global OR "in my country" 2025`,
    };
  }

  // Default: JP
  return {
    competitor_ranking: `${product} Amazon 楽天 ランキング 人気 競合 2025 2026`,
    competitor_reviews: `${product} 口コミ レビュー 「満足」 「残念」 比較 Amazon 楽天 2025`,
    ad_landscape: `${product} Instagram Meta広告 Google広告 SNSマーケティング 事例 2025 2026`,
    market_size: `${industryLabelJP(industry)} 市場規模 矢野経済 2025 2026`,
    government_stats: `${target} 統計 調査 厚生労働省 総務省 国土交通省 2024 2025${loc}`,
    ugc_needs: `${product} Twitter X Instagram 「使ってみた」 「試してみた」 体験談 感想 2025`,
  };
}

// ───────────────────────────────────────────────────
// 総合3C分析プロンプト
// ───────────────────────────────────────────────────
function buildSynthesisPrompt(req: ResearchRequest, gathered: Record<string, string>): string {
  const { product, target, industry, business_name, region = "jp" } = req;

  const regionLabel = region === "us" ? "US / English-speaking markets" : region === "global" ? "Global (JP + US)" : "日本市場";
  const outputLang = region === "us" ? "English" : "日本語";
  const sourceExamples = region === "us"
    ? "Amazon.com, G2, Trustpilot, Statista, IBISWorld, US Census Bureau, BLS"
    : region === "global"
    ? "Amazon JP/US, 楽天, G2, Trustpilot, 矢野経済, Statista, 厚労省/総務省, US Census"
    : "Amazon JP, 楽天, 矢野経済, 厚労省, 総務省";

  // ── JP synthesis prompt (unchanged — Growl's core strength)
  if (region === "jp") {
    return `あなたはGrowlの市場調査AIです。以下のウェブ調査結果を基に3C分析をJSON形式で出力してください。

【調査対象】
商品・サービス: ${product}
ターゲット顧客: ${target}
業種: ${industry}
${business_name ? `店舗・企業名: ${business_name}` : ""}

【収集した実データ】
■ 競合・ランキング情報:
${gathered.competitor_ranking || "データ未取得"}

■ 口コミ・レビュー分析:
${gathered.competitor_reviews || "データ未取得"}

■ 広告・SNS動向:
${gathered.ad_landscape || "データ未取得"}

■ 市場規模・トレンド:
${gathered.market_size || "データ未取得"}

■ 政府統計・定量データ:
${gathered.government_stats || "データ未取得"}

■ SNS口コミ・潜在ニーズ:
${gathered.ugc_needs || "データ未取得"}

【出力ルール】
- 上記の実データのみを根拠に分析すること（AIの想像で補完しない）
- データがない項目は「要調査」と記載
- 数値は出典付きで記載（例: 「市場規模1,000億円（矢野経済2025年）」）
- JSONのみで出力（コードブロック・説明不要）

以下のJSON形式で出力:
{
  "customer": {
    "purchase_motives": ["★5レビューから抽出した購買動機1", "購買動機2", "購買動機3"],
    "pain_points": ["★2〜3レビューから抽出した離脱理由・不満1", "不満2", "不満3"],
    "latent_needs": ["X・UGCから抽出した潜在ニーズ1", "潜在ニーズ2"],
    "quantitative": ["政府統計等の定量データ1（出典付き）", "定量データ2"]
  },
  "competitor": {
    "top_competitors": [
      {"name": "競合A（実際の企業・商品名）", "strength": "競合Aの強み", "weakness": "競合Aの弱み（レビューから）", "ad_count": "Meta広告件数等"},
      {"name": "競合B", "strength": "強み", "weakness": "弱み"},
      {"name": "競合C", "strength": "強み", "weakness": "弱み"}
    ],
    "ad_landscape": "Meta/Google広告の全体傾向（実データから）",
    "white_space": "競合が埋められていないギャップ（差別化チャンス）"
  },
  "company_gaps": [
    {"gap": "競合の弱み1＝自社が入れるポイント", "opportunity": "具体的な機会・施策"},
    {"gap": "競合の弱み2", "opportunity": "機会・施策"},
    {"gap": "競合の弱み3", "opportunity": "機会・施策"}
  ],
  "market": {
    "market_size": "市場規模（出典付き）",
    "trend": "成長・縮小・横ばい等のトレンド",
    "key_statistics": ["重要統計1（出典）", "重要統計2", "重要統計3"]
  },
  "usp_candidates": ["この分析から導き出せるUSP候補1", "USP候補2", "USP候補3"],
  "recommended_actions": ["今週実行できる具体的アクション1（スマホ1台・30分以内）", "アクション2", "アクション3"],
  "sources": ["使用した情報源1", "情報源2", "情報源3"]
}`;
  }

  // ── US synthesis prompt: American marketing frameworks
  // ICP, Jobs-to-be-done, Positioning statement, GTM motion, Growth levers
  if (region === "us") {
    return `You are a world-class US market strategist (think: top partner at McKinsey / ex-CMO of a SaaS unicorn).
Analyze the research data below and output a comprehensive market intelligence report in JSON.
Output language: English.

[Research Target]
Product/Service: ${product}
Target Customer: ${target}
Industry: ${industryLabelUS(industry)}
${business_name ? `Business Name: ${business_name}` : ""}

[Collected Research Data]
■ Competitor landscape (review platforms, rankings, alternatives):
${gathered.competitor_ranking || "No data collected"}

■ Voice of Customer — Reddit threads, reviews (praise + complaints + switch triggers):
${gathered.competitor_reviews || "No data collected"}

■ Ad intelligence — hooks, offer structures, CTAs, dominant platforms:
${gathered.ad_landscape || "No data collected"}

■ Market size — TAM/SAM, growth rate, funding signals:
${gathered.market_size || "No data collected"}

■ Demographics & psychographics (Pew, Census, BLS, eMarketer):
${gathered.government_stats || "No data collected"}

■ UGC / Jobs-to-be-done — Reddit "looking for", "wish there was", unmet needs:
${gathered.ugc_needs || "No data collected"}

[Output Rules]
- Base analysis ONLY on the collected data — do not fabricate figures
- Cite sources for all statistics (e.g. "TAM $12B (Grand View Research, 2025)")
- If data is insufficient, write "Requires further research"
- Output valid JSON only — no markdown, no code blocks

Output this exact JSON structure:
{
  "customer": {
    "purchase_motives": ["Top reason customers buy (from high-rated reviews/Reddit praise)", "reason2", "reason3"],
    "pain_points": ["Core frustration / reason they quit competitors (from critical reviews/Reddit complaints)", "pain2", "pain3"],
    "latent_needs": ["Jobs-to-be-done not yet solved (from Reddit 'looking for'/'wish' threads)", "need2"],
    "quantitative": ["Demographic/behavioral stat with citation (e.g. '73% of US millennials... — Pew 2024')", "stat2"]
  },
  "competitor": {
    "top_competitors": [
      {"name": "Actual competitor name", "strength": "What they dominate (channels, price, brand)", "weakness": "Where customers complain / switch triggers", "ad_count": "Ad spend signal or platform dominance"},
      {"name": "Competitor B", "strength": "strength", "weakness": "weakness"},
      {"name": "Competitor C", "strength": "strength", "weakness": "weakness"}
    ],
    "ad_landscape": "Dominant ad hooks and offer structures in this category (e.g. 'free trial dominates; pain-agitation-solution copy pattern; TikTok UGC drives lowest CAC')",
    "white_space": "The specific gap no competitor owns — the positioning opportunity"
  },
  "company_gaps": [
    {"gap": "Competitor weakness = entry point", "opportunity": "Specific GTM tactic to win this segment"},
    {"gap": "gap2", "opportunity": "tactic2"},
    {"gap": "gap3", "opportunity": "tactic3"}
  ],
  "market": {
    "market_size": "TAM/SAM figure with source (e.g. '$8.5B TAM, $1.2B SAM — Statista 2025')",
    "trend": "Growth trajectory and key driver (e.g. 'Growing 14% CAGR driven by AI adoption')",
    "key_statistics": ["Key stat with source", "stat2", "stat3"]
  },
  "positioning_statement": "For [ICP] who [urgent problem], [Product] is the [category] that [unique differentiator], unlike [key competitor] which [their weakness].",
  "gtm_motion": "Recommended go-to-market: PLG / sales-led / community-led / content-led — with rationale from data",
  "growth_levers": ["Top growth lever (e.g. 'Reddit community seeding in r/[subreddit] — highest intent audience')", "lever2", "lever3"],
  "usp_candidates": ["USP candidate derived from white space 1", "USP2", "USP3"],
  "recommended_actions": ["Highest-leverage action this week (specific, measurable, free)", "action2", "action3"],
  "sources": ["source1", "source2", "source3"]
}`;
  }

  // ── Global synthesis prompt: market-entry + localization intelligence
  return `You are a world-class global expansion strategist (think: McKinsey Global Institute / ex-VP of International Growth).
Analyze the research data and output a global market intelligence report in JSON.
Output language: English (include Japanese notes where Japan-specific data exists).

[Research Target]
Product/Service: ${product}
Target Customer: ${target}
Industry: ${industryLabelUS(industry)} / ${industryLabelJP(industry)}
${business_name ? `Business Name: ${business_name}` : ""}
Target Markets: Global (prioritize US, Japan, and key growth regions)

[Collected Research Data]
■ Global competitor landscape:
${gathered.competitor_ranking || "No data collected"}

■ Cross-market voice of customer:
${gathered.competitor_reviews || "No data collected"}

■ Platform & ad landscape by region:
${gathered.ad_landscape || "No data collected"}

■ Global market size & regional breakdown:
${gathered.market_size || "No data collected"}

■ Cross-market demographics:
${gathered.government_stats || "No data collected"}

■ International community signals (Reddit, UGC):
${gathered.ugc_needs || "No data collected"}

[Output Rules]
- Base analysis ONLY on collected data — do not fabricate figures
- Cite all statistics with source and year
- Flag which insights are US-specific vs. Japan-specific vs. universal
- Output valid JSON only

Output this exact JSON structure:
{
  "customer": {
    "purchase_motives": ["Universal buying trigger (works across markets)", "US-specific motive", "JP-specific motive"],
    "pain_points": ["Universal pain point", "US-market pain", "JP-market pain"],
    "latent_needs": ["Unmet need that crosses markets", "region-specific need"],
    "quantitative": ["Global stat with source", "US stat", "JP stat"]
  },
  "competitor": {
    "top_competitors": [
      {"name": "Global leader", "strength": "What they dominate globally", "weakness": "Where they fail internationally", "ad_count": "Platform presence"},
      {"name": "US market leader", "strength": "strength", "weakness": "weakness"},
      {"name": "JP market leader", "strength": "strength", "weakness": "weakness"}
    ],
    "ad_landscape": "Platform fragmentation by region: US (Meta/Google/TikTok), JP (Instagram/LINE/TikTok), EU (Meta/Google), LATAM (Meta/WhatsApp). Dominant creative format and offer structure per region.",
    "white_space": "The positioning gap that exists across multiple markets simultaneously"
  },
  "company_gaps": [
    {"gap": "Global competitor weakness", "opportunity": "Market entry angle that exploits this gap"},
    {"gap": "gap2", "opportunity": "tactic2"},
    {"gap": "gap3", "opportunity": "tactic3"}
  ],
  "market": {
    "market_size": "Global TAM with regional breakdown (e.g. 'Global $45B: North America 42%, APAC 31%, EMEA 22% — Statista 2025')",
    "trend": "Global growth direction + which region is growing fastest and why",
    "key_statistics": ["Global stat", "US market stat", "JP/APAC stat"]
  },
  "localization_gaps": [
    {"market": "US", "adapt": "What must be localized for US (copy tone, offer structure, platform)", "keep": "What is universal"},
    {"market": "Japan", "adapt": "What must be localized for JP (relationship-first, LINE, trust signals)", "keep": "What is universal"}
  ],
  "beachhead_market": "Recommended first market to enter with rationale — which geography has highest ICP density + lowest competition + strongest product-market fit signal",
  "usp_candidates": ["Global USP (works across cultures)", "USP2", "USP3"],
  "recommended_actions": ["Highest-leverage global action this week", "action2", "action3"],
  "sources": ["source1", "source2", "source3"]
}`;
}

// ───────────────────────────────────────────────────
// ハンドラ
// ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: ResearchRequest = await req.json();
    const { industry, product, target } = body;

    if (!industry || !product || !target) {
      return NextResponse.json(
        { error: "industry, product, target は必須です" },
        { status: 400 }
      );
    }

    const region = body.region ?? "jp";
    const queries = buildSearchQueries(body);
    const systemContext = region === "us"
      ? `You are an expert market researcher specializing in the ${industry} industry in English-speaking markets. You are researching the market for: ${product}.`
      : region === "global"
      ? `You are an expert global market researcher covering both Japanese and English-speaking markets in the ${industry} industry. Research target: ${product}.`
      : `あなたは日本市場の${industry}業界に精通したマーケティングリサーチャーです。${product}の市場を調査しています。`;

    // 並列で各ステップのウェブ検索を実行
    const [
      competitor_ranking,
      competitor_reviews,
      ad_landscape,
      market_size,
      government_stats,
      ugc_needs,
    ] = await Promise.allSettled([
      searchWithGemini(queries.competitor_ranking, systemContext, region),
      searchWithGemini(queries.competitor_reviews, systemContext, region),
      searchWithGemini(queries.ad_landscape, systemContext, region),
      searchWithGemini(queries.market_size, systemContext, region),
      searchWithGemini(queries.government_stats, systemContext, region),
      searchWithGemini(queries.ugc_needs, systemContext, region),
    ]);

    const gathered: Record<string, string> = {
      competitor_ranking: competitor_ranking.status === "fulfilled" ? competitor_ranking.value : "",
      competitor_reviews: competitor_reviews.status === "fulfilled" ? competitor_reviews.value : "",
      ad_landscape: ad_landscape.status === "fulfilled" ? ad_landscape.value : "",
      market_size: market_size.status === "fulfilled" ? market_size.value : "",
      government_stats: government_stats.status === "fulfilled" ? government_stats.value : "",
      ugc_needs: ugc_needs.status === "fulfilled" ? ugc_needs.value : "",
    };

    // 収集データを3Cに統合
    const synthesisPrompt = buildSynthesisPrompt(body, gathered);
    let synthRaw = await callGeminiFallback(synthesisPrompt);
    if (!synthRaw) synthRaw = await callGroqFallback(synthesisPrompt);

    if (!synthRaw) {
      return NextResponse.json(
        { error: "AI統合分析に失敗しました。時間をおいて再試行してください。" },
        { status: 500 }
      );
    }

    // JSON抽出
    const match = synthRaw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: "レスポンスの解析に失敗しました" },
        { status: 500 }
      );
    }

    const analysis = JSON.parse(match[0]);

    const result: ResearchResult = {
      status: "success",
      research: {
        customer: analysis.customer ?? { purchase_motives: [], pain_points: [], latent_needs: [], quantitative: [] },
        competitor: analysis.competitor ?? { top_competitors: [], ad_landscape: "", white_space: "" },
        company_gaps: analysis.company_gaps ?? [],
        market: analysis.market ?? { market_size: "", trend: "", key_statistics: [] },
        // US-specific fields
        ...(analysis.positioning_statement && { positioning_statement: analysis.positioning_statement }),
        ...(analysis.gtm_motion && { gtm_motion: analysis.gtm_motion }),
        ...(analysis.growth_levers && { growth_levers: analysis.growth_levers }),
        // Global-specific fields
        ...(analysis.localization_gaps && { localization_gaps: analysis.localization_gaps }),
        ...(analysis.beachhead_market && { beachhead_market: analysis.beachhead_market }),
        usp_candidates: analysis.usp_candidates ?? [],
        recommended_actions: analysis.recommended_actions ?? [],
        sources: analysis.sources ?? [],
      },
      summary: region === "us"
        ? `3C analysis for "${product}" complete. Identified ${analysis.competitor?.top_competitors?.length ?? 0} competitors and ${analysis.company_gaps?.length ?? 0} differentiation opportunities.`
        : `${product}の3C分析が完了しました。競合${analysis.competitor?.top_competitors?.length ?? 0}社を特定し、${analysis.company_gaps?.length ?? 0}個の差別化機会を発見しました。`,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    description: "Growl 3C自動市場調査API",
    method: "POST",
    body: {
      industry: "string (restaurant|salon|ec|construction|health|education|professional)",
      product: "string - 商品・サービス名",
      target: "string - ターゲット顧客",
      business_name: "string? - 店舗・企業名（オプション）",
      location: "string? - 所在地域（オプション）",
      keywords: "string[]? - 追加キーワード（オプション）",
      region: "string? - 'jp' | 'us' | 'global' (default: 'jp')",
    },
    note: "Gemini 2.0 Flash + Google Search Grounding でリアルタイム情報収集。所要時間: 30〜60秒",
  });
}
