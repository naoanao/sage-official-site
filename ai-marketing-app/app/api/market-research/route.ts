/**
 * /api/market-research
 *
 * Growl 3C自動市場調査API
 *
 * Notionの「3C分析 10ステップ調査手順」をAIで自動化。
 * Gemini 2.0 Flash + Google Search Grounding を使い、
 * リアルタイムのウェブ情報（競合LP・レビュー・広告・業界紙・政府統計）を
 * 収集して3C分析に整理する。
 *
 * 情報収集ステップ（Notionの手順に準拠）:
 *   Step3: Amazon・楽天ランキング → 競合特定
 *   Step4: 競合レビュー（★5 / ★2〜3）→ 強み・弱み抽出
 *   Step5: Meta広告ライブラリ → クリエイティブの型
 *   Step6: Google広告 → 出稿キーワード・コピー傾向
 *   Step7: 業界紙・矢野経済 → 市場規模・トレンド
 *   Step8: 厚労省・総務省 → 顧客の定量データ
 *   Step9: X・Amazon口コミ → 潜在ニーズ
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

// ───────────────────────────────────────────────────
// 型定義
// ───────────────────────────────────────────────────
interface ResearchRequest {
  industry: string;       // "restaurant" | "salon" | "ec" | "construction" | "health" | "education" | "professional"
  product: string;        // 商品・サービス名（例: "青汁サプリ"）
  target: string;         // ターゲット顧客（例: "40〜60代女性・健康意識高め"）
  business_name?: string; // 店舗・企業名（オプション）
  location?: string;      // 所在地域（例: "東京都渋谷区"）
  keywords?: string[];    // 追加の検索キーワード（オプション）
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
// 3C分析 各ステップの検索クエリ設計
// ───────────────────────────────────────────────────
function buildSearchQueries(req: ResearchRequest) {
  const { product, target, industry, location } = req;
  const loc = location ? ` ${location}` : "";

  return {
    // Step3: 競合特定（Amazon・楽天ランキング）
    competitor_ranking: `${product} Amazon 楽天 ランキング 人気 競合 2025 2026`,

    // Step4: 競合レビュー分析
    competitor_reviews: `${product} 口コミ レビュー 「満足」 「残念」 比較 Amazon 楽天 2025`,

    // Step5+6: 広告傾向
    ad_landscape: `${product} Instagram Meta広告 Google広告 SNSマーケティング 事例 2025 2026`,

    // Step7: 市場規模・業界トレンド
    market_size: `${industry === "restaurant" ? "飲食店 外食" : industry === "salon" ? "美容サロン 美容院" : industry === "ec" ? "EC 通販 ネットショップ" : industry === "construction" ? "工務店 リフォーム 建設" : industry === "health" ? "整体 鍼灸 マッサージ" : industry === "education" ? "塾 学習塾 教育" : "士業 コンサル"} 市場規模 矢野経済 2025 2026`,

    // Step8: 政府統計
    government_stats: `${target} 統計 調査 厚生労働省 総務省 国土交通省 2024 2025${loc}`,

    // Step9: SNS口コミ・潜在ニーズ
    ugc_needs: `${product} Twitter X Instagram 「使ってみた」 「試してみた」 体験談 感想 2025`,
  };
}

// ───────────────────────────────────────────────────
// 総合3C分析プロンプト
// ───────────────────────────────────────────────────
function buildSynthesisPrompt(req: ResearchRequest, gathered: Record<string, string>): string {
  const { product, target, industry, business_name } = req;

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
- 数値は出典付きで記載（例: 「市場規模1,000億円（健康産業新聞2025年）」）
- JSONのみで出力（コードブロック・説明不要）

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

    const queries = buildSearchQueries(body);
    const systemContext = `あなたは日本市場の${industry}業界に精通したマーケティングリサーチャーです。${product}の市場を調査しています。`;

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
      summary: `${product}の3C分析が完了しました。競合${analysis.competitor?.top_competitors?.length ?? 0}社を特定し、${analysis.company_gaps?.length ?? 0}個の差別化機会を発見しました。`,
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
    },
    note: "Gemini 2.0 Flash + Google Search Grounding でリアルタイム情報収集。所要時間: 30〜60秒",
  });
}
