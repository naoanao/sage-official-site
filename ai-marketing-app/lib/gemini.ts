export interface Action {
  title: string;
  detail: string;
  content: string;
  content_type: string;
  completed?: boolean;
}

export interface UserProfile {
  industry: string;
  business_desc: string;
  customer_desc: string;
  main_problem: string;
  final_goal: string;
}

function buildPrompt(user: UserProfile): string {
  return `あなたは優秀なマーケティング部長です。以下のユーザー情報をもとに、「今週やること3つ」と、それぞれに対応する「そのままコピーして使えるコンテンツ」を生成してください。

【絶対ルール】
- フレームワーク名（3C、STP、4P など）は絶対に使わない
- 専門用語を使わない
- タスクの名前ではなく、実際に使える文章を生成する
- contentには投稿文・返信文・メール文など、そのままコピペで使える完成した文章を書く
- content_typeは「Instagram投稿文」「Googleレビュー返信文」「LINE配信文」「ブログ記事冒頭」「メール文」「告知文」などの中から最適なものを選ぶ
- ユーザーの業種・お客さん像・課題にぴったり合った内容にする
- contentの文章はすぐ使えるよう具体的に書く（絵文字・ハッシュタグも含める）
- 文章は自然な日本語で、お客さんに語りかけるトーンにする

【ユーザー情報】
業種: ${user.industry}
仕事の内容: ${user.business_desc}
お客さんの特徴: ${user.customer_desc}
今一番困っていること: ${user.main_problem}
このアプリが完璧に機能したとき、どう変わりたいか: ${user.final_goal}

【出力形式（JSONのみ、コードブロック不要）】
{"actions":[{"title":"短いタイトル（15文字以内）","detail":"なぜこれをやるか・どう使うかの説明（60文字以内）","content_type":"Instagram投稿文","content":"そのままコピペで使える完成した文章（投稿文・返信文・メール文など）"},{"title":"...","detail":"...","content_type":"...","content":"..."},{"title":"...","detail":"...","content_type":"...","content":"..."}]}`;
}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function generateWeeklyActions(user: UserProfile): Promise<Action[]> {
  const prompt = buildPrompt(user);
  const callers = [callGroq, callGemini];

  for (const caller of callers) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await caller(prompt);
        const cleaned = text.replace(/```json|```/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("JSON not found");
        const json = JSON.parse(match[0]);
        if (Array.isArray(json.actions) && json.actions.length > 0) {
          return json.actions;
        }
        throw new Error("actions empty");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = msg.includes("503") || msg.includes("500");
        if (!isRetryable || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  throw new Error("全APIで生成に失敗しました");
}
