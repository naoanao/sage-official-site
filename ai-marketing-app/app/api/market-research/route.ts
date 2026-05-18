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
async function searchWithGemini(query: string, systemContext: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";

  try {
    const prompt = `${systemContext}\n\n以下について最新のウェブ情報を調べて、日本語で具体的にまとめてください:\n${query}`;

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
      // Grounding非対応の場合はフォールバック（通常のGemini）
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
    return {
      competitor_ranking: `${product} Amazon best seller top brands competitors ranking site:amazon.com OR site:g2.com OR site:capterra.com 2025`,
      competitor_reviews: `${product} reviews Trustpilot G2 Reddit "love" "hate" "disappointed" "amazing" 2025`,
      ad_landscape: `${product} Facebook Meta ads Instagram Google ads marketing examples 2025 2026`,
      market_size: `${industryLabelUS(industry)} market size Statista IBISWorld "Grand View Research" OR "MarketsandMarkets" 2025 2026`,
      government_stats: `${target} statistics "US Census Bureau" OR "Bureau of Labor Statistics" OR CDC OR FDA 2024 2025${loc}`,
      ugc_needs: `${product} Reddit TikTok Instagram "tried" "review" "experience" "worth it" 2025`,
    };
  }

  if (region === "global") {
    return {
      competitor_ranking: `${product} Amazon best seller competitors ranking 2025 site:amazon.com OR site:amazon.co.jp OR 楽天`,
      competitor_reviews: `${product} reviews Trustpilot G2 Reddit 口コミ レビュー "love" "hate" 「満足」「残念」 2025`,
      ad_landscape: `${product} Meta Facebook Instagram Google ads SNS広告 marketing 2025 2026`,
      market_size: `${industryLabelUS(industry)} ${industryLabelJP(industry)} market size 市場規模 Statista 矢野経済 2025 2026`,
      government_stats: `${target} statistics census 統計 厚生労働省 総務省 2024 2025${loc}`,
      ugc_needs: `${product} Reddit TikTok Instagram Twitter X 「使ってみた」 "tried" "review" 体験談 2025`,
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

  return `You are Growl's market research AI. Based on the web research data below, output a 3C analysis in JSON format.
Output language: ${outputLang}. Target market: ${regionLabel}.

[Research Target]
Product/Service: ${product}
Target Customer: ${target}
Industry: ${industry}
${business_name ? `Business Name: ${business_name}` : ""}
Region/Market: ${regionLabel}
Preferred Sources: ${sourceExamples}

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

[Output Rules]
- Base analysis ONLY on the collected data above — do not fabricate information
- Items with no data: write "Requires further research" (or "要調査" for JP output)
- Include source citations for all statistics (e.g. "Market size $5B (Statista 2025)" or "市場規模1,000億円（矢野経済2025年）")
- Output JSON only — no code blocks, no explanation

以下のJSON形式で出力:
{
  "customer": {
    "purchase_motives": ["★5レビューから抽出した購買動機1", "購買動機2", "購買動機3"],
    "pain_points": ["★2-3レビューから抽出した離脱理由・不満1", "不満2", "不満3"],
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
      searchWithGemini(queries.competitor_ranking, systemContext),
      searchWithGemini(queries.competitor_reviews, systemContext),
      searchWithGemini(queries.ad_landscape, systemContext),
      searchWithGemini(queries.market_size, systemContext),
      searchWithGemini(queries.government_stats, systemContext),
      searchWithGemini(queries.ugc_needs, systemContext),
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
