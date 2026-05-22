// Vercel Cron: 毎朝7時JST (前日22:00 UTC)
// 【フォールバック専用】Sageが起動していない日のバックアップ
// 通常はSage（backend/scheduler/market_scan_scheduler.py）が
// market_scan_notifier.py → growl_bridge.py 経由でSupabaseに書き込む。
// SageのPC が落ちている日だけこのCronが動く。
// LearnAIには一切触れない。

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { saveMarketSignal } from "@/lib/db";

const INDUSTRIES = [
  { key: "restaurant", label: "飲食店（カフェ・レストラン・居酒屋等）" },
  { key: "salon",      label: "美容サロン（美容院・ネイル・エステ等）" },
  { key: "ec",         label: "EC・通販（ハンドメイド・ギフト・食品EC等）" },
  { key: "professional", label: "士業・コンサル（税理士・社労士・コーチ等）" },
  { key: "construction", label: "工務店・建設（リフォーム・外構・内装等）" },
  { key: "other",      label: "その他の中小事業者・個人事業主" },
];

async function callGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 400,
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// Geminiフォールバック（Groq失敗時）
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
          generationConfig: { temperature: 0.5, maxOutputTokens: 400 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

function buildScanPrompt(industryLabel: string, today: string): string {
  return `あなたは日本のSNSマーケティングアナリストです。
今日の日付：${today}

【タスク】
日本の${industryLabel}が今週SNS・LINEで使える投稿テーマを分析してください。

【観点】
- 今の季節・時事に合った旬なテーマ
- この業種で今週特に反応が取れる切り口
- Instagram / LINE で効果的なアプローチ

【出力ルール】
- Markdown記号（**、##等）は一切使わない
- 3行以内のプレーンテキスト
- 具体的なテーマ・切り口を書く（抽象論は不要）
- 例：「今週は父の日ギフト訴求が最旬。感謝メッセージ付き商品写真でエンゲージメント◎」

出力（3行以内）：`;
}

export async function GET(req: NextRequest) {
  // Cron認証チェック
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const results: Record<string, string> = {};
  const errors: string[] = [];

  for (const industry of INDUSTRIES) {
    try {
      const prompt = buildScanPrompt(industry.label, today);
      // Groq優先、失敗時はGeminiにフォールバック
      const signal = await callGroq(prompt) ?? await callGemini(prompt);

      if (signal && signal.trim()) {
        const cleaned = signal.trim().replace(/\*\*/g, "").replace(/##/g, "").trim();
        await saveMarketSignal(industry.key, cleaned);
        results[industry.key] = cleaned;
      } else {
        errors.push(`${industry.key}: no response`);
      }

      // API負荷軽減のため少し待機
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${industry.key}: ${msg}`);
    }
  }

  console.log("Market scan completed:", { date: today, saved: Object.keys(results).length, errors });
  return NextResponse.json({
    status: "ok",
    date: today,
    saved: Object.keys(results).length,
    errors,
    preview: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [k, v.slice(0, 50) + "..."])
    ),
  });
}
