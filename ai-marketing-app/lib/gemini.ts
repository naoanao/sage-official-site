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
  booking_url?: string;
}

const CHANNEL_HINTS: Record<string, string> = {
  restaurant: "飲食店なので、Instagram投稿文・Googleレビュー返信文・LINE配信文を優先して使うこと。ブログや専門的なメール文は避ける。",
  salon: "美容サロンなので、Instagram投稿文・LINE配信文・予約促進告知文を優先。写真映えする文体にする。",
  ec: "EC・通販なので、Instagram投稿文・商品紹介文・プレゼント訴求のSNS文を優先。購入や詳細確認に誘導する文体にする。",
  professional: "士業・コンサルなので、ブログ記事冒頭・メール文・問い合わせ誘導文を優先。SNS投稿は使わない。丁寧で信頼感のあるトーンにする。",
  construction: "工務店・建設業なので、チラシ文・Googleレビュー返信文・LINE配信文を優先。地域密着・信頼感・実績を前面に出す文体にする。",
  other: "業種に合ったSNS投稿文・LINE配信文・告知文を使う。",
};

function buildPrompt(user: UserProfile): string {
  const channelHint = CHANNEL_HINTS[user.industry] ?? CHANNEL_HINTS["other"];
  const urlInstruction = user.booking_url
    ? `予約・購入・問い合わせのURLは必ず「${user.booking_url}」を使う。`
    : "架空のURL（example.comなど）は絶対に使わない。URLが必要な場合は「予約はDMまたはお電話で承っております」などの代替表現に置き換える。";

  return `あなたは優秀なマーケティング部長です。以下のユーザー情報をもとに、「今週やること」をちょうど3つ生成してください。

【絶対ルール】
- アクションの数は**必ずちょうど3つ**。4つ以上も2つ以下もNG
- フレームワーク名（3C・STP・4P など）は絶対に使わない。専門用語も禁止
- titleは「〜する」形式の短いアクション名（15文字以内）。例：「新規向け投稿をする」「リピーター限定LINEを送る」「口コミ返信をする」
- detailはそのアクションの目的・使い方を説明する一文（60文字以内）
- content_typeは業種・目的に合ったものを選ぶ。選択肢：「Instagram投稿文」「LINE配信文」「Googleレビュー返信文」「ブログ記事冒頭」「メール文」「告知文」「チラシ文」
- **【最重要】contentは「お客さんに直接届ける完成した文章」のこと。ビジネスオーナーへのアドバイスや内部メモは絶対に書かない。**
  - NG例：「SNSを活用してお客さんに告知しましょう」「価格を見直すことで売上が上がります」
  - OK例：ユーザーの業種・地域・サービス名を使ったオリジナルの投稿文・LINE文・チラシ文
- **このプロンプト内に書かれている文章例を絶対にそのまま出力しないこと。ユーザー情報から完全にオリジナルで生成すること。**
- **ユーザーが入力した固有名詞（店名・技法名・サービス名・地名など）は必ず日本語のままそのまま使う。英訳・ローマ字変換・言い換えは絶対にしない。**
- contentはコピーしてそのまま投稿・送信できる文体にする（絵文字・ハッシュタグも適宜含める）
- Instagram投稿文は3〜5文・ハッシュタグ5〜8個を目安にして実用的な長さにする
- Googleレビュー返信文：URLを含めない・感謝と再来店の温かい一文のみ・宣伝文句も入れない
- titleは「〜する」形式（例：「Instagram投稿を出す」「LINEを送る」「口コミに返信する」）。「〜して」「〜してください」「〜しましょう」は使わない
- content_typeとcontentの内容は必ず一致させる（「LINE配信文」と書いたらcontentもLINEで送る文章にする）
- 工務店・建設業のcontentに「ご来店」は使わない。「現地見積もり」「お問い合わせ」「現場調査」を使う
- ${urlInstruction}
- ${channelHint}

【ユーザー情報】
業種: ${user.industry}
仕事の内容: ${user.business_desc}
お客さんの特徴: ${user.customer_desc}
今一番困っていること: ${user.main_problem}
このアプリが完璧に機能したとき、どう変わりたいか: ${user.final_goal}

【出力形式（JSONのみ、コードブロック不要、actionsは必ず3要素）】
{"actions":[{"title":"〜する形式15文字以内","detail":"目的説明60文字以内","content_type":"Instagram投稿文","content":"お客さんに届けるコピペ用の完成文章"},{"title":"...","detail":"...","content_type":"...","content":"..."},{"title":"...","detail":"...","content_type":"...","content":"..."}]}`;
}

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq: API key not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini: API key not set");

  // gemini-1.5-flash は安定版。gemini-2.5-flash より確実に動く
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/** Googleレビュー返信文からURLを除去（コードで確実に処理） */
function sanitizeActions(actions: Action[]): Action[] {
  return actions.map((action) => {
    if (action.content_type === "Googleレビュー返信文") {
      // URLを除去
      action.content = action.content
        .replace(/https?:\/\/[^\s　、。！？\)）]+/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    // タイトルが「〜して」命令形の場合「〜する」に統一
    action.title = action.title.replace(/して$/, "する").replace(/してください$/, "する");
    return action;
  });
}

export async function generateWeeklyActions(user: UserProfile): Promise<Action[]> {
  const prompt = buildPrompt(user);
  const errors: string[] = [];

  for (const [name, caller] of [["Groq", callGroq], ["Gemini", callGemini]] as const) {
    // 500/503（一時的なエラー）のみ1回だけ再試行。429（レート制限）は即座に次のAPIへ
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await caller(prompt);
        const cleaned = text.replace(/```json|```/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("JSON not found in response");
        const json = JSON.parse(match[0]);
        if (Array.isArray(json.actions) && json.actions.length > 0) {
          return sanitizeActions(json.actions);
        }
        throw new Error("actions array is empty");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[${name}] attempt ${attempt + 1} failed:`, msg);
        errors.push(`${name}(${attempt + 1}): ${msg}`);

        // 429はレート制限 → 待っても意味ないので即座に次のAPIへ
        // API keyなし → 即座に次のAPIへ
        const isTransient = msg.includes("503") || msg.includes("500");
        if (!isTransient || attempt === 1) break;

        // 一時的なエラーのみ2秒待って再試行
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.error("All APIs failed:", errors.join(" | "));
  throw new Error(`生成に失敗しました。詳細: ${errors.join(" | ")}`);
}
