export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const FRAMEWORK_PROMPTS: Record<string, (c: CompanyInfo) => string> = {
  pest: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のPEST分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}
${c.url ? `Webサイト: ${c.url}` : ""}

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "PEST分析",
  "why": "PEST分析が重要な理由（1文）",
  "items": {
    "P（政治・法規制）": ["具体的な気づき1", "具体的な気づき2", "具体的な気づき3"],
    "E（経済・市場動向）": ["具体的な気づき1", "具体的な気づき2", "具体的な気づき3"],
    "S（社会・トレンド）": ["具体的な気づき1", "具体的な気づき2", "具体的な気づき3"],
    "T（技術・AI）": ["具体的な気づき1", "具体的な気づき2", "具体的な気づき3"]
  },
  "insight": "この分析から見えるチャンスと注意点（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
}`,

  "3c": (c) => `あなたはプロのマーケティングストラテジストです。以下の会社の3C分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "3C分析",
  "why": "3C分析が重要な理由（1文）",
  "items": {
    "Customer（顧客・市場）": ["顧客が本当に求めていること1", "市場の変化2", "購買行動の特徴3"],
    "Competitor（競合）": ["競合の強み1", "競合の弱み2", "差別化できるポイント3"],
    "Company（自社）": ["自社の強み1", "活かすべきリソース2", "改善すべき課題3"]
  },
  "insight": "3Cから見えてくる自社の勝ち筋（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
}`,

  swot: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のSWOT分析を日本語で行ってください。
分析は2026年現在の市場環境を前提にしてください。COVID-19はすでに収束済みとして扱い、現在進行中のトレンド（AI技術の普及、物価高騰、人口減少・高齢化、Z世代消費行動、SNSマーケティングの変化等）を反映した脅威・機会として分析してください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "SWOT分析",
  "why": "SWOT分析が重要な理由（1文）",
  "items": {
    "Strength（強み）": ["強み1", "強み2", "強み3"],
    "Weakness（弱み）": ["弱み1", "弱み2", "弱み3"],
    "Opportunity（機会）": ["機会1", "機会2", "機会3"],
    "Threat（脅威）": ["脅威1", "脅威2", "脅威3"]
  },
  "insight": "SO戦略（強みで機会を活かす）の具体的な一手（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
}`,

  stp: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のSTP分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "STP分析",
  "why": "STP分析が重要な理由（1文）",
  "items": {
    "Segmentation（市場細分化）": ["セグメント軸1", "セグメント軸2", "各セグメントの特徴3"],
    "Targeting（ターゲット選定）": ["狙うべきセグメント1", "選ぶ理由2", "市場規模の見立て3"],
    "Positioning（ポジション）": ["競合との差別化軸1", "独自のポジション2", "刺さるキャッチコピーの方向性3"]
  },
  "insight": "このSTPに基づくマーケティングメッセージの核心（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
}`,

  "4p": (c) => `あなたはプロのマーケティングストラテジストです。以下の会社の4P/4C分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "4P / 4C分析",
  "why": "4P/4C分析が重要な理由（1文）",
  "items": {
    "Product / 顧客価値": ["提供すべき機能・価値1", "差別化できる特徴2", "顧客が得るベネフィット3"],
    "Price / 顧客コスト": ["適切な価格帯と根拠1", "価格設定戦略2", "顧客の心理的コスト低減策3"],
    "Place / 利便性": ["最適な販売チャネル1", "購入導線の設計2", "アクセシビリティ向上策3"],
    "Promotion / コミュニケーション": ["最優先のプロモーション施策1", "SNS・コンテンツ戦略2", "口コミ・紹介を生む仕掛け3"]
  },
  "insight": "最初に着手すべきPと具体的なアクション（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
}`,

  vrio: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のVRIO分析を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "VRIO分析",
  "why": "VRIO分析が重要な理由（1文）",
  "items": {
    "Value（経済価値）": ["顧客課題を解決する強み1", "利益につながるリソース2", "競合に対する優位性3"],
    "Rarity（希少性）": ["競合が持っていない希少な要素1", "独自のノウハウ・技術2", "参入障壁となる要素3"],
    "Imitability（模倣困難）": ["真似しにくい理由1", "時間・コストがかかる要素2", "ブランド・関係性の強み3"],
    "Organization（組織体制）": ["強みを活かせる体制1", "改善すべき組織課題2", "次のステップ3"]
  },
  "insight": "持続的競争優位を生む最大の強みとその磨き方（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
}`,

  aeo: (c) => `あなたはプロのデジタルマーケティングストラテジストです。2026年のAI検索時代に向けた以下の会社のAEO（AI検索最適化）戦略を日本語で立案してください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

AEOとは：ChatGPT・Perplexity・Google AI Overviewsなどの「回答生成AI」に自社ブランドが「最適解」として引用・推薦されるための戦略です。

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "AEO（AI検索最適化）戦略",
  "why": "2026年にAEOが重要な理由（1文）",
  "items": {
    "AI Visibility Audit": ["ChatGPT/Gemini/Perplexityに自社ブランドを聞いた際の現状把握方法1", "競合との比較方法2", "改善すべき情報発信のギャップ3"],
    "Answer-first コンテンツ": ["AIが引用しやすいコンテンツ構造1", "結論先行型の書き方2", "50〜70文字で答えるFAQ設計3"],
    "E-E-A-T（権威性）": ["専門家としての信頼証明方法1", "独自データ・一次情報の活用2", "メディア掲載・引用獲得策3"],
    "LLM Citation戦略": ["AIに引用される情報発信の具体策1", "構造化データの実装方法2", "SNSでのブランド言及を増やす方法3"]
  },
  "insight": "最初の1ヶ月でAI検索に引用されるために最優先でやること（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
}`,

  ulssas: (c) => `あなたはプロのSNSマーケティングストラテジストです。以下の会社のULSSAS分析（SNS時代の購買モデル）を日本語で行ってください。

会社名: ${c.name}
商品・サービス: ${c.product}
ターゲット顧客: ${c.target}

ULSSASとは：UGC→Like→Search1（SNS検索）→Search2（指名検索）→Action→Spreadの拡散サイクルです。

以下のJSON形式のみで返答してください（説明文不要）:
{
  "framework": "ULSSAS分析",
  "why": "SNS時代にULSSASが重要な理由（1文）",
  "items": {
    "UGC（ユーザー生成コンテンツ）": ["顧客が投稿したくなる仕掛け1", "投稿を促すキャンペーン案2", "ハッシュタグ戦略3"],
    "Like & Search1（SNS検索対策）": ["いいねを集めるコンテンツの工夫1", "SNS検索で見つかるハッシュタグ設計2", "エンゲージメント向上策3"],
    "Search2（指名検索・Google）": ["ブランド名で検索される仕掛け1", "SEO対策の優先施策2", "指名検索を増やすオフライン施策3"],
    "Action & Spread（購買・拡散）": ["購入への導線設計1", "口コミ・紹介を生む仕掛け2", "リピーター化する施策3"]
  },
  "insight": "このビジネスで最も拡散が起きやすいUGCのシナリオ（2文）",
  "actions": ["今週できる具体的なアクション1", "今週できる具体的なアクション2", "今週できる具体的なアクション3"]
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
