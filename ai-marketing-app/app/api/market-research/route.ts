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
    // US-specific
    positioning_statement?: string;
    gtm_motion?: string;
    growth_levers?: string[];
    // Global-specific
    localization_gaps?: { market: string; adapt: string; keep: string }[];
    beachhead_market?: string;
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
// AI検索エンジン: Groq (llama-3.3-70b) をプライマリに
// Gemini API はクォータ超過のため無効化
// ───────────────────────────────────────────────────

async function searchWithGemini(query: string, systemContext: string, region: Region = "jp"): Promise<string> {
  // Gemini API quota exceeded — route through Groq with compact output (500 tokens to stay within TPM)
  const instruction = region === "us"
    ? `Expert US market researcher. Answer concisely in English with specific data points, real company names, statistics. Be brief but specific:`
    : region === "global"
    ? `Expert global market researcher. Answer concisely in English with specific data, company names, statistics. Be brief but specific:`
    : `日本市場の専門マーケター。以下のトピックについて、具体的な企業名・数値・事実を簡潔に日本語で回答してください:`;

  const prompt = `${systemContext}\n\n${instruction}\n${query}`;
  return await callGroqFallback(prompt, 500);
}

async function callGeminiFallback(prompt: string): Promise<string> {
  // Route to Groq since Gemini quota is exceeded
  return await callGroqFallback(prompt, 2000);
}

async function callGroqFallback(prompt: string, maxTokens = 1200): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("[callGroqFallback] GROQ_API_KEY not set");
    return "";
  }
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[callGroqFallback] Failed ${res.status}: ${errText.slice(0, 300)}`);
      return "";
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    if (!content) console.warn("[callGroqFallback] Empty response from Groq");
    return content;
  } catch (e) {
    console.error("[callGroqFallback] Error:", e);
    return "";
  }
}

// ───────────────────────────────────────────────────
// Tavily Search API — リアルタイムウェブ検索
// ───────────────────────────────────────────────────
async function searchWithTavily(query: string, options?: {
  maxResults?: number;
  includeDomains?: string[];
  searchDepth?: "basic" | "advanced";
}): Promise<{ title: string; content: string; url: string }[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    console.warn("[Tavily] TAVILY_API_KEY not set, skipping");
    return [];
  }
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: options?.searchDepth ?? "basic",
        max_results: options?.maxResults ?? 5,
        include_domains: options?.includeDomains,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[Tavily] ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);
      return [];
    }
    const data = await res.json();
    return (data.results ?? []) as { title: string; content: string; url: string }[];
  } catch (e) {
    console.warn("[Tavily] Error:", e);
    return [];
  }
}

// Tavily で楽天・Amazon JPから競合ブランドを検索
async function fetchCompetitorsViaTavily(product: string): Promise<string> {
  const query = `${product} ブランド ランキング おすすめ 比較 site:search.rakuten.co.jp OR site:amazon.co.jp`;
  const results = await searchWithTavily(query, {
    maxResults: 5,
    includeDomains: ["search.rakuten.co.jp", "amazon.co.jp", "kakaku.com", "cosme.net"],
    searchDepth: "basic",
  });

  if (results.length === 0) {
    // 楽天・Amazonに絞らずブランド比較ページを検索
    const fallbackResults = await searchWithTavily(
      `${product} おすすめ ブランド 比較 ランキング 日本`,
      { maxResults: 5, searchDepth: "basic" }
    );
    results.push(...fallbackResults);
  }

  if (results.length === 0) return "";

  const snippets = results.map(r => `${r.title}\n${r.content.slice(0, 300)}`).join("\n---\n");
  const extractPrompt = `以下は「${product}」に関する検索結果です。
この中から、この商品を直接販売している日本のブランド・メーカー名を最大5社抽出してください。
親会社・大企業ではなく、この商品カテゴリで直接競合するブランド名のみ、カンマ区切りで出力。

検索結果:
${snippets.slice(0, 1500)}

ブランド名（カンマ区切りのみ）:`;

  const brands = await callGroqFallback(extractPrompt, 150);
  return brands?.trim() ?? "";
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

  // Default: JP — 商品カテゴリに特化した競合を特定するクエリ
  return {
    // 商品名で直接検索し、そのカテゴリで競合するブランドを特定
    competitor_ranking: `「${product}」 ブランド 比較 おすすめ ランキング メーカー 市場シェア Amazon 楽天 2025`,
    // 口コミは商品カテゴリに絞り、実際の購入者の声を取得
    competitor_reviews: `「${product}」 口コミ レビュー 比較 「どれがいい」 「おすすめ」 Amazon 楽天 X Twitter 2025`,
    // 広告傾向も商品カテゴリで検索
    ad_landscape: `「${product}」 広告 Instagram Meta Google SNS マーケティング 訴求 2025 2026`,
    market_size: `${industryLabelJP(industry)} 市場規模 矢野経済 2025 2026`,
    government_stats: `${target} 統計 調査 厚生労働省 総務省 国土交通省 2024 2025${loc}`,
    ugc_needs: `「${product}」 Twitter X Instagram 「使ってみた」 「試してみた」 体験談 感想 2025`,
  };
}

// ───────────────────────────────────────────────────
// 総合3C分析プロンプト
// ───────────────────────────────────────────────────
function buildSynthesisPrompt(req: ResearchRequest, gathered: Record<string, string>, specificCompetitors = ""): string {
  const { product, target, industry, business_name, region = "jp" } = req;

  const regionLabel = region === "us" ? "US / English-speaking markets" : region === "global" ? "Global (JP + US)" : "日本市場";
  const outputLang = region === "us" ? "English" : "日本語";
  const sourceExamples = region === "us"
    ? "Amazon.com, G2, Trustpilot, Statista, IBISWorld, US Census Bureau, BLS"
    : region === "global"
    ? "Amazon JP/US, 楽天, G2, Trustpilot, 矢野経済, Statista, 厚労省/総務省, US Census"
    : "Amazon JP, 楽天, 矢野経済, 厚労省, 総務省";

  // ── JP synthesis prompt（簡潔版 — Groq TPM節約）
  if (region === "jp") {
    // gathered data を500字以内に切り詰め
    const trimData = (s: string) => s ? s.slice(0, 400) : "なし";
    const competitorHint = specificCompetitors
      ? `\n特定済み競合ブランド（必ずこの中から選ぶこと）: ${specificCompetitors.slice(0, 200)}`
      : "";
    return `日本市場の3C分析をJSONで出力してください。

商品: ${product} / ターゲット: ${target} / 業種: ${industry}${competitorHint}

調査データ:
競合: ${trimData(gathered.competitor_ranking)}
口コミ: ${trimData(gathered.competitor_reviews)}
広告: ${trimData(gathered.ad_landscape)}
市場: ${trimData(gathered.market_size)}
統計: ${trimData(gathered.government_stats)}
UGC: ${trimData(gathered.ugc_needs)}

ルール:
- データがない項目はAI知識で補完（「要調査」禁止）
- top_competitorsは必ず「${product}」という商品を直接販売しているブランド名を記入（業界の親会社・大手企業一般は不可。この商品カテゴリで実際に競合するブランドのみ）
- JSONのみ出力

{
  "customer": {
    "purchase_motives": ["動機1","動機2","動機3"],
    "pain_points": ["不満1","不満2","不満3"],
    "latent_needs": ["潜在ニーズ1","潜在ニーズ2"],
    "quantitative": ["統計データ1（出典）","統計データ2"]
  },
  "competitor": {
    "top_competitors": [
      {"name": "${product}を販売している競合ブランドA","strength": "強み","weakness": "弱み","ad_count": "広告傾向"},
      {"name": "競合ブランドB","strength": "強み","weakness": "弱み"},
      {"name": "競合ブランドC","strength": "強み","weakness": "弱み"}
    ],
    "ad_landscape": "広告全体の傾向",
    "white_space": "競合が取れていないギャップ"
  },
  "company_gaps": [
    {"gap": "競合弱み1","opportunity": "自社が取れる機会"},
    {"gap": "競合弱み2","opportunity": "機会"},
    {"gap": "競合弱み3","opportunity": "機会"}
  ],
  "market": {
    "market_size": "市場規模（出典）",
    "trend": "トレンド方向",
    "key_statistics": ["統計1","統計2","統計3"]
  },
  "usp_candidates": ["USP1","USP2","USP3"],
  "recommended_actions": ["今週のアクション1（30分以内）","アクション2","アクション3"],
  "sources": ["情報源1","情報源2","情報源3"]
}`;
  }

  // ── US synthesis prompt（compact — Groq TPM節約）
  if (region === "us") {
    const trimData = (s: string) => s ? s.slice(0, 400) : "none";
    const competitorHintUS = specificCompetitors ? `\nKnown direct competitors (use these): ${specificCompetitors.slice(0, 150)}` : "";
    return `US market 3C + ICP/GTM analysis. JSON only in English.
Product: ${product} | Target: ${target} | Industry: ${industryLabelUS(industry)}${competitorHintUS}
Competitors: ${trimData(gathered.competitor_ranking)}
VoC/Reviews: ${trimData(gathered.competitor_reviews)}
Ads: ${trimData(gathered.ad_landscape)}
Market: ${trimData(gathered.market_size)}
Demographics: ${trimData(gathered.government_stats)}
UGC/JTBD: ${trimData(gathered.ugc_needs)}
Rules: Use AI knowledge to fill gaps. Never say "requires further research". top_competitors MUST be brands that directly sell "${product}" as their product — NOT parent conglomerates or broad industry players. Output JSON only.
{"customer":{"purchase_motives":["m1","m2","m3"],"pain_points":["p1","p2","p3"],"latent_needs":["n1","n2"],"quantitative":["s1","s2"]},"competitor":{"top_competitors":[{"name":"BrandA that sells ${product}","strength":"s","weakness":"w","ad_count":"a"},{"name":"BrandB","strength":"s","weakness":"w"},{"name":"BrandC","strength":"s","weakness":"w"}],"ad_landscape":"hooks/offers/platforms","white_space":"gap"},"company_gaps":[{"gap":"g1","opportunity":"o1"},{"gap":"g2","opportunity":"o2"},{"gap":"g3","opportunity":"o3"}],"market":{"market_size":"$XB TAM (source)","trend":"direction","key_statistics":["s1","s2","s3"]},"positioning_statement":"For [ICP] who [problem], [Product] is [category] that [differentiator], unlike [competitor] which [weakness].","gtm_motion":"PLG/sales-led/community recommendation","growth_levers":["l1","l2","l3"],"usp_candidates":["u1","u2","u3"],"recommended_actions":["a1","a2","a3"],"sources":["s1","s2","s3"]}

Now fill in the actual content based on the research data above:`;
  }
  if (region === "us_DISABLED") {
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
- Where collected data exists: prioritize and cite it
- Where data is missing or insufficient: use Gemini's training knowledge to provide specific competitor names, real statistics, and genuine market intelligence — NEVER output "Requires further research" as a standalone answer
- Mark AI-estimated figures with "※AI estimate, ~2025"
- Cite sources for statistics where known (e.g. "TAM $12B (Grand View Research, 2025)")
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

  // ── Global synthesis prompt（compact — Groq TPM節約）
  const trimData = (s: string) => s ? s.slice(0, 400) : "none";
  return `Global market 3C + localization analysis. JSON only in English.
Product: ${product} | Target: ${target} | Industry: ${industryLabelUS(industry)}
Competitors: ${trimData(gathered.competitor_ranking)}
VoC: ${trimData(gathered.competitor_reviews)}
Ads/Platforms: ${trimData(gathered.ad_landscape)}
Market: ${trimData(gathered.market_size)}
Demographics: ${trimData(gathered.government_stats)}
UGC: ${trimData(gathered.ugc_needs)}
Rules: Use AI knowledge to fill gaps. Never say "requires further research". top_competitors MUST be specific brands that directly sell "${product}" — global, US, and JP leaders in THIS product category. Output JSON only.
{"customer":{"purchase_motives":["universal1","US-specific","JP-specific"],"pain_points":["universal1","US","JP"],"latent_needs":["n1","n2"],"quantitative":["global stat","US stat","JP stat"]},"competitor":{"top_competitors":[{"name":"Global brand selling ${product}","strength":"s","weakness":"w","ad_count":"platform"},{"name":"US brand","strength":"s","weakness":"w"},{"name":"JP brand","strength":"s","weakness":"w"}],"ad_landscape":"US:Meta/TikTok, JP:Instagram/LINE, EU:Meta/Google","white_space":"global gap"},"company_gaps":[{"gap":"g1","opportunity":"o1"},{"gap":"g2","opportunity":"o2"},{"gap":"g3","opportunity":"o3"}],"market":{"market_size":"Global $XB: NA 40%, APAC 30%, EMEA 25%","trend":"direction","key_statistics":["global","US","JP/APAC"]},"localization_gaps":[{"market":"US","adapt":"what to change","keep":"universal"},{"market":"Japan","adapt":"what to change","keep":"universal"}],"beachhead_market":"recommended first market with rationale","usp_candidates":["global USP","u2","u3"],"recommended_actions":["a1","a2","a3"],"sources":["s1","s2","s3"]}

Now fill in actual content:`;
  if (false) {
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
- Where collected data exists: prioritize and cite it
- Where data is missing: use Gemini training knowledge to fill in with specific competitors, real figures, and market intelligence — NEVER leave fields as "Requires further research"
- Mark AI-estimated figures with "※AI estimate, ~2025"
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
  } // end if (false)
} // end buildSynthesisPrompt

// ───────────────────────────────────────────────────
// 楽天・Amazon JPから実際の競合ブランドを取得
// ───────────────────────────────────────────────────
async function fetchRealCompetitorsJP(product: string): Promise<string> {
  const encoded = encodeURIComponent(product);

  // 楽天市場: レビュー件数順で検索（売れているブランドが上に来る）
  const rakutenUrl = `https://search.rakuten.co.jp/search/mall/${encoded}/?s=6&p=1`;

  try {
    const res = await fetch(rakutenUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[fetchRealCompetitorsJP] Rakuten status ${res.status}`);
    } else {
      const html = await res.text();

      // 商品タイトルを抽出（楽天HTML: h2タグ内のアンカーテキストが商品名）
      // bash検証済み: <h2[\s\S]*?<a[^>]*>([^<]{4,80})</a> で45件マッチ確認
      const h2Matches = [...html.matchAll(/<h2[^>]*>[\s\S]*?<a[^>]*>([^<]{4,80})<\/a>/g)]
        .map(m => m[1].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim())
        .filter(t => t.length > 4 && /[぀-鿿]/.test(t)); // 日本語テキストのみ
      const titleMatches = h2Matches.length > 0 ? h2Matches : [
        // fallback: class属性ベースのパターン（h2マッチが0件の場合）
        ...html.matchAll(/class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]{4,80})<\/a>/g),
        ...html.matchAll(/itemprop="name"[^>]*>([^<]{4,60})<\/span>/g),
      ].map(m => m[1].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim()).filter(t => t.length > 4);

      if (titleMatches.length >= 3) {
        console.log(`[fetchRealCompetitorsJP] Got ${titleMatches.length} titles from Rakuten`);
        // Groqにタイトル群からブランド名を抽出させる
        const extractPrompt = `以下は楽天市場で「${product}」を検索した商品タイトル一覧です。
この中に含まれるブランド名・メーカー名を最大5社抽出し、カンマ区切りで出力してください。
商品説明や数値は除外し、固有のブランド・企業名のみ。

商品タイトル（上位${Math.min(titleMatches.length, 15)}件）:
${titleMatches.slice(0, 15).join("\n")}

ブランド名（カンマ区切り）:`;
        const brands = await callGroqFallback(extractPrompt, 150);
        if (brands && brands.trim().length > 2) {
          console.log("[fetchRealCompetitorsJP] Extracted brands:", brands.slice(0, 100));
          return brands.trim();
        }
      }
    }
  } catch (e) {
    console.warn("[fetchRealCompetitorsJP] Rakuten fetch error:", e);
  }

  // 楽天がダメならAmazon JP検索（ベストセラー順）
  const amazonUrl = `https://www.amazon.co.jp/s?k=${encoded}&s=review-rank`;
  try {
    const res = await fetch(amazonUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept-Language": "ja-JP,ja;q=0.9",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const html = await res.text();
      // Amazon: 商品タイトルはh2内spanまたはa-text-normal span
      const amzTitles = [
        ...[...html.matchAll(/<h2[^>]*>[\s\S]*?<span[^>]*>([^<]{4,80})<\/span>/g)],
        ...[...html.matchAll(/class="[^"]*a-text-normal[^"]*">([^<]{4,80})<\/span>/g)],
      ].map(m => m[1].trim())
        .filter(t => t.length > 4 && /[぀-鿿]/.test(t)) // 日本語テキストのみ
        .slice(0, 15);

      if (amzTitles.length >= 3) {
        console.log(`[fetchRealCompetitorsJP] Got ${amzTitles.length} titles from Amazon JP`);
        const extractPrompt = `以下はAmazon JPで「${product}」を検索した商品タイトル一覧です。
含まれるブランド名・メーカー名を最大5社、カンマ区切りで出力してください（ブランド名のみ）。

${amzTitles.join("\n")}

ブランド名:`;
        const brands = await callGroqFallback(extractPrompt, 150);
        if (brands && brands.trim().length > 2) return brands.trim();
      }
    }
  } catch (e) {
    console.warn("[fetchRealCompetitorsJP] Amazon fetch error:", e);
  }

  console.warn("[fetchRealCompetitorsJP] Both sources failed, returning empty");
  return "";
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

    // ── Step 0: リアルタイム競合ブランド取得（JPのみ）
    // 優先順位: Tavily検索 → 楽天直接スクレイピング → Groqフォールバック
    let specificCompetitors = "";
    if (region === "jp") {
      // 1st: Tavily APIで楽天・Amazon・価格比較サイトから検索
      specificCompetitors = await fetchCompetitorsViaTavily(product);
      console.log("[POST] Tavily competitors:", specificCompetitors.slice(0, 150));

      // 2nd: Tavilyが失敗 → 楽天直接スクレイピング
      if (!specificCompetitors || specificCompetitors.trim().length < 3) {
        console.warn("[POST] Tavily failed, trying direct Rakuten scraping");
        specificCompetitors = await fetchRealCompetitorsJP(product);
        console.log("[POST] Rakuten scraping competitors:", specificCompetitors.slice(0, 150));
      }

      // 3rd: 両方失敗 → Groqフォールバック（最終手段）
      if (!specificCompetitors || specificCompetitors.trim().length < 3) {
        console.warn("[POST] All real-data sources failed, falling back to Groq knowledge");
        const fallbackPrompt = `日本市場で「${product}」を販売しているブランドを5社、カンマ区切りで列挙してください。同じ商品形態・カテゴリの専門ブランドのみ（ブランド名のみ出力）:`;
        specificCompetitors = await callGroqFallback(fallbackPrompt, 150);
      }
    } else if (region === "us") {
      // US: Tavily でAmazon.com・G2・Redditから競合検索
      const tavilyResults = await searchWithTavily(
        `${product} brands comparison best top ranked site:amazon.com OR site:g2.com OR site:reddit.com`,
        { maxResults: 5, searchDepth: "basic" }
      );
      if (tavilyResults.length > 0) {
        const snippets = tavilyResults.map(r => `${r.title}\n${r.content.slice(0, 300)}`).join("\n---\n");
        const extractPrompt = `From these search results about "${product}", extract up to 5 US brand names that directly sell "${product}". Only specific brands in this product category — not parent conglomerates. Output brand names only, comma-separated.\n\n${snippets.slice(0, 1500)}\n\nBrands:`;
        specificCompetitors = await callGroqFallback(extractPrompt, 150);
      }
      if (!specificCompetitors || specificCompetitors.trim().length < 3) {
        const competitorLookupPrompt = `List the top 5 US brands that directly sell "${product}" as their product. Only brands in this specific product category — not parent companies or unrelated industry leaders. Brand names only, comma-separated.`;
        specificCompetitors = await callGroqFallback(competitorLookupPrompt, 150);
      }
    } else {
      // Global: Tavily でグローバル比較検索
      const tavilyResults = await searchWithTavily(
        `${product} best brands global comparison top brands`,
        { maxResults: 5, searchDepth: "basic" }
      );
      if (tavilyResults.length > 0) {
        const snippets = tavilyResults.map(r => `${r.title}\n${r.content.slice(0, 300)}`).join("\n---\n");
        const extractPrompt = `From these search results about "${product}", extract up to 5 global brand names that directly sell "${product}". Output brand names only, comma-separated.\n\n${snippets.slice(0, 1500)}\n\nBrands:`;
        specificCompetitors = await callGroqFallback(extractPrompt, 150);
      }
      if (!specificCompetitors || specificCompetitors.trim().length < 3) {
        const competitorLookupPrompt = `List top global, US, and JP brands that directly sell "${product}". Only brands in this exact product category. 5 brands max, names only.`;
        specificCompetitors = await callGroqFallback(competitorLookupPrompt, 150);
      }
    }

    const systemContext = region === "us"
      ? `You are an expert market researcher specializing in "${product}" as a specific product category within the ${industry} industry. Known direct competitors: ${specificCompetitors || "identify from research"}. Focus ONLY on brands that directly sell "${product}".`
      : region === "global"
      ? `You are an expert global market researcher focusing on "${product}" as a specific product category. Known direct competitors: ${specificCompetitors || "identify from research"}. Only include brands that directly sell "${product}".`
      : `あなたは日本市場の専門マーケターです。「${product}」を直接販売している競合ブランドの分析をしています。この商品の直接競合として特定済みのブランド: ${specificCompetitors || "リサーチから特定"}。この商品カテゴリで直接競合するブランドのみ回答してください。`;

    // Groq TPM制限対策: 3並列×2バッチ で実行（逐次より速く、並列より TPM 節約）
    const [r1, r2, r3] = await Promise.allSettled([
      searchWithGemini(queries.competitor_ranking, systemContext, region),
      searchWithGemini(queries.competitor_reviews, systemContext, region),
      searchWithGemini(queries.ad_landscape, systemContext, region),
    ]);
    // 少し待機してTPMをリセット
    await new Promise(resolve => setTimeout(resolve, 3000));
    const [r4, r5, r6] = await Promise.allSettled([
      searchWithGemini(queries.market_size, systemContext, region),
      searchWithGemini(queries.government_stats, systemContext, region),
      searchWithGemini(queries.ugc_needs, systemContext, region),
    ]);

    const gathered: Record<string, string> = {
      competitor_ranking: r1.status === "fulfilled" ? r1.value : "",
      competitor_reviews: r2.status === "fulfilled" ? r2.value : "",
      ad_landscape: r3.status === "fulfilled" ? r3.value : "",
      market_size: r4.status === "fulfilled" ? r4.value : "",
      government_stats: r5.status === "fulfilled" ? r5.value : "",
      ugc_needs: r6.status === "fulfilled" ? r6.value : "",
    };

    // 収集データを3Cに統合（Groq合成 — 2000トークン、TPM節約のため少し待機）
    await new Promise(resolve => setTimeout(resolve, 2000));
    const synthesisPrompt = buildSynthesisPrompt(body, gathered, specificCompetitors);
    let synthRaw = await callGroqFallback(synthesisPrompt, 2000);

    if (!synthRaw || synthRaw.trim().length < 50) {
      console.error("[POST] Synthesis completely empty. Groq API may be down or quota exceeded.");
      return NextResponse.json(
        { error: "AI分析に失敗しました。Groq APIの状態を確認するか、時間をおいて再試行してください。" },
        { status: 500 }
      );
    }

    // JSON抽出（```json ブロックも対応）
    let jsonStr: string | null = null;
    const codeBlockMatch = synthRaw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const rawMatch = synthRaw.match(/\{[\s\S]*\}/);
      if (rawMatch) jsonStr = rawMatch[0];
    }

    if (!jsonStr) {
      console.error("[POST] Could not extract JSON from synthesis. Raw (first 500):", synthRaw.slice(0, 500));
      return NextResponse.json(
        { error: "レスポンスの解析に失敗しました。再試行してください。" },
        { status: 500 }
      );
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[POST] JSON.parse failed:", parseErr, "jsonStr (first 300):", jsonStr.slice(0, 300));
      return NextResponse.json(
        { error: "JSON解析に失敗しました。再試行してください。" },
        { status: 500 }
      );
    }

    const a = analysis as {
      customer?: CustomerData;
      competitor?: CompetitorData & { top_competitors?: CompetitorItem[] };
      company_gaps?: CompanyGap[];
      market?: MarketData;
      positioning_statement?: string;
      gtm_motion?: string;
      growth_levers?: string[];
      localization_gaps?: { market: string; adapt: string; keep: string }[];
      beachhead_market?: string;
      usp_candidates?: string[];
      recommended_actions?: string[];
      sources?: string[];
    };

    const result: ResearchResult = {
      status: "success",
      research: {
        customer: a.customer ?? { purchase_motives: [], pain_points: [], latent_needs: [], quantitative: [] },
        competitor: a.competitor ?? { top_competitors: [], ad_landscape: "", white_space: "" },
        company_gaps: a.company_gaps ?? [],
        market: a.market ?? { market_size: "", trend: "", key_statistics: [] },
        // US-specific fields
        ...(a.positioning_statement && { positioning_statement: a.positioning_statement }),
        ...(a.gtm_motion && { gtm_motion: a.gtm_motion }),
        ...(a.growth_levers && { growth_levers: a.growth_levers }),
        // Global-specific fields
        ...(a.localization_gaps && { localization_gaps: a.localization_gaps }),
        ...(a.beachhead_market && { beachhead_market: a.beachhead_market }),
        usp_candidates: a.usp_candidates ?? [],
        recommended_actions: a.recommended_actions ?? [],
        sources: a.sources ?? [],
      },
      summary: region === "us"
        ? `3C analysis for "${product}" complete. Identified ${a.competitor?.top_competitors?.length ?? 0} competitors and ${a.company_gaps?.length ?? 0} differentiation opportunities.`
        : `${product}の3C分析が完了しました。競合${a.competitor?.top_competitors?.length ?? 0}社を特定し、${a.company_gaps?.length ?? 0}個の差別化機会を発見しました。`,
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
