"use client";

import { useEffect, useState } from "react";

export type Lang = "ja" | "en";

// ── 翻訳辞書 ──────────────────────────────────────────────────────────────────

const translations = {
  ja: {
    // ── 共通 ──
    "app.name": "Growl",
    "nav.home": "ホームへ",
    "nav.dashboard": "ダッシュボードへ",
    "lang.toggle": "EN",

    // ── ランディング ──
    "land.badge": "AIマーケティング",
    "land.headline1": "考えずに動く。",
    "land.headline2": "今週やること",
    "land.headline3": "3つだけ。",
    "land.sub": "5問答えるだけで、今週の集客施策が3つ届きます。\nマーケ知識ゼロでも大丈夫。コピペするだけです。",
    "land.cta": "今週の施策を見る →",
    "land.cta_resume": "今週の施策を確認する →",
    "land.how": "どうやって動くの？",
    "land.step1.title": "5問答える",
    "land.step1.desc": "業種・仕事内容・お客さん・悩み・目標。1分で完了します。",
    "land.step2.title": "AIが分析",
    "land.step2.desc": "業種・悩み・目標をもとに、今週一番効きそうな施策を3つ選定。SNSトレンドも加味します。",
    "land.step3.title": "3つだけやる",
    "land.step3.desc": "Instagram投稿文・Googleレビュー返信文・LINE配信文を完成形で届けます。あなたはコピペするだけ。",
    "land.voice": "使った人の声",
    "land.testimonial1.name": "田中さん",
    "land.testimonial1.role": "恵比寿・イタリアンオーナー",
    "land.testimonial1.text": "SNSが苦手で放置していたけど、コピーするだけでいいなら続けられた。2週目から予約が増え始めました。",
    "land.testimonial2.name": "佐藤さん",
    "land.testimonial2.role": "自宅サロン・まつ毛エクステ",
    "land.testimonial2.text": "月に3回しか更新できないのがちょうど良かった。無理なく続けていたら、3ヶ月でInstagramのフォロワーが2倍になりました。",
    "land.testimonial3.name": "山田さん",
    "land.testimonial3.role": "外壁塗装・工務店",
    "land.testimonial3.text": "チラシしかやってこなかった自分が、Googleレビュー返信まで始めた。問い合わせが月に5件増えてます。",
    "land.footer": "登録不要 · 1分で完了 · 無料で始める",

    // ── オンボーディング共通 ──
    "ob.back": "← 戻る",
    "ob.next": "次へ →",

    // ── 業種選択 ──
    "ob.industry.title": "どんなお仕事ですか？",
    "ob.industry.sub": "あなたの業種に合わせた提案をします",
    "ind.restaurant": "飲食店",
    "ind.salon": "美容サロン",
    "ind.ec": "EC・通販",
    "ind.professional": "士業・コンサル",
    "ind.construction": "工務店・建設",
    "ind.health": "健康・ボディケア",
    "ind.education": "教育・スクール",
    "ind.other": "その他",

    // ── ビジネス説明 ──
    "ob.business.title": "どんなお仕事か、教えてください",
    "ob.business.sub": "AIが業種に合った施策を選ぶために使います",
    "ob.business.placeholder": "例：東京・渋谷でイタリアンレストランを経営しています。ランチとディナーの2部制で、コース料理が人気です。",
    "ob.business.hint": "どんなサービス・商品を提供しているか、場所や特徴を自由に書いてください",

    // ── 顧客説明 ──
    "ob.customer.title": "どんなお客さんが多いですか？",
    "ob.customer.sub": "ターゲットに刺さるコンテンツを作るために使います",
    "ob.customer.placeholder": "例：30〜40代の女性が中心。職場の同僚と来るランチ利用が多く、写真を撮ってInstagramにあげる人が多い。",
    "ob.customer.hint": "年齢・性別・来店動機など、思い当たることを自由に",

    // ── 悩み ──
    "ob.problem.title": "いま一番困っていることは？",
    "ob.problem.sub": "この悩みを解決する施策を優先して提案します",
    "ob.problem.placeholder": "例：新規のお客さんがなかなか増えない。Instagramは投稿しているけど反応が少ない。",
    "ob.problem.hint": "集客・SNS・リピート・売上など、リアルな悩みを教えてください",

    // ── ゴール ──
    "ob.goal.title": "3ヶ月後、どうなっていたいですか？",
    "ob.goal.sub": "この目標に向かって、今週やるべき施策を逆算します",
    "ob.goal.placeholder": "例：月の新規予約を今より10件増やしたい。Instagramのフォロワーを500人にしたい。",
    "ob.goal.hint": "具体的な数字や状態があると、より精度の高い提案ができます",
    "ob.goal.analyzing": "AIが分析中...",
    "ob.goal.wait": "業種・悩み・目標をもとに施策を生成中です（約10〜20秒）",
    "ob.proof.num.placeholder": "Googleで★4.8・500名以上のお客様...",
    "ob.proof.quote.placeholder": "ここを超えるバーガーはない！毎週末来ています...",
    "ob.proof.price.placeholder": "ランチセット980円〜、テイクアウト可...",

    // ── ダッシュボード ──
    "dash.badge": "今週のマーケプラン",
    "dash.title": "今週やること 3つ",
    "dash.sub": "コピーして投稿・送信するだけ。それだけでマーケが動きます",
    "dash.strategy": "🧠 今週の戦略",
    "dash.progress_label": "今週の進捗",
    "dash.all_done.title": "今週のマーケ、完了！",
    "dash.all_done.sub": "来週もAIが新しいコンテンツを用意します。",
    "dash.line_banner.title": "毎週月曜8時に自動で届く",
    "dash.line_banner.sub": "LINEを連携すると今週の3つが月曜朝に届きます。\nアプリを開かなくてもコピペするだけ。",
    "dash.line_banner.cta": "LINEを連携する →",
    "dash.btn_product": "📈 販売・リピートを伸ばす — 商品マーケAI →",
    "dash.btn_marketing": "📊 PEST・3C・SWOT — 市場を深く分析する →",
    "dash.btn_learn": "📚 マーケの基礎を学ぶ →",
    "dash.btn_report": "📋 月次レポート →",
    "dash.reset": "最初からやり直す",
    "dash.reset.title": "本当にやり直しますか？",
    "dash.reset.sub": "今週の施策・入力内容がすべて消えます。\nこの操作は取り消せません。",
    "dash.reset.confirm": "消して最初からやり直す",
    "dash.reset.cancel": "キャンセル",

    // ── LearnAI ──
    "learn.badge": "マーケを学ぶ",
    "learn.title": "LearnAI",
    "learn.sub": "Growlがなぜその施策を選んだかを理解したい方のための学習ツールです。専門用語をわかりやすく解説し、AIと対話しながら学べます。",
    "learn.banner.title": "Growlがやっていることの理由を知る",
    "learn.banner.sub": "AIが選んだ施策の背景にある考え方をわかりやすく解説します。知識を深めることで、自分でも判断できるようになります。",
    "learn.section": "LearnAIで学べること",
    "learn.diff.title": "GrowlとLearnAIの使い分け",
    "learn.growl.label": "Growl",
    "learn.growl.desc": "考えずに動く。AIが今週やることを3つ決めてくれる。あなたはコピペするだけ",
    "learn.learnai.label": "LearnAI",
    "learn.learnai.desc": "理由を理解する。なぜその施策が効くのかを学んで、判断力を上げる",
    "learn.back": "← ダッシュボードに戻る",

    // ── 月次レポート ──
    "report.badge": "月次レポート",
    "report.title": "今月の結果",
    "report.sub": "AIマーケ活動のまとめ",
    "report.total": "タスク完了！",
    "report.total.sub": "継続こそが最大のマーケ優位性です",
    "report.thisweek": "今週",
    "report.tasks": "完了タスク数",
    "report.rate": "完了率",
    "report.past4": "過去4週間",
    "report.empty": "来週から結果が表示されます",
    "report.empty.sub": "使えば使うほど、AIの精度が上がります 📈",
    "report.lock.title": "月次レポートはスタンダードプラン以上",
    "report.lock.sub": "完了アクション・成果・トレンドをまとめて確認",
    "report.lock.cta": "プランを見る →",
    "report.standard": "フル履歴はスタンダードプランで見られます",
    "report.upgrade": "プランを見る →",
    "report.back": "← ダッシュボードに戻る",

    // ── 診断 ──
    "diag.cta": "あなたの集客力を診断する →",
    "diag.free": "30秒 · 無料 · 登録不要",

    // ── 完了画面 ──
    "complete.back": "← ダッシュボードに戻る",
    "complete.share": "シェアする",

    "land.hero.title1": "今週やること、\n",
    "land.hero.title2": "3つだけ。",
    "land.hero.title3": "",
    "land.hero.desc": "「今週何を投稿しよう」と悩む時間、ゼロにしませんか。AIがあなたのビジネスを分析して、コピペするだけの完成文を3つ届けます。",
    "land.hero.subdesc": "Instagram投稿文・Googleレビュー返信・LINE配信文——\n全部、明日から使える状態で届きます",
    "land.hero.cta": "無料で始める →",
    "land.hero.cta_sub": "登録不要・1分で完了・クレカ不要",
    "land.hero.diag": "あなたの集客力を診断する →",
    "land.hero.agency": "または、広告運用をAIにまるごとおまかせ →",
    "land.stats.time": "1分",
    "land.stats.time_sub": "入力にかかる時間",
    "land.stats.freq": "毎週",
    "land.stats.freq_sub": "AIが自動更新",
    "land.stats.tasks": "週3つ",
    "land.stats.tasks_sub": "だけでいい",
    "land.target.title": "こんな方に",
    "land.target.t1": "毎週「今週何を投稿しよう」と悩んでいる",
    "land.target.t2": "マーケ専門家を雇う余裕はない",
    "land.target.t3": "時間も人手も限られている",
    "land.target.t4": "やると決めたら動ける。ただ何をやるかが分からない",
    "land.voice.sub": "飲食店・サロン・工務店オーナーから",
    "land.price.title": "シンプルな料金",
    "land.price.sub": "まず無料で試して、必要になったら上げる。",
    "land.price.free": "フリー",
    "land.price.free.price": "¥0",
    "land.price.free.unit": "/月",
    "land.price.free.f1": "月10回まで分析",
    "land.price.free.f2": "全10フレームワーク（3C・SWOT・STPなど）",
    "land.price.free.f3": "登録不要",
    "land.price.free.cta": "無料で始める →",
    "land.price.popular": "おすすめ",
    "land.price.std": "スタンダード",
    "land.price.std.price": "¥3,000",
    "land.price.std.unit": "/月",
    "land.price.std.f1": "分析回数は無制限",
    "land.price.std.f2": "Meta広告コピー自動生成",
    "land.price.std.f3": "毎週の施策を自動配信",
    "land.price.std.f4": "月次レポートで効果を確認",
    "land.price.std.cta": "スタンダードにする →",
    "land.price.footer": "いつでもキャンセル可 · Stripe決済で安全",
    "land.bottom.desc": "5問答えるだけで、今週の施策が届きます",
    "land.bottom.sub": "登録不要・クレジットカード不要",
    "land.bottom.cta": "今すぐ無料で試す →",
    "land.footer.market": "マーケ分析",
    "land.footer.privacy": "プライバシーポリシー",
    "land.footer.terms": "利用規約",
    "land.footer.contact": "お問い合わせ",
    "ob.proof.title": "広告をもっと強くする",
    "ob.proof.sub": "任意入力ですが、これがあると広告の説得力が劇的に上がります。",
    "ob.proof.num": "実績・数字",
    "ob.proof.num.hint": "例：「300社以上が導入」「平均CVR3倍」「累計1,000名受講」",
    "ob.proof.quote": "お客様の声（実際の言葉）",
    "ob.proof.quote.hint": "例：「半信半疑でしたが、30日で売上が2倍になりました」",
    "ob.proof.price": "価格・オファー",
    "ob.proof.price.hint": "例：「初月無料」「月額980円〜」「無料相談あり」",
    "ob.proof.skip": "今はスキップ",
    "ob.proof.next": "次へ →",
  },

  en: {
    // ── Common ──
    "app.name": "Growl",
    "nav.home": "Home",
    "nav.dashboard": "Dashboard",
    "lang.toggle": "日本語",

    // ── Landing ──
    "land.badge": "AI Marketing",
    "land.headline1": "No thinking required.",
    "land.headline2": "Just",
    "land.headline3": "3 actions this week.",
    "land.sub": "Answer 5 quick questions and get 3 ready-to-use marketing actions for this week.\nNo marketing knowledge needed — just copy and paste.",
    "land.cta": "See this week's plan →",
    "land.cta_resume": "Continue this week's plan →",
    "land.how": "How it works",
    "land.step1.title": "Answer 5 questions",
    "land.step1.desc": "Your industry, business, customers, challenges, and goals. Done in 1 minute.",
    "land.step2.title": "AI analyzes",
    "land.step2.desc": "Based on your inputs and current SNS trends, AI selects 3 actions most likely to work this week.",
    "land.step3.title": "Do just 3 things",
    "land.step3.desc": "You get ready-to-use Instagram posts, Google review replies, and LINE messages. Just copy and paste.",
    "land.voice": "What users say",
    "land.testimonial1.name": "Tanaka",
    "land.testimonial1.role": "Italian Restaurant Owner, Ebisu",
    "land.testimonial1.text": "I was bad at social media and kept putting it off. But since I just had to copy and paste, I kept it up. Reservations started increasing in week 2.",
    "land.testimonial2.name": "Sato",
    "land.testimonial2.role": "Home Salon, Eyelash Extensions",
    "land.testimonial2.text": "Posting just 3 times a month was the perfect pace. After 3 months of keeping up, my Instagram followers doubled.",
    "land.testimonial3.name": "Yamada",
    "land.testimonial3.role": "Exterior Painting Contractor",
    "land.testimonial3.text": "I used to only do flyers. Now I even reply to Google reviews. Inquiries increased by 5 per month.",
    "land.footer": "No signup · 1 minute · Free to start",

    // ── Onboarding common ──
    "ob.back": "← Back",
    "ob.next": "Next →",

    // ── Industry ──
    "ob.industry.title": "What kind of business do you run?",
    "ob.industry.sub": "We'll tailor suggestions to your industry",
    "ind.restaurant": "Restaurant",
    "ind.salon": "Beauty Salon",
    "ind.ec": "E-commerce",
    "ind.professional": "Consulting / Legal",
    "ind.construction": "Construction",
    "ind.health": "Health & Body Care",
    "ind.education": "Education / School",
    "ind.other": "Other",

    // ── Business ──
    "ob.business.title": "Describe your business",
    "ob.business.sub": "Used by AI to select the best marketing tactics for you",
    "ob.business.placeholder": "e.g. I run a small Italian restaurant. We offer lunch and dinner, and our pasta dishes are popular with local regulars.",
    "ob.business.hint": "What services or products you offer, location, and any key features",

    // ── Customer ──
    "ob.customer.title": "Who are your typical customers?",
    "ob.customer.sub": "Used to create content that resonates with your target audience",
    "ob.customer.placeholder": "e.g. Mostly women in their 30s-40s. Many come for lunch with coworkers and post photos on Instagram.",
    "ob.customer.hint": "Age, gender, reasons for visiting — whatever comes to mind",

    // ── Problem ──
    "ob.problem.title": "What's your biggest challenge right now?",
    "ob.problem.sub": "We'll prioritize tactics that solve this problem",
    "ob.problem.placeholder": "e.g. It's hard to attract new customers. I post on Instagram but get little engagement.",
    "ob.problem.hint": "Be honest about your real pain points — new customers, SNS, repeat visits, revenue, etc.",

    // ── Goal ──
    "ob.goal.title": "Where do you want to be in 3 months?",
    "ob.goal.sub": "We'll work backwards from this goal to find what to do this week",
    "ob.goal.placeholder": "e.g. I want 10 more new reservations per month. I want 500 Instagram followers.",
    "ob.goal.hint": "Specific numbers or outcomes help generate more precise recommendations",
    "ob.goal.analyzing": "AI is analyzing...",
    "ob.goal.wait": "Generating your 3 actions based on industry, challenges, and goals (takes ~10–20 sec)",
    "ob.proof.num.placeholder": "500+ happy customers, 4.8 stars on Google...",
    "ob.proof.quote.placeholder": "Best burger I've had in Kanagawa! We come every weekend now.",
    "ob.proof.price.placeholder": "Lunch set from ¥980, Takeout available...",

    // ── Dashboard ──
    "dash.badge": "This Week's Marketing Plan",
    "dash.title": "3 actions for this week",
    "dash.sub": "Just copy and paste. That's all it takes to move your marketing forward.",
    "dash.strategy": "🧠 This Week's Strategy",
    "dash.progress_label": "Progress this week",
    "dash.all_done.title": "Marketing done for this week!",
    "dash.all_done.sub": "AI will prepare new content for next week.",
    "dash.line_banner.title": "Upgrade for weekly auto-delivery",
    "dash.line_banner.sub": "Get your 3 weekly actions delivered automatically every Monday.\nJust copy, paste, and post.",
    "dash.line_banner.cta": "See upgrade options →",
    "dash.btn_product": "📈 Boost Sales & Repeats — Product Marketing AI →",
    "dash.btn_marketing": "📊 PEST · 3C · SWOT — Deep Market Analysis →",
    "dash.btn_learn": "📚 Learn Marketing Basics →",
    "dash.btn_report": "📋 Monthly Report →",
    "dash.reset": "Start over",
    "dash.reset.title": "Are you sure you want to start over?",
    "dash.reset.sub": "All this week's actions and your inputs will be deleted.\nThis cannot be undone.",
    "dash.reset.confirm": "Delete and start over",
    "dash.reset.cancel": "Cancel",

    // ── LearnAI ──
    "learn.badge": "Learn Marketing",
    "learn.title": "LearnAI",
    "learn.sub": "A learning tool for those who want to understand why Growl chose those tactics. Explains concepts clearly so you can have real conversations with AI.",
    "learn.banner.title": "Understand the reasoning behind Growl's choices",
    "learn.banner.sub": "We explain the thinking behind the AI's selected tactics. Build knowledge so you can make your own informed decisions.",
    "learn.section": "What you can learn in LearnAI",
    "learn.diff.title": "Growl vs LearnAI — how to use each",
    "learn.growl.label": "Growl",
    "learn.growl.desc": "Act without thinking. AI decides your 3 weekly actions. You just copy and paste.",
    "learn.learnai.label": "LearnAI",
    "learn.learnai.desc": "Understand the why. Learn why each tactic works and sharpen your marketing judgment.",
    "learn.back": "← Back to Dashboard",

    // ── Monthly Report ──
    "report.badge": "Monthly Report",
    "report.title": "This Month's Results",
    "report.sub": "Summary of your AI-driven marketing activity",
    "report.total": "tasks completed total",
    "report.total.sub": "Consistency is your biggest marketing advantage",
    "report.thisweek": "This Week",
    "report.tasks": "Tasks Completed",
    "report.rate": "Completion Rate",
    "report.past4": "Past 4 Weeks",
    "report.empty": "Results will appear here next week",
    "report.empty.sub": "The more you use Growl, the better the AI gets 📈",
    "report.lock.title": "Monthly Report is Standard plan or higher",
    "report.lock.sub": "View completed actions, results, and trends all in one place",
    "report.lock.cta": "View Plans →",
    "report.standard": "Full report history is available on the Standard Plan",
    "report.upgrade": "View Plans →",
    "report.back": "← Back to Dashboard",

    // ── Diagnosis ──
    "diag.cta": "Take a free marketing diagnosis →",
    "diag.free": "30 sec · Free · No signup",

    // ── Complete ──
    "complete.back": "← Back to Dashboard",
    "complete.share": "Share",

    "land.hero.title1": "Just ",
    "land.hero.title2": "3 actions",
    "land.hero.title3": "\nthis week.",
    "land.hero.desc": "No more wondering 'what should I post this week?'. AI analyzes your business and delivers 3 ready-to-use pieces of content.",
    "land.hero.subdesc": "Instagram posts · Google review replies · social content —\nall delivered ready to use",
    "land.hero.cta": "Start free →",
    "land.hero.cta_sub": "No signup · 1 minute · No credit card",
    "land.hero.diag": "Take a free marketing diagnosis →",
    "land.hero.agency": "Or: let AI run your ads for you →",
    "land.stats.time": "1 min",
    "land.stats.time_sub": "to set up",
    "land.stats.freq": "Weekly",
    "land.stats.freq_sub": "AI auto-updates",
    "land.stats.tasks": "3 tasks",
    "land.stats.tasks_sub": "that's all",
    "land.target.title": "Built for you if...",
    "land.target.t1": "You wonder 'what should I post this week?' every single week",
    "land.target.t2": "You can't afford to hire a marketing specialist",
    "land.target.t3": "Time and staff are limited",
    "land.target.t4": "Once you know what to do, you'll act — you just don't know what",
    "land.voice.sub": "From restaurant, salon, and contractor owners",
    "land.price.title": "Simple pricing",
    "land.price.sub": "Start free. Upgrade when you're ready.",
    "land.price.free": "Free",
    "land.price.free.price": "$0",
    "land.price.free.unit": "/mo",
    "land.price.free.f1": "10 analyses per month",
    "land.price.free.f2": "All 10 frameworks (3C, SWOT, STP...)",
    "land.price.free.f3": "No signup required",
    "land.price.free.cta": "Start free →",
    "land.price.popular": "Most popular",
    "land.price.std": "Standard",
    "land.price.std.price": "$29",
    "land.price.std.unit": "/mo",
    "land.price.std.f1": "Unlimited analyses",
    "land.price.std.f2": "Meta Ads copy generator",
    "land.price.std.f3": "Weekly actions auto-delivered",
    "land.price.std.f4": "Monthly performance report",
    "land.price.std.cta": "Start Standard →",
    "land.price.footer": "Cancel anytime · Secure payment via Stripe",
    "land.bottom.desc": "Answer 5 questions and get this week's actions",
    "land.bottom.sub": "No signup · No credit card",
    "land.bottom.cta": "Start free →",
    "land.footer.market": "Market Analysis",
    "land.footer.privacy": "Privacy Policy",
    "land.footer.terms": "Terms",
    "land.footer.contact": "Contact",
    "ob.proof.title": "Strengthen your ads",
    "ob.proof.sub": "Optional — but these details make your ads dramatically more convincing.",
    "ob.proof.num": "Proof / Results (numbers)",
    "ob.proof.num.hint": "e.g. \"300+ clients\", \"Average 3x ROI\", \"Used by 50 companies\"",
    "ob.proof.quote": "Customer quote (real words)",
    "ob.proof.quote.hint": "e.g. \"I was skeptical but it changed my business in 30 days\"",
    "ob.proof.price": "Price / Offer",
    "ob.proof.price.hint": "e.g. \"Free first month\", \"From $29/mo\", \"Free consultation\"",
    "ob.proof.skip": "Skip for now",
    "ob.proof.next": "Next →",
  },
} as const;

type TranslationKey = keyof typeof translations.ja;

// ── useLang フック ─────────────────────────────────────────────────────────────
// カスタムイベントで同一ページ内の全インスタンスに言語変更を通知する

const LANG_EVENT = "growl:lang-change";

export function useLang() {
  const [lang, setLang] = useState<Lang>("ja");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("growl_lang") as Lang | null;
    if (saved === "en" || saved === "ja") {
      setLang(saved);
    } else if (typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().startsWith("ja")) {
      setLang("ja");
    }

    function onLangChange(e: Event) {
      const next = (e as CustomEvent<Lang>).detail;
      setLang(next);
    }
    window.addEventListener(LANG_EVENT, onLangChange);
    return () => window.removeEventListener(LANG_EVENT, onLangChange);
  }, []);

  function toggleLang() {
    const next: Lang = lang === "ja" ? "en" : "ja";
    setLang(next);
    localStorage.setItem("growl_lang", next);
    window.dispatchEvent(new CustomEvent<Lang>(LANG_EVENT, { detail: next }));
  }

  function t(key: TranslationKey): string {
    if (!mounted) {
      // hydration mismatch防止のためマウント前はデフォルトのjaを返す
      return (translations.ja as Record<string, string>)[key] ?? key;
    }
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations.ja as Record<string, string>)[key]
      ?? key;
  }

  return { lang, toggleLang, t, mounted };
}

export function getLang(): Lang {
  if (typeof window === "undefined") return "ja";
  const v = localStorage.getItem("growl_lang");
  if (v === "ja" || v === "en") return v;
  // 未選択ならブラウザ言語で判定（日本語環境は日本語）
  if (typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().startsWith("ja")) return "ja";
  return "en";
}
