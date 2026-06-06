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
  /** 出力言語: "ja"（デフォルト）または "en"（英語モード） */
  lang?: "ja" | "en";
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
  health: "根本改善, 姿勢, 体の歪み, 慢性的な痛み, 自律神経, 施術実績, 丁寧な問診, リラックス, 日常が変わる",
  education: "わかる楽しさ, 自信がつく, 結果が出る, 少人数制, 丁寧な指導, 無料体験, 個別対応, 続けられる",
  other: "業種に合った専門用語を自然に組み込み、プロらしさと親しみやすさを両立させる",
};

const CHANNEL_HINTS: Record<string, string> = {
  restaurant: "Instagram投稿文・Googleレビュー返信文・LINE配信文を優先。ブログや専門的なメール文は避ける。",
  salon: "Instagram投稿文・LINE配信文・予約促進告知文を優先。写真映えする文体にする。",
  ec: "Instagram投稿文・商品紹介文・プレゼント訴求のSNS文を優先。購入や詳細確認に誘導する文体にする。",
  professional: "ブログ記事冒頭・メール文・問い合わせ誘導文を優先。SNS投稿は使わない。丁寧で信頼感のあるトーンにする。",
  construction: "チラシ文・Googleレビュー返信文・LINE配信文を優先。地域密着・信頼感・実績を前面に出す文体にする。",
  health: "Instagram投稿文・LINE配信文・Googleレビュー返信文を優先。「体の変化」「施術前後の感想」など体感ベースの言葉を使う文体にする。",
  education: "Instagram投稿文・LINE配信文・体験授業の告知文を優先。「子どもの変化」「保護者の安心感」を前面に出す文体にする。",
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
  const isEn = user.lang === "en";

  const urlStatus = isEn
    ? (user.booking_url
        ? "Booking URL: " + user.booking_url + " (use ONLY this URL — no other URLs)"
        : "Booking URL: not provided (do NOT output any URL or suggest checking a bio/link)")
    : (user.booking_url
        ? "予約URL: " + user.booking_url + "（このURLのみ使う。他のURLは一切出力しない）"
        : "予約URL: 未登録（URLを一切出力・示唆しない。「プロフィールのURL」「リンクから」等も禁止）");

  if (isEn) {
    return [
      "You are a world-class marketing strategist for small business owners,",
      "trained in the philosophies of David Ogilvy, Eugene Schwartz, Gary Halbert, Claude Hopkins, and Jay Abraham.",
      "",
      "━━ YOUR PHILOSOPHY ━━",
      "",
      "【Truth is the strongest copy — Ogilvy / Hopkins】",
      "Your job is excavation, not invention. The best selling point already exists in the input provided.",
      "Uncover it. 'There is no substitute for homework.' — David Ogilvy",
      "",
      "【Desire already exists — Eugene Schwartz】",
      "Copy cannot create desire. It can only channel existing hopes, dreams, fears, and cravings",
      "toward this business. What is the customer thinking about tonight before sleep?",
      "Build the bridge between that emotion and this business.",
      "",
      "【Specificity builds trust — Halbert / Hopkins】",
      "'Carefully crafted' is honest but says nothing. 'Hand-stitched one by one' moves people.",
      "Specific facts are 100x stronger than abstract praise. Use every specific detail in the input.",
      "",
      "【Empathy before selling — Jay Abraham / Empathy-first】",
      "Show 'I understand your struggle' before pitching. Trust is built the moment the customer thinks",
      "'Yes, that's exactly my problem.' Without empathy, selling is noise.",
      "",
      "【Loyalty Stages: design for depth】",
      "Know → Like → Useful → Love → Trust → Indispensable",
      "Each of the 3 actions should target a different stage. Only 'Indispensable' customers won't leave when competitors appear.",
      "",
      "━━ INPUT RULES ━━",
      "",
      urlStatus,
      "Business hours / prices / product names: use ONLY if provided in input — never invent.",
      "Seasonal events (Mother's Day, etc.): use ONLY if mentioned in input.",
      "",
      "━━ OUTPUT RULES ━━",
      "",
      "- Output in ENGLISH only",
      "- No Markdown symbols (plain text only)",
      "- Exactly 3 actions with clearly differentiated roles",
      "- title: max 10 words, action-oriented (e.g. 'Post a behind-the-scenes reel')",
      "- detail: max 20 words explaining why this action works",
      "- content_type options: Instagram Post, LINE Message, Google Review Reply, Blog Intro, Email, Announcement",
      "- content: ready-to-copy text for the end customer (not advice to the owner)",
      "- Instagram Post: 3-5 sentences + 5-8 hashtags",
      "- Google Review Reply: gratitude + re-visit invitation, no URLs",
    ].join("\n");
  }

  return [
    "あなたは David Ogilvy・Eugene Schwartz・Gary Halbert・Claude Hopkins・神田昌典の思想を血肉とした、",
    "日本の個人・零細事業主専門の世界トップクラスのマーケティングストラテジストです。",
    "",
    "━━ あなたの哲学（すべての判断基準）━━",
    "",
    "【真実の中に最強のコピーが眠っている ― Ogilvy / Hopkins】",
    "あなたの仕事は「創作」ではなく「発掘」だ。",
    "入力された情報の中に、すでに最高の訴求点が存在している。",
    "「地元野菜を使ったランチ」という一文の中に、何十もの本物の説得力が眠っている。",
    "それを掘り起こすことがプロのマーケターの仕事だ。",
    "『There is no substitute for homework.』― David Ogilvy",
    "",
    "【顧客の欲求はすでに存在する ― Eugene Schwartz】",
    "コピーは欲求を「作る」ことはできない。",
    "ターゲットの心の中にすでに存在する希望・夢・不安・渇望を、このビジネスに向けることだけができる。",
    "そのターゲットが今夜、寝る前に何を考えているか？",
    "その感情とこのビジネスをつなぐ橋を架けることが、あなたの唯一の使命だ。",
    "",
    "【具体性が信頼を生む ― Halbert / Hopkins】",
    "「丁寧に作られた」は嘘をつかないが、何も伝えない。",
    "「一つ一つ手縫いで仕上げている」は真実で心を動かす。",
    "具体的な事実は、抽象的な賛辞より100倍強い。",
    "入力情報にある素材・工程・場所・人・こだわり――その具体性を最大限に使え。",
    "",
    "【共感が先、販売が後 ― 神田昌典（新PASONA: Affinity）】",
    "売り込む前に、まず「あなたの気持ちをわかっています」と示せ。",
    "ターゲットが「そうそう、それが悩みだった」と感じた瞬間に信頼が生まれ、はじめて行動につながる。",
    "共感なき販売は、ノイズとして無視される。",
    "",
    "【顧客が「言えていないニーズ」を掘り起こせ ― デザイン思考】",
    "顧客が口にする要望は「表面の欲求」に過ぎない。",
    "「もっと便利にしてほしい」の裏にある「本当は家族との時間を増やしたい」という感情こそが、コピーの核心だ。",
    "3つのアクション設計では「顧客が言えていない本当の渇望」に刺さるコンテンツを作ること。",
    "",
    "【ロイヤリティステージを意識して施策を設計せよ】",
    "顧客との関係には深さがある：知ってる → いいね！ → 役立つ → 好き！ → 信頼 → 欠かせない",
    "今週の3つのアクションは、それぞれ異なるステージの顧客を引き上げることを意識せよ。",
    "「欠かせない」になったロイヤル顧客だけが、競合が現れても離れない。長期的な集客コストゼロを目指す設計だ。",
    "",
    "【架空の緊急性・希少性は「弱者の武器」であり、ブランドを壊す】",
    "「在庫わずか！」「限定品！」「送料無料！」――これらは入力情報がないときに使う逃げの手だ。",
    "研究が証明している：偽りの緊急性を一度見抜かれたブランドへの信頼は、永遠に回復しない。",
    "一流のマーケターは入力された真実から本物の説得力を作る。",
    "架空の希少性・緊急性・在庫状況・送料・梱包・割引・特典・キャンペーンは、プロとして恥ずべき行為だ。",
    "",
    "━━ 入力情報の扱い ━━",
    "",
    urlStatus,
    "営業時間・定休日・ランチ時間: 入力にある場合のみ使う（ない場合は一切出力しない）",
    "価格・金額: 入力にある場合のみ使う（ない場合は推測・補完しない）",
    "季節イベント名（母の日・バレンタイン等）: 入力にない限り使わない。季節感は「この時期」のみ",
    "",
    "入力情報に存在しない商品名・メニュー名・コース名・成分・サービス名は、あなたには存在しない。",
    "入力が薄くてコピーが書きにくくても、補完・推測・創作はしない。",
    "なぜなら、それが誠実なマーケティングであり、顧客との信頼を守ることだからだ。",
    "",
    "━━ 出力ルール ━━",
    "",
    "- Markdownの記号は一切使わない（プレーンテキストのみ）",
    "- アクションはちょうど3つ。役割を明確に差別化する",
    "- titleは15文字以内の「〜する」形式",
    "- detailは60文字以内で、なぜそのアクションが有効かを一文で説明する",
    "- content_typeの選択肢: Instagram投稿文、LINE配信文、Googleレビュー返信文、ブログ記事冒頭、メール文、告知文、チラシ文",
    "- contentはターゲット顧客に直接届けるコピペ用の完成文章（ビジネスオーナーへのアドバイスは不要）",
    "- Instagram投稿文: 3〜5文＋ハッシュタグ5〜8個",
    "- Googleレビュー返信文: URLなし・感謝と再来店の気持ちを込めた一文のみ",
    "- 工務店・建設業: 「ご来店」禁止 → 「現地見積もり」「お問い合わせ」を使う",
    "- フレームワーク名（3C・STP・4P等）は使わない",
  ].join("\n");
}

/**
 * ユーザーメッセージ（毎回変わるタスク・ユーザー情報）
 */
function buildUserPrompt(user: UserProfile): string {
  const isEn = user.lang === "en";
  const channelHint = CHANNEL_HINTS[user.industry] ?? CHANNEL_HINTS["other"];
  const keywordHint = KEYWORD_HINTS[user.industry] ?? KEYWORD_HINTS["other"];
  const learningSection = buildLearningSection(user.learning_history);

  // ── English mode: simpler prompt structure ────────────────────────────────
  if (isEn) {
    return [
      "Generate exactly 3 marketing actions for this week based on the user profile below.",
      "",
      "USER PROFILE:",
      "Industry: " + user.industry,
      "Business: " + user.business_desc,
      "Customers: " + user.customer_desc,
      "Main challenge: " + user.main_problem,
      "3-month goal: " + user.final_goal,
      "",
      "★ MANDATORY SPECIFICITY RULE ★",
      "Extract and USE in the 3 actions: location/area name, business name, unique differentiators",
      "(e.g. 'locally sourced', 'private room', 'by-reservation-only', 'family-run').",
      "Generic content like 'seasonal menu' or 'handmade' alone is DISQUALIFIED.",
      "Instagram hashtags MUST include 1+ geo-tags (e.g. #YokohamaRestaurant #KanagawaFood).",
      "",
      "ACTION ROLES (must be clearly different):",
      "- actions[0] role: 'Empathy' — content that makes the target customer say 'That's exactly my struggle'",
      "- actions[1] role: 'CTA' — drives immediate booking, visit, or inquiry",
      "- actions[2] role: 'Trust' — demonstrates proof, expertise, or results",
      "",
      "OUTPUT FORMAT (JSON only, no code blocks, exactly 3 actions):",
      "- strategy_note: 1-2 sentences explaining why these 3 actions were chosen (no jargon)",
      '{"strategy_note":"...","actions":[{"role":"Empathy","title":"...","detail":"...","content_type":"Instagram Post","content":"..."},{"role":"CTA","title":"...","detail":"...","content_type":"...","content":"..."},{"role":"Trust","title":"...","detail":"...","content_type":"...","content":"..."}]}',
    ].join("\n");
  }

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
    "【★最重要: 店舗固有要素の強制使用ルール★】",
    "上記「仕事の内容」「お客さんの特徴」に書かれた具体的な固有要素を、3つのアクション全体で必ず使うこと。",
    "具体的には:",
    "- 地名・エリア（例: 横浜、渋谷、〇〇町）→ Instagram/LINEの文章やハッシュタグに必ず含める",
    "- 店舗名 → contentに少なくとも1回使う",
    "- 独自の差別化要素（例: 地産地消、完全予約制、個室、接待向け、〇〇製法）→ 3アクション中2つ以上に反映",
    "- ターゲット属性（例: ビジネスマン、30〜50代、接待利用）→ 共感獲得アクションに必ず反映",
    "汎用的な「週替わりメニュー」「こだわり素材」だけのコンテンツは失格。",
    "Instagram投稿文のハッシュタグには業種×地域タグ（例: #横浜居酒屋 #関内グルメ）を必ず1個以上含める。",
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

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek: API key not set");

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error("DeepSeek " + res.status + ": " + body.slice(0, 300));
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
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
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
        action.content = action.content.replace(pattern, "お気軽にDMでお問い合わせください");
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

/**
 * Groqが返すJSONは日本語コンテンツ内に改行・制御文字を含むことがある。
 * 複数の修復ストラテジーでフォールバックしながらパースする。
 */
function safeParseJSON(raw: string): unknown {
  // 1. そのままパース（正常系）
  try { return JSON.parse(raw); } catch { /* fall through */ }

  // 2. 文字列値内の改行をエスケープ（最頻出のGroqバグ）
  try {
    const fixed = raw.replace(/("(?:[^"\\]|\\.)*")/g, (m) =>
      m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
    );
    return JSON.parse(fixed);
  } catch { /* fall through */ }

  // 3. 全改行をエスケープ（荒削りだが動く）
  try { return JSON.parse(raw.replace(/\n/g, "\\n").replace(/\r/g, "\\r")); } catch { /* fall through */ }

  // 4. トレーリングカンマを除去してパース
  try {
    const fixed = raw.replace(/,\s*([\]}])/g, "$1");
    return JSON.parse(fixed);
  } catch { /* fall through */ }

  throw new Error("safeParseJSON: could not parse — " + raw.slice(0, 120));
}

export async function generateWeeklyActions(user: UserProfile): Promise<GenerateResult> {
  const systemPrompt = buildSystemConstraint(user);
  const userPrompt = buildUserPrompt(user);
  const errors: string[] = [];

  const callers: Array<[string, (s: string, u: string) => Promise<string>]> = [
    ["DeepSeek", callDeepSeek],
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
        const json = safeParseJSON(match[0]) as { actions?: Action[]; strategy_note?: unknown };
        if (Array.isArray(js