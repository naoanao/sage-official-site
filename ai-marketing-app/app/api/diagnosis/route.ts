export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

interface DiagnosisRequest {
  industry: string;
  post_frequency: string;
  pain_type: string;
  review_managed: string;
  goal: string;
  lang?: string;
}

interface DiagnosisResult {
  rank: "A" | "B" | "C" | "D" | "E";
  rank_label: string;
  score: number;
  weakness: string;
  free_tip: string;
  share_text: string;
  share_text_en: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequest = await req.json();
    const { industry, post_frequency, pain_type, review_managed, goal, lang } = body;

    if (!industry || !post_frequency || !pain_type || !review_managed || !goal) {
      return NextResponse.json({ error: "All 5 answers are required" }, { status: 400 });
    }

    const isJapanese = lang === "ja";

    const prompt = isJapanese
      ? _buildJapanesePrompt(industry, post_frequency, pain_type, review_managed, goal)
      : _buildEnglishPrompt(industry, post_frequency, pain_type, review_managed, goal);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Groq API error: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    const result = _parseResponse(raw, isJapanese);
    return NextResponse.json(result);

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function _buildJapanesePrompt(
  industry: string, post_frequency: string, pain_type: string,
  review_managed: string, goal: string,
): string {
  return `あなたは中小企業のSNS集客力診断AIです。以下の回答から集客スコアを判定してください。

【回答】
- 業種: ${industry}
- SNS更新頻度: ${post_frequency}
- 一番の悩み: ${pain_type}
- レビュー管理: ${review_managed}
- 3ヶ月の目標: ${goal}

【判定ルール】
- A (85-100点): 週3回以上投稿、レビュー返信あり、具体的な数値目標あり
- B (70-84点): 週1-2回投稿、いずれかの要素が強い
- C (50-69点): 月数回投稿、改善の余地あり
- D (30-49点): ほとんど投稿していない、レビュー未対応
- E (0-29点): まったくSNSを使っていない

以下のJSONのみを返してください。説明文は不要です。
{
  "rank": "A"〜"E"のいずれか,
  "score": 数値(0-100),
  "weakness": "最も弱いポイントを一言で（20文字以内）",
  "free_tip": "今すぐできる具体的な改善アクション1つ（80文字以内）",
  "share_text": "Xでシェアしたくなる一言（改行含めて50文字以内）。例: 『私の店のSNS集客力は【C】でした。まずは週1投稿から始めます。』",
  "share_text_en": "English version of share_text (50 chars max)"
}`;
}

function _buildEnglishPrompt(
  industry: string, post_frequency: string, pain_type: string,
  review_managed: string, goal: string,
): string {
  return `You are an SNS marketing diagnostic AI for small businesses. Score the following answers.

[ANSWERS]
- Industry: ${industry}
- SNS posting frequency: ${post_frequency}
- Biggest pain point: ${pain_type}
- Review management: ${review_managed}
- 3-month goal: ${goal}

[SCORING RULES]
- A (85-100): 3+ posts/week, replies to reviews, has specific numeric goals
- B (70-84): 1-2 posts/week, some strong elements
- C (50-69): few posts/month, room for improvement
- D (30-49): almost no posting, ignoring reviews
- E (0-29): no SNS presence at all

Return ONLY the following JSON. No explanation.
{
  "rank": "A" through "E",
  "score": number 0-100,
  "weakness": "biggest weak point in one short phrase (max 20 chars)",
  "free_tip": "one specific, actionable improvement they can do today (max 80 chars)",
  "share_text": "a short, shareable one-liner for social media (max 50 chars). Example: 'My restaurant's SNS score is C. Starting with 1 post a week.'",
  "share_text_en": "English version of share_text (max 50 chars)"
}`;
}

function _parseResponse(raw: string, isJapanese: boolean): DiagnosisResult {
  try {
    let json = raw;
    if (json.includes("```")) {
      json = json.split("```")[1];
      if (json.startsWith("json\n")) json = json.slice(5);
    }
    const parsed = JSON.parse(json.trim());
    const validRanks = ["A", "B", "C", "D", "E"];
    const rank = validRanks.includes(parsed.rank) ? (parsed.rank as DiagnosisResult["rank"]) : "C";
    return {
      rank,
      rank_label: _rankLabel(rank, isJapanese),
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      weakness: String(parsed.weakness || (isJapanese ? "SNS更新頻度" : "Posting frequency")).slice(0, 30),
      free_tip: String(parsed.free_tip || (isJapanese ? "まずは週1回の投稿から始めてみましょう" : "Start with one post per week")).slice(0, 100),
      share_text: String(parsed.share_text || `My SNS marketing score is ${rank}`).slice(0, 80),
      share_text_en: String(parsed.share_text_en || `My SNS marketing score is ${rank}`).slice(0, 80),
    };
  } catch {
    // fallback if JSON parse fails
    const dummyRank = "C" as DiagnosisResult["rank"];
    return {
      rank: dummyRank,
      rank_label: _rankLabel(dummyRank, isJapanese),
      score: 50,
      weakness: isJapanese ? "SNS更新頻度" : "Posting frequency",
      free_tip: isJapanese ? "まずは週1回の投稿から始めてみましょう" : "Start with one post per week",
      share_text: isJapanese ? "私のSNS集客力はC判定。まずは週1投稿から。" : "My SNS score: C. Starting weekly posts now.",
      share_text_en: "My SNS score: C. Starting weekly posts now.",
    };
  }
}

function _rankLabel(rank: string, isJapanese: boolean): string {
  const labels: Record<string, string> = {
    A: isJapanese ? "SNS集客のプロ級！" : "Marketing Pro!",
    B: isJapanese ? "あと一歩で最上位" : "Almost There!",
    C: isJapanese ? "伸びしろたっぷり" : "Room to Grow",
    D: isJapanese ? "まずは土台づくりを" : "Time to Build Foundations",
    E: isJapanese ? "これから始めましょう" : "Let's Get Started!",
  };
  return labels[rank] || labels["C"];
}
