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
        temperature: 0.5,
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
    console.error("Diagnosis error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function _buildJapanesePrompt(
  industry: string, post_frequency: string, pain_type: string,
  review_managed: string, goal: string,
): string {
    return `あなたは小さなお店のSNS集客アドバイザーです。以下の回答から、この人の「今の状態」と「最初の一歩」を温かく、具体的に診断してください。

▼ この人の回答
- 業種: ${industry}
- SNSの頻度: ${post_frequency}
- いちばんの悩み: ${pain_type}
- レビュー対応: ${review_managed}
- 3ヶ月後の目標: ${goal}

▼ 診断ルール（「できてない」ではなく「まだのびしろがある」視点で）
- A (85-100点): SNSもレビューも目標も、全部やってる状態
- B (70-84点): だいたいできてるけど、どれか1つが手薄
- C (50-69点): たまに投稿してる。レビューは気になるけどできてない。やる気はある
- D (30-49点): 投稿が止まってる。レビューを見てはいる。始め方がわからない
- E (0-29点): まだSNSに手をつけられてない。きっかけ待ち

▼ アウトプット条件（重要。守らないと診断として機能しません）
- weakness: この人の「たった1つ直せば結果が出る」弱点を、具体的に15文字以内で。抽象禁止。「SNS更新頻度」や「投稿不足」ではなく、「〇〇の写真が少ない」「キャプションが短い」レベル。必ず「日本語」で出力すること。
- free_tip: 「今日、スマホで5分あればできる」行動を1つ。業種に合わせて具体的に。NG例「投稿を継続する」→ OK例「[主力のSNS]を開いて、[自社の製品やサービスの裏側・魅力]が伝わる写真を1枚だけストーリーズに上げる」。必ず「日本語」で出力すること。
- share_text: あなた自身が「これ、ちょっとシェアしたくなるな」と思える正直な一言（80文字以内）。他人に見せるとちょっと恥ずかしいけどリアルなやつ。例「うちのサービス、SNS集客力はC。機能アップデートは頑張ってたけどユーザーの声への返信ができてなかった。まずは先週のフィードバック3件、明日返します。」必ず「日本語」で出力すること。
- share_text_en: share_textを自然な英語にしたもの（80文字以内）

JSONだけを返してください。余計な説明禁止。コードブロック（\`\`\`）やマークダウンは絶対に禁止。生のJSON文字列のみを出力すること。
【最重要】出力するJSONの値（share_text_enを除く）は、絶対にすべて「日本語」で出力してください。英語（アルファベット）の回答は厳禁です。
{"rank":"A〜E","score":0〜100,"weakness":"具体的な弱点（日本語）","free_tip":"今すぐできる行動（日本語）","share_text":"正直でちょっと自虐的な一言（日本語）","share_text_en":"English version"}`;
}

function _buildEnglishPrompt(
  industry: string, post_frequency: string, pain_type: string,
  review_managed: string, goal: string,
): string {
  return `You are a warm, honest SNS coach for small business owners. Diagnose this person's current state and give them their first step.

▼ Their answers
- Industry: ${industry}
- SNS: ${post_frequency}
- Biggest pain: ${pain_type}
- Reviews: ${review_managed}
- 3-month goal: ${goal}

▼ Scoring (focus on "room to grow", not "you're failing")
- A (85-100): Posts often, replies to reviews, has clear measurable goals — they're doing it all
- B (70-84): Mostly there, one area could tighten up
- C (50-69): Posts now and then. Wants to do more. Reviews are irregular but they care.
- D (30-49): Posting has stalled. They check reviews but haven't replied yet. Not sure how to start.
- E (0-29): Hasn't begun yet. Just waiting for the right push.

▼ Output rules (CRITICAL — these make or break the quiz)
- weakness: ONE specific, actionable gap. NOT generic like "posting frequency". Must be concrete like "menu photos", "caption length", "review response time". Max 15 chars.
- free_tip: ONE thing they can do TODAY in 5 minutes on their phone. Tailored to their industry. NOT vague like "post more". Must be like "Open [primary SNS] and post one photo showing the behind-the-scenes of your service."
- share_text: Write something a real person would actually want to post on X/Twitter. Slightly self-deprecating, a little embarrassed, totally honest. Example: "My service scored a C on SNS marketing. Thought I was doing fine — turns out I haven't replied to a single user feedback in 2 weeks. Fixing that tomorrow." Max 80 chars.
- share_text_en: same as share_text (max 80 chars)

Output ONLY raw JSON. No explanations. DO NOT use markdown code blocks (```). No explanation.
{"rank":"A-E","score":0-100,"weakness":"...concrete...","free_tip":"...specific action...","share_text":"...real person talking...","share_text_en":"..."}`;
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
