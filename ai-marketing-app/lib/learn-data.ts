export interface LearnSection {
  subtitle: string;
  content: string;
}

export interface LearnTopic {
  title: string;
  desc: string;
  icon: string;
  sections: LearnSection[];
}

export const LEARN_DATA_JA: Record<string, LearnTopic> = {
  "3c": {
    title: "市場を知る（3C分析）",
    desc: "自社・競合・顧客の3つの角度からビジネスを整理します。",
    icon: "🔍",
    sections: [
      { subtitle: "3C分析とは？", content: "Customer（顧客・市場）、Competitor（競合）、Company（自社）という3つの要素を客観的に分析し、成功要因（KSF）を見つけ出す手法です。" },
      { subtitle: "なぜ重要か？", content: "顧客が求めており、競合が提供できず、自社だけが提供できる『独自の強み（バリュープロポジション）』を発掘するために必要です。これがないと、価格競争に巻き込まれます。" },
      { subtitle: "実践アクション", content: "顧客の主要な悩み・ニーズを3つ書き出し、競合3社の強み・弱みと対比させて、自社が勝てるポイントを1つ定義しましょう。" }
    ]
  },
  "pest": {
    title: "環境を読む（PEST分析）",
    desc: "マクロ環境（政治・経済・社会・技術）のトレンドを理解します。",
    icon: "📊",
    sections: [
      { subtitle: "PEST分析とは？", content: "Politics（政治）、Economy（経済）、Society（社会）、Technology（技術）の4つの外部環境の変化が、自社にどう影響するかを予測する手法です。" },
      { subtitle: "なぜ重要か？", content: "法律の改正や社会の流行、新しいテクノロジーの登場などは、自社でコントロールできません。これらをいち早く予測してビジネスモデルを適応させることで、新たなビジネスチャンスを獲得できます。" },
      { subtitle: "実践アクション", content: "自社業界に影響しそうな法改正、物価・金利の動き、人々の関心の変化、AIなどの新技術をリストアップし、自社にとっての『機会』と『脅威』に分類しましょう。" }
    ]
  },
  "stp": {
    title: "ターゲットを絞る（STP）",
    desc: "セグメンテーション・ターゲティング・ポジショニングで狙うべき市場を明確にします。",
    icon: "🎯",
    sections: [
      { subtitle: "STP分析とは？", content: "Segmentation（市場細分化）、Targeting（ターゲット選定）、Positioning（立ち位置の決定）の3ステップで、誰に対してどのような価値を届けるかを明確にする手法です。" },
      { subtitle: "なぜ重要か？", content: "「すべての人に愛される商品」は、誰にとっても魅力的ではありません。市場を絞り、特定の顧客にとって「絶対にこれがいい」と思える独自の立ち位置（ポジション）を確立することが重要です。" },
      { subtitle: "実践アクション", content: "自社の商品が最も役立つ『理想の顧客像（ペルソナ）』を一人具体的に描き、その人が他の店ではなく自社を選ぶ決定的な理由を言葉にしてみましょう。" }
    ]
  },
  "swot": {
    title: "強みを活かす（SWOT）",
    desc: "自社の内部環境（強み・弱み）と外部環境（機会・脅威）を整理します。",
    icon: "💡",
    sections: [
      { subtitle: "SWOT分析とは？", content: "Strength（強み）、Weakness（弱み）、Opportunity（機会）、Threat（脅威）の4つの軸で自社の現状を整理し、今後の戦略を導き出す手法です。" },
      { subtitle: "なぜ重要か？", content: "自社の弱みを無理に改善するよりも、自社の強みを活かして市場の機会（トレンドやニーズ）を捉える方が、圧倒的に早く成果が出ます。現在の脅威をどう避けるかも重要です。" },
      { subtitle: "実践アクション", content: "4つの要素を箇条書きで3つずつ書き出しましょう。特に『強み × 機会（どうやって強みで波に乗るか）』のクロス分析に注目して、具体的な施策を考えてみましょう。" }
    ]
  },
  "sns": {
    title: "SNSマーケティングの基本",
    desc: "InstagramやGoogleマップ、LINEの特性を理解して活用します。",
    icon: "📱",
    sections: [
      { subtitle: "SNSマーケティングの基本とは？", content: "各SNSプラットフォーム（Instagram、X、LINE、Googleマップなど）の強みを活かし、見込み客との信頼関係を築き、来店や購入に繋げる活動です。" },
      { subtitle: "なぜ重要か？", content: "現代の消費者は、広告よりもSNSの口コミや店舗のリアルな発信を信頼します。プラットフォームごとに役割（認知拡大、共感獲得、リピート促進など）が異なるため、組み合わせて使うことが重要です。" },
      { subtitle: "実践アクション", content: "Instagramで親しみやすさや専門性を発信し、Googleマップで新規来店を促し、LINEやメルマガで常連客向けに定期発信を行うサイクルを作りましょう。" }
    ]
  },
  "google-reviews": {
    title: "Googleレビューを活かす",
    desc: "口コミの獲得と誠実な返信で、ローカルSEO（MEO）を向上させます。",
    icon: "⭐",
    sections: [
      { subtitle: "Googleレビューの活用とは？", content: "Googleマップ上の店舗プロフィール（Googleビジネスプロフィール）に寄せられる口コミ（レビュー）を集め、それに対して返信する活動です。" },
      { subtitle: "なぜ重要か？", content: "Googleマップで近くの店舗を探すユーザーは、レビューの点数と内容、そし​​て店舗の対応を重視します。好意的なレビューが多く、店舗が誠実に返信していると、マップの検索順位（MEO）も向上します。" },
      { subtitle: "実践アクション", content: "来店したファンに『今後の改善のために口コミをいただけませんか？』と声をかけ、もらったレビューには24時間以内に誠実な言葉で感謝と返信をしましょう。" }
    ]
  },
  "community": {
    title: "コミュニティマーケティング",
    desc: "常連客（ファン）との繋がりを深め、紹介とリピートを最大化します。",
    icon: "🤝",
    sections: [
      { subtitle: "コミュニティマーケティングとは？", content: "自社の商品やサービスを愛してくれる熱心なファンとのつながりを深め、ファンが新しい顧客を連れてくる好循環を作る手法です。" },
      { subtitle: "なぜ重要か？", content: "新規の顧客を獲得するコストは、既存の常連客を維持するコストの5倍かかります（1:5の法則）。常連客がファンになり、口コミや紹介をしてくれるコミュニティができると、広告に頼らない経営が可能になります。" },
      { subtitle: "実践アクション", content: "最もよく来てくれる常連客（上位2割のファン）にお礼のメッセージや特別なお知らせを送り、ファン同士やスタッフと交流できる小さな企画を考えてみましょう。" }
    ]
  },
  "brand": {
    title: "ブランド戦略",
    desc: "顧客の頭の中に「指名買い」される認識の仕組みを作ります。",
    icon: "🏷️",
    sections: [
      { subtitle: "ブランド戦略とは？", content: "商品やサービスのロゴ、名前、デザイン、顧客体験を通じて、顧客の頭の中に『この分野ならこの店』という独自の価値あるイメージを植え付ける活動です。" },
      { subtitle: "なぜ重要か？", content: "ブランドが確立されると、競合との価格比較をされなくなります。顧客は『このお店だから買う』という信頼に基づいて行動するため、リピート率が上がり、紹介も生まれやすくなります。" },
      { subtitle: "実践アクション", content: "自社がお客様に提供する『約束（どのような体験や価値を保証するか）』を一つに絞り、すべての接客やデザインにそれを一貫させましょう。" }
    ]
  },
  "ec": {
    title: "ECの基本",
    desc: "ネットショップ開設から集客・購買率向上の施策を学びます。",
    icon: "📦",
    sections: [
      { subtitle: "EC（電子商取引）の基本とは？", content: "インターネット上で自社の商品やサービスを直接販売する仕組みです。集客、商品ページの訴求、決済、配送、アフターフォローまでの一連の体験を指します。" },
      { subtitle: "なぜ重要か？", content: "実店舗 of 商圏を超えて、全国の顧客にアプローチできるようになります。ただし、ネット上には競合が無数にあるため、ただ店を開くだけでなく、独自の価値を伝えるページ設計と流入経路（SNS等）が必要です。" },
      { subtitle: "実践アクション", content: "商品写真だけでなく、『なぜこの商品が作られたか』のストーリーや、実際に使った顧客の声を商品ページに大きく掲載し、SNSからそのページに直接誘導しましょう。" }
    ]
  },
  "numbers": {
    title: "マーケ数字の読み方（CPA・ROAS・CVR）",
    desc: "デジタル広告やWeb集客の効果を測定する指標を解説します。",
    icon: "📈",
    sections: [
      { subtitle: "CPA・ROAS・CVRとは？", content: "CPA（顧客獲得単価）、ROAS（広告費用対効果）、CVR（購入・申込への転換率）という、Webマーケティングで最も重要な3つの数値指標です。" },
      { subtitle: "なぜ重要か？", content: "感覚だけで広告や集客を行うと、お金を無駄にするリスクが高まります。これらの数値を把握することで、広告費に対してどれだけの売上が出ているか、どこを改善すべきかが論理的に判断できます。" },
      { subtitle: "実践アクション", content: "自社のWebサイトやランディングページにおいて、『アクセス数』『購入数（コンバージョン）』『かかった費用』を記録し、現在のCVR（購入数 ÷ アクセス数）を算出してみましょう。" }
    ]
  },
  "4p": {
    title: "4P分析",
    desc: "Product（製品）、Price（価格）、Place（流通）、Promotion（販促）の4つのマーケ要素を整理します。",
    icon: "🧩",
    sections: [
      { subtitle: "4P分析とは？", content: "Product（商品）、Price（価格）、Place（流通・場所）、Promotion（プロモーション・販促）の4つの視点から、マーケティング施策にズレがないかを検証する手法です。" },
      { subtitle: "なぜ重要か？", content: "どんなに良い商品（Product）でも、価格（Price）が高すぎたり、売り場（Place）が不便だったり、知られる方法（Promotion）が間違っていれば売れません。4つの要素が一つのストーリーとして調和している必要があります。" },
      { subtitle: "実践アクション", content: "4つのPに自社の現状を当てはめ、ターゲット顧客の視点で見たときに『この商品がこの価格で、この場所で買え、この広告で知る』という一連の流れに違和感がないか点検しましょう。" }
    ]
  },
  "design-thinking": {
    title: "デザイン思考",
    desc: "顧客の言葉にならない本音（インサイト）から解決策を生み出します。",
    icon: "💡",
    sections: [
      { subtitle: "デザイン思考とは？", content: "顧客に対する深い『共感』を出発点として、顧客が自覚していない本質的な課題を発見し、アイデア出しと試作を繰り返してイノベーションを生み出す思考法です。" },
      { subtitle: "なぜ重要か？", content: "アンケートや質問で顧客に欲しいものを聞いても、本当に画期的なアイデアは出てきません。顧客の実際の行動や不便さを観察し、『言葉にならないニーズ』を先回りして満たすことで、競合と圧倒的な差をつけられます。" },
      { subtitle: "実践アクション", content: "顧客が自社の商品を使っているシーンや、サービスを受けている時の表情や行動を観察し、『言っていないけれど、実は面倒に感じていそうなこと』を書き出してみましょう。" }
    ]
  },
  "dx": {
    title: "デジタルトランスフォーメーション（DX）",
    desc: "AIやITツールを活用し、業務効率と顧客体験を向上させます。",
    icon: "🚀",
    sections: [
      { subtitle: "DX（デジタル変革）とは？", content: "単にITツールを導入するだけでなく、AIやデジタル技術を活用して、ビジネスモデルや業務プロセス、さらには顧客体験（CX）そのものを変革する取り組みです。" },
      { subtitle: "なぜ重要か？", content: "人手不足や時代の変化が激しい現在、手作業や古い方法に頼っていてはスピードが追いつきません。AIを活用して自動化できる部分（文章生成、データ集計、返信対応など）を任せることで、人間はより創造的な業務に集中できます。" },
      { subtitle: "実践アクション", content: "毎日または毎週発生するルーティン業務（SNS投稿作成、顧客への定型メール送信、レビュー返信など）をリストアップし、GrowlなどのAIツールを使って自動化・効率化できるかを検討しましょう。" }
    ]
  },
  "client-first": {
    title: "顧客ファーストの運営",
    desc: "顧客の成果にコミットし、信頼と長期的なパートナーシップを築きます。",
    icon: "🤙",
    sections: [
      { subtitle: "顧客ファーストの運営とは？", content: "自社の売上や都合を最優先にするのではなく、顧客が抱える悩みや問題が解決され、顧客が本当に望む『成果』を達成することをすべての中心に据える運営方針です。" },
      { subtitle: "なぜ重要か？", content: "目先の利益を追って強引に売り込んでも、リピートや良い口コミは生まれません。顧客の成功に本気で貢献し、信頼（ラポール）を構築することで、結果的に高単価での契約や長年のリピート、自発的な紹介へと繋がります。" },
      { subtitle: "実践アクション", content: "自社の商品が売れた時ではなく、お客様がその商品を使って『悩みが解決した・成果が出た』瞬間に注目し、その成果を最大化するためのアフターケアや声かけを徹底しましょう。" }
    ]
  }
};

export const LEARN_DATA_EN: Record<string, LearnTopic> = {
  "3c": {
    title: "Know Your Market (3C Analysis)",
    desc: "Organize your business from three angles: your company, competitors, and customers.",
    icon: "🔍",
    sections: [
      { subtitle: "What is 3C Analysis?", content: "A strategic framework that analyzes a business from three key perspectives: Customer (market needs), Competitor (market threats), and Company (internal resources)." },
      { subtitle: "Why is it important?", content: "It helps you identify your 'Value Proposition' — the unique whitespace that customers want, competitors cannot provide, and only your company can deliver. Without this, you fall into price wars." },
      { subtitle: "Concrete Action Steps", content: "List the top 3 pain points of your customers, note the strengths and weaknesses of 3 direct competitors, and define one thing only your business can guarantee." }
    ]
  },
  "pest": {
    title: "Read the Environment (PEST Analysis)",
    desc: "Understand how political, economic, social, and technological trends affect your business.",
    icon: "📊",
    sections: [
      { subtitle: "What is PEST Analysis?", content: "A framework used to analyze and monitor the macro-environmental factors: Political, Economic, Social, and Technological that impact an organization." },
      { subtitle: "Why is it important?", content: "Macro trends are beyond your control. By detecting shifts in regulations, economic trends, societal interest, and new tech early, you can adapt your business model and capture new opportunities before competitors do." },
      { subtitle: "Concrete Action Steps", content: "List recent regulatory changes, cost/inflation pressures, changes in customer habits, and AI technologies. Group them into 'Opportunities' or 'Threats' to your business." }
    ]
  },
  "stp": {
    title: "Find Your Target (STP)",
    desc: "Segmentation, Targeting, and Positioning to clarify your unique market space.",
    icon: "🎯",
    sections: [
      { subtitle: "What is STP?", content: "A three-step marketing model (Segmentation, Targeting, Positioning) that helps you define who you serve and how to position your brand to stand out." },
      { subtitle: "Why is it important?", content: "A product made for 'everyone' ends up appealing to no one. Narrowing your target audience and establishing a clear, unique position makes your brand the obvious, indispensable choice for your ideal customer." },
      { subtitle: "Concrete Action Steps", content: "Create a concrete persona of your ideal customer (one real person). Define the single biggest reason why this specific person would choose you over any other option." }
    ]
  },
  "swot": {
    title: "Leverage Your Strengths (SWOT)",
    desc: "Map your Strengths, Weaknesses, Opportunities, and Threats to find your winning path.",
    icon: "💡",
    sections: [
      { subtitle: "What is SWOT Analysis?", content: "A structured planning method used to evaluate the internal factors (Strengths, Weaknesses) and external factors (Opportunities, Threats) of a business." },
      { subtitle: "Why is it important?", content: "It is much faster and cheaper to ride a market wave (Opportunity) using what you are already good at (Strength) than trying to fix all your Weaknesses. Focus on alignment to grow fast." },
      { subtitle: "Concrete Action Steps", content: "Write down 3 items for each SWOT category. Look specifically at 'Strengths x Opportunities' (how to use your strengths to capture current trends) to design your next campaign." }
    ]
  },
  "sns": {
    title: "Social Media Marketing Basics",
    desc: "Understand the roles of Instagram, Google Maps, and LINE to build local buzz.",
    icon: "📱",
    sections: [
      { subtitle: "What is Social Media Marketing?", content: "The practice of using platforms like Instagram, Google Maps, and messaging apps to build trust, engage with prospects, and drive sales for your local business." },
      { subtitle: "Why is it important?", content: "Modern customers trust authentic local posts and customer reviews far more than paid ads. Each channel has a different role (Instagram for discovery, Google Maps for intent, LINE for retention) — use them together." },
      { subtitle: "Concrete Action Steps", content: "Use Instagram to show your behind-the-scenes expertise, optimize Google Maps for local search intent, and use LINE/email to nurture repeat customers with regular updates." }
    ]
  },
  "google-reviews": {
    title: "Using Google Reviews",
    desc: "Collect customer reviews and write authentic replies to boost local SEO.",
    icon: "⭐",
    sections: [
      { subtitle: "What is Google Review Optimization?", content: "The process of actively collecting customer reviews on your Google Business Profile and responding to them professionally and sincerely." },
      { subtitle: "Why is it important?", content: "Nearby customers search Google Maps with high intent. Higher review counts, positive ratings, and active merchant responses build instant trust and directly improve your local search ranking (MEO)." },
      { subtitle: "Concrete Action Steps", content: "Ask your happy regulars: 'Would you mind sharing your honest feedback on Google?' Reply to every new review within 24 hours with a warm, personal message." }
    ]
  },
  "community": {
    title: "Community Marketing",
    desc: "Nurture your loyal fans so they naturally refer new customers.",
    icon: "🤝",
    sections: [
      { subtitle: "What is Community Marketing?", content: "A marketing strategy that focuses on bringing your most passionate customers together, deepening their loyalty, and turning them into active advocates for your brand." },
      { subtitle: "Why is it important?", content: "Acquiring a new customer costs 5 times more than retaining an existing one (the 1:5 rule). When your loyal customers form a community and share their love for your business, they drive low-cost organic referrals." },
      { subtitle: "Concrete Action Steps", content: "Send personal thank-you notes or priority access to your top 20% most frequent customers. Think of a small event or online space where they can interact with your team." }
    ]
  },
  "brand": {
    title: "Brand Strategy",
    desc: "Build a clear reputation so customers pick you without price shopping.",
    icon: "🏷️",
    sections: [
      { subtitle: "What is Brand Strategy?", content: "The long-term plan to develop a unique image, reputation, and customer experience that makes your business the go-to choice in your category." },
      { subtitle: "Why is it important?", content: "A strong brand removes your business from direct price competition. Customers buy because they trust your brand, leading to higher retention rates, better word-of-mouth, and premium pricing." },
      { subtitle: "Concrete Action Steps", content: "Define one single promise (the specific customer experience you guarantee) and align all your service standards, social media tone, and design with this promise." }
    ]
  },
  "ec": {
    title: "E-Commerce Fundamentals",
    desc: "From online shop setup to conversion optimization and traffic acquisition.",
    icon: "📦",
    sections: [
      { subtitle: "What is E-Commerce?", content: "The practice of selling physical or digital products directly to customers online, covering shop setup, copywriting, checkout optimization, and customer service." },
      { subtitle: "Why is it important?", content: "It allows you to expand beyond your local physical geography and sell to a national or global audience. Success depends on clear product page design and driving targeted traffic via organic search or social media." },
      { subtitle: "Concrete Action Steps", content: "Optimize your product landing page by focusing on 'why this product exists' (story) and actual customer reviews. Drive traffic directly to this page from your social media bio links." }
    ]
  },
  "numbers": {
    title: "Reading Marketing Numbers (CPA, ROAS, CVR)",
    desc: "Learn the core metrics of digital marketing to make logical growth decisions.",
    icon: "📈",
    sections: [
      { subtitle: "What are CPA, ROAS, and CVR?", content: "CPA (Cost Per Acquisition), ROAS (Return on Ad Spend), and CVR (Conversion Rate) are the three most critical mathematical metrics in digital marketing." },
      { subtitle: "Why is it important?", content: "Running campaigns based on gut feeling is a recipe for wasting money. Knowing these metrics lets you mathematically evaluate if your marketing spend is profitable and pinpoint exactly where the bottleneck lies." },
      { subtitle: "Concrete Action Steps", content: "Track your website visits, actions/purchases, and ad spend. Calculate your current CVR (purchases divided by visits) and CPA (total spend divided by purchases) to set your baseline." }
    ]
  },
  "4p": {
    title: "4P Analysis",
    desc: "Review your strategy across Product, Price, Place, and Promotion.",
    icon: "🧩",
    sections: [
      { subtitle: "What is the 4P Mix?", content: "A foundational marketing model that analyzes the four key pillars of any marketing strategy: Product, Price, Place, and Promotion." },
      { subtitle: "Why is it important?", content: "Even a great product (Product) won't sell if the pricing (Price) is wrong, the distribution (Place) is inconvenient, or the advertising (Promotion) reaches the wrong people. All 4 elements must work in harmony." },
      { subtitle: "Concrete Action Steps", content: "Write down your current status for all 4 Ps. Check if there is any mismatch — e.g. selling a premium, high-priced product through a budget channel with discount promo copy." }
    ]
  },
  "design-thinking": {
    title: "Design Thinking",
    desc: "Solve business problems by deeply understanding customer frustrations.",
    icon: "💡",
    sections: [
      { subtitle: "What is Design Thinking?", content: "A human-centered approach to innovation that integrates customer empathy, rapid prototyping, and constant testing to solve complex business challenges." },
      { subtitle: "Why is it important?", content: "Simply asking customers what they want rarely yields breakthrough results. Observing their actual behavior reveals 'unarticulated needs' — allowing you to design solutions that create an unbeatable competitive advantage." },
      { subtitle: "Concrete Action Steps", content: "Watch how customers interact with your product or space. List 3 subtle points of friction or delay they experience but never complain about, and brainstorm how to eliminate them." }
    ]
  },
  "dx": {
    title: "Digital Transformation (DX)",
    desc: "Leverage AI and modern digital tools to streamline operations and save hours.",
    icon: "🚀",
    sections: [
      { subtitle: "What is DX?", content: "The strategic integration of digital technology, such as AI and automation tools, into all areas of a business, fundamentally changing how you operate and deliver value." },
      { subtitle: "Why is it important?", content: "With limited staff and time, manual workflows create bottlenecks. delegating repetitive tasks (like drafting social copy, summarizing feedback, or review replies) to AI lets you focus on high-value human relationships." },
      { subtitle: "Concrete Action Steps", content: "List all recurring marketing tasks you do weekly. Identify which ones involve writing or formatting data, and set up an AI workflow (using Growl) to automate them." }
    ]
  },
  "client-first": {
    title: "Client-First Operations",
    desc: "Focus on driving actual customer outcomes to build high-ticket trust.",
    icon: "🤙",
    sections: [
      { subtitle: "What is Client-First Operation?", content: "A business philosophy that prioritizes the client's actual outcomes and success over short-term sales or company convenience, building deep, long-term partnerships." },
      { subtitle: "Why is it important?", content: "Aggressive selling creates buyer's remorse and high-churn. Focusing on actually solving the client's problems and proving results through numbers builds bulletproof trust, resulting in premium contracts and high referral rates." },
      { subtitle: "Concrete Action Steps", content: "Focus on the moment after the sale: how does the client verify that they got value? Design a simple check-in process to measure and maximize their success." }
    ]
  }
};
