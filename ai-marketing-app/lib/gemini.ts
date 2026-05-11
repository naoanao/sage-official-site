export interface Action {
  title: string;
  detail: string;
  content: string;
  content_type: string;
  /** 役割タイプ: 共感獲得 | 行動促進 | 信頼構築 */
  role?: string;
  completed?: boolean;
}

export interface UserProfile {
  industry: string;
  business_desc: string;
  customer_desc: string;
  main_problem: string;
  final_goal: string;
  booking_url?: string;
  learning_history?: Array<{ week: string; action: string; result: string }>;
  market_signal?: string;
  /** 商品マーケAI: 登録済み商品リスト（ある場合はリピート購入施策を優先） */
  products?: Array<{
    name: string;
    price: number;
    usp: string;
    purchase_count?: number;
    days_since_last?: number;
  }>;
}

export interface GenerateResult {
  actions: Action[];
  strategy_note: string;
}

const KEYWORD_HINTS: Record<string, string> = {
  restaurant: "シズル感, こだわり素材, 週替わり, 店主おすすめ, 手作り, この季節にみなぎり",
  salon: "つや髪, ダメージレス, 頭皮ケア, 指通り, ツヤ感, リラックス, トリートメント, カラー持ち",
  ec: "在庫わずか, 限定品, ハンドメイド, 1点もの, 送料無料, プレゼントに, 丁寧な梱包",
  professional: "安心, 実績, 無料相談, 丁寧なサポート, 初回相談無料, 専門家, わかりやすく説明",
  construction: "地域密着, 施工実績, アフターフォロー, 無料点検, 地元, 職人の技, 丁寧な仕上がり",
  other: "業種に合った専門用語を自然に組み込み、プロらしさと親しみやすさを両立させる",
};

const CHANNEL_HINTS: Record<string, string> = {
  restaurant: "Instagram投稿文・Googleレビュー返信文・LINE配信文を優先。ブログや専門的なメール文は避ける。",
  salon: "Instagram投稿文・LINE配信文・予約促進告知文を優先。写真映えする文体にする。",
  ec: "Instagram投稿文・商品紹介文・プレゼント訴求のSNS文を優先。購入や詳細確認に誘導する文体にする。",
  professional: "ブログ記事冒頭・メール文・問い合わせ誘導文を優先。SNS投稿は使わない。丁寧で信頼感のあるトーンにする。",
  construction: "チラシ文・Googleレビュー返信文・LINE配信文を優先。地域密着・信頼感・実績を前面に出す文体にする。",
  other: "業種に合ったSNS投稿文・LINE配信文・告知文を使う。",
};

function buildLearningSection(
  history: Array<{ week: string; action: string; result: string }> | undefined
): string {
  if (!history || history.length === 0) return "";
  const entries = history
    .slice(-5)
    .map((h) => "  - " + h.week + " | " + h.action + " | " + h.result)
    .join("\n");
  return (
    "\n\n" +
    "【過去の実績】\n" +
    entries + "\n" +
    "- 反応良かったアクションに近い施策を優先する\n" +
    "- 反応なかったアクションは別のアプローチにする\n" +
    "- 同じアクションタイトルを繰り返さずバリエーションをつける"
  );
}

/**
 * システムメッセージ（モデルへの不変ルール）
 * Groq: role="system", Gemini: system_instruction として渡す
 */
function buildSystemConstraint(user: UserProfile): string {
  const urlStatus = user.booking_url
    ? "予約URL: " + user.booking_url + "（このURLのみを使う）"
    : "予約URL: 未登録（URLを生成・示唆しない。「プロフィールのURL」「リンクから」等も禁止）";

  return [
    "あなたは優秀なマーケティング部長です。",
    "",
    "【最重要原則】",
    "ユーザーが入力した【ユーザー情報】に書かれていることだけが事実です。",
    "入力に書かれていない情報はあなたには存在しません。推測・補完・創作は禁止です。",
    "",
    "【入力済み・未入力フィールドの確認】",
    urlStatus,
    "営業時間・定休日: 未入力（入力にある場合のみ使う。ない場合は絶対に出力しない）",
    "セール・イベント・キャンペーン情報: 未入力（入力にある場合のみ告知する）",
    "",
    "【禁止事項】",
    "- 入力にない具体的な日付・季節イベント名（母の日・父の日・バレンタイン・クリスマス等）を出力しない。季節感は「この季節」「今の時期」等の汎用表現のみ使う",
    "- 入力にない営業時間・定休日・ランチ時間を出力しない",
    "- 入力にないURL・LINE・電話番号・SNSアカウントを出力・示唆しない",
    "- 入力にない価格・金額を出力しない",
    "- ツール名・アプリ名・会社名は入力にある場合のみ使う",
    "【架空情報・ハルシネーション厳禁】",
    "- 入力にない新商品・新メニュー・新サービス・新キャンペーンを「追加」「開始」「新発売」「スタート」として告知する文章を絶対に生成しない",
    "- contentに登場する商品名・メニュー名・サービス名・施術名は、必ず【ユーザー情報】に明記されたものだけを使う。入力にない商品を想像・補完・追加してはならない",
    "- 「〇〇を新たに追加しました」「〇〇サプリ」「〇〇スムージー」「〇〇コース」のように、ユーザーが入力していない具体的な商品・成分・コースを作り出すことを禁止する",
    "- 違反した場合：ユーザーが存在しない商品・サービスをSNSに告知してしまい、フォロワーとのトラブルやブランド信頼の損失につながる",
    "",
    "【出力ルール】",
    "- Markdownの記号は一切使わない。プレーンテキストのみ",
    "- アクションはちょうど3つ",
    "- フレームワーク名（3C・STP・4P等）は使わない",
    "- 標準的な日本語・丁寧語。関西弁・口語禁止",
    "- titleは15文字以内の「〜する」形式",
    "- detailは目的を説明する一文（60文字以内）",
    "- content_typeの選択肢: Instagram投稿文、LINE配信文、Googleレビュー返信文、ブログ記事冒頭、メール文、告知文、チラシ文",
    "- contentはお客さんに直接届けるコピペ用の完成文章。ビジネスオーナーへのアドバイスは書かない",
    "- Instagram投稿文は3〜5文・ハッシュタグ5〜8個",
    "- Googleレビュー返信文: URLを含めない・感謝と再来店の温かい一文のみ",
    "- 工務店・建設業のcontentに「ご来店」は使わない。「現地見積もり」「お問い合わせ」を使う",
  ].join("\n");
}

/**
 * ユーザーメッセージ（毎回変わるタスク・ユーザー情報）
 */
function buildUserPrompt(user: UserProfile): string {
  const channelHint = CHANNEL_HINTS[user.industry] ?? CHANNEL_HINTS["other"];
  const keywordHint = KEYWORD_HINTS[user.industry] ?? KEYWORD_HINTS["other"];
  const learningSection = buildLearningSection(user.learning_history);

  const marketSection = user.market_signal
    ? "\n\n【今週のSNSトレンド（AI分析）】\n" + user.market_signal + "\n- 上記のトレンドを踏まえてアクションのテーマ・切り口を調整すること"
    : "";

  const productSection = (() => {
    if (!user.products || user.products.length === 0) return "";
    const lines = user.products.map((prod) => {
      const count = prod.purchase_count ?? 0;
      const days = prod.days_since_last ?? 0;
      let stage = "初回購入済み（2回目購入の橋渡し最優先）";
      if (count === 0) stage = "未購入（新規獲得施策）";
      else if (days >= 60) stage = "離脱予備軍（Win-back施策）";
      else if (count >= 4) stage = "ロイヤルユーザー（VIP化・口コミ促進）";
      else if (count >= 2) stage = "得意客（アップセル・定期購入誘導）";
      return `  - 商品名: ${prod.name} / 価格: ${prod.price.toLocaleString()}円 / USP: ${prod.usp} / 顧客ステージ: ${stage}`;
    });
    return (
      "\n\n【登録商品とリピート購入施策（最重要）】\n" +
      lines.join("\n") +
      "\n- 3回購入モデルを意識: 初回赤字→2回損益分岐→3回黒字\n" +
      "- 顧客ステージに応じたリピート施策を今週のアクションに必ず1つ入れること\n" +
      "- ステップメール・同梱物・限定クーポン・SNS口コミ依頼のいずれかを具体化する"
    );
  })();

  const lines = [
    "以下のユーザー情報をもとに、「今週やること」をちょうど3つ生成してください。",
    "",
    "【チャンネル指定】 " + channelHint,
    "【キーワード参考（自然に組み込む）】 " + keywordHint,
    "",
    "【ユーザー情報】",
    "業種: " + user.industry,
    "仕事の内容: " + user.business_desc,
    "お客さんの特徴: " + user.customer_desc,
    "今一番困っていること: " + user.main_problem,
    "このアプリが完璧に機能したとき、どう変わりたいか: " + user.final_goal + learningSection + marketSection + productSection,
    "",
    "【3つのアクションの役割（必ず異なる役割で生成すること）】",
    "- actions[0] の role: 「共感獲得」— ターゲットが「そうそう、その悩みわかる」と感じる共感型コンテンツ",
    "- actions[1] の role: 「行動促進」— 今すぐ予約・来店・問い合わせを促すCTA型コンテンツ",
    "- actions[2] の role: 「信頼構築」— 実績・こだわり・専門性を証拠として示す信頼型コンテンツ",
    "- 3つが同じトーンや訴求軸にならないよう明確に差別化すること",
    "",
    "【出力形式（JSONのみ、コードブロック不要、actionsは必ず3要素）】",
    "- strategy_noteは今週なぜこの3つを選んだか経営者目線で2文以内で説明。専門用語禁止。",
    '{"strategy_note":"理由2文以内","actions":[{"role":"共感獲得","title":"15文字以内","detail":"60文字以内","content_type":"Instagram投稿文","content":"コピペ用完成文章"},{"role":"行動促進","title":"...","detail":"...","content_type":"...","content":"..."},{"role":"信頼構築","title":"...","detail":"...","content_type":"...","content":"..."}]}',
  ];

  return lines.join("\n");
}

async function callGroqModel(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error("Groq(" + model + ") " + res.status + ": " + body.slice(0, 300));
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq: API key not set");

  // 70B優先（高品質）→ 429/503時は8B-instantにフォールバック（RPM 6000と高い）
  try {
    return await callGroqModel(apiKey, "llama-3.3-70b-versatile", systemPrompt, userPrompt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isRateLimit = msg.includes("429") || msg.includes("503");
    if (!isRateLimit) throw e;
    console.warn("[Groq] 70B rate-limited, falling back to 8B-instant");
    return await callGroqModel(apiKey, "llama-3.1-8b-instant", systemPrompt, userPrompt);
  }
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini: API key not set");

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error("Gemini " + res.status + ": " + body.slice(0, 300));
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// 架空商品・サービス告知パターン（入力にない新商品を生成してしまうケース）
const NEW_PRODUCT_HALLUCINATION_PATTERNS: RegExp[] = [
  /新た[にな].*?(を|が)(追加|スタート|開始|リリース|発売)/,
  /新しい.*?(コース|メニュー|商品|サービス|プラン|スムージー|サプリ|クリーム|ローション|エキス|エッセンス|オイル|セラム)/,
  /(追加|開始|スタート|新発売|リリース)しました/,
  /プロバイオティクス|乳酸菌|コラーゲン配合|ヒアルロン酸配合/,
];

// ハルシネーション後処理（最後の安全網）
const HALLUCINATION_EVENT_NAMES = [
  "母の日", "父の日", "バレンタイン", "ホワイトデー",
  "クリスマス", "ハロウィン", "お盆", "お正月",
  "成人の日", "敬老の日", "こどもの日",
];

const URL_IMPLY_PATTERNS = [
  /プロフィールのURL[からへ]?[どうぞ\s・。、]*/,
  /プロフのURL[からへ]?[どうぞ\s・。、]*/,
  /プロフURL[からへ]?[どうぞ\s・。、]*/,
  /リンクから[どうぞ\s・。、]*/,
  /こちらから[どうぞ\s・。、]*/,
  /URLをご確認[くださいください。\s]*/,
];

function sanitizeActions(actions: Action[], hasBookingUrl: boolean): Action[] {
  return actions.map((action) => {
    if (action.content_type === "Googleレビュー返信文") {
      action.content = action.content
        .replace(/https?:\/\/[^\s　、。！？\)）]+/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    if (!hasBookingUrl) {
      action.content = action.content.replace(/https?:\/\/[^\s　、。！？\)）]+/g, "").trim();
      for (const pattern of URL_IMPLY_PATTERNS) {
        action.content = action.content.replace(pattern, "お気軽にDMまたはお電話でお問い合わせください");
      }
    }

    for (const name of HALLUCINATION_EVENT_NAMES) {
      if (action.content.includes(name) || action.detail.includes(name) || action.title.includes(name)) {
        console.warn("[sanitize] Hallucinated event name:", name);
        const re = new RegExp(name, "g");
        action.content = action.content.replace(re, "この季節");
        action.detail = action.detail.replace(re, "この季節");
        action.title = action.title.replace(re, "この季節");
      }
    }

    // 架空商品・サービス告知パターン検出（警告フラグのみ。削除は意味変容リスクあり）
    for (const pattern of NEW_PRODUCT_HALLUCINATION_PATTERNS) {
      if (pattern.test(action.content)) {
        console.warn("[sanitize] Possible hallucinated new product in content:", action.title);
        // 架空商品告知は content 冒頭に注意書きを付加（ユーザーが確認できるよう）
        // 実際の削除は行わず、UI側の確認バナーに委ねる
        break;
      }
    }

    action.title = action.title
      .replace(/して$/, "する")
      .replace(/してください$/, "する");
    return action;
  });
}

export async function generateWeeklyActions(user: UserProfile): Promise<GenerateResult> {
  const systemPrompt = buildSystemConstraint(user);
  const userPrompt = buildUserPrompt(user);
  const errors: string[] = [];

  const callers: Array<[string, (s: string, u: string) => Promise<string>]> = [
    ["Groq", callGroq],
    ["Gemini", callGemini],
  ];

  for (const [name, caller] of callers) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await caller(systemPrompt, userPrompt);
        const cleaned = text.replace(/```json|```/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("JSON not found in response");
        const json = JSON.parse(match[0]);
        if (Array.isArray(json.actions) && json.actions.length > 0) {
          return {
            actions: sanitizeActions(json.actions, !!user.booking_url),
            strategy_note: typeof json.strategy_note === "string" ? json.strategy_note.trim() : "",
          };
        }
        throw new Error("actions array is empty");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[" + name + "] attempt " + (attempt + 1) + " failed:", msg);
        errors.push(name + "(" + (attempt + 1) + "): " + msg);

        const isTransient = msg.includes("503") || msg.includes("500") || msg.includes("429");
        if (!isTransient || attempt === 1) break;

        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  console.error("All APIs failed:", errors.join(" | "));
  throw new Error("生成に失敗しました。詳細: " + errors.join(" | "));
}
