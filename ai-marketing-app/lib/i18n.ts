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

    // ── 完了画面 ──
    "complete.back": "← ダッシュボードに戻る",
    "complete.share": "シェアする",
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
    "ob.business.placeholder": "e.g. I run an Italian restaurant in Shibuya, Tokyo. We have lunch and dinner service, and our course menu is popular.",
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

    // ── Dashboard ──
    "dash.badge": "This Week's Marketing Plan",
    "dash.title": "3 actions for this week",
    "dash.sub": "Just copy and paste. That's all it takes to move your marketing forward.",
    "dash.strategy": "🧠 This Week's Strategy",
    "dash.progress_label": "Progress this week",
    "dash.all_done.title": "Marketing done for this week!",
    "dash.all_done.sub": "AI will prepare new content for next week.",
    "dash.line_banner.title": "Delivered automatically every Monday at 8am",
    "dash.line_banner.sub": "Connect LINE and get your 3 weekly actions delivered Monday morning.\nNo need to open the app — just copy and paste.",
    "dash.line_banner.cta": "Connect LINE →",
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

    // ── Complete ──
    "complete.back": "← Back to Dashboard",
    "complete.share": "Share",
  },
} as const;

type TranslationKey = keyof typeof translations.ja;

// ── useLang フック ─────────────────────────────────────────────────────────────
// カスタムイベントで同一ページ内の全インスタンスに言語変更を通知する

const LANG_EVENT = "growl:lang-change";

export function useLang() {
  const [lang, setLang] = useState<Lang>("ja");

  useEffect(() => {
    // 初期ロード: localStorage から言語を読む
    const saved = localStorage.getItem("growl_lang") as Lang | null;
    if (saved === "en" || saved === "ja") setLang(saved);

    // 他のコンポーネントの toggleLang() が発火したときに同期する
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
    // 同一ページ内の全 useLang インスタンスに変更を通知
    window.dispatchEvent(new CustomEvent<Lang>(LANG_EVENT, { detail: next }));
  }

  function t(key: TranslationKey): string {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations.ja as Record<string, string>)[key]
      ?? key;
  }

  return { lang, toggleLang, t };
}

// ── 言語を1回だけ読む（SSR不要の場所で使う） ──────────────────────────────────
export function getLang(): Lang {
  if (typeof window === "undefined") return "ja";
  const v = localStorage.getItem("growl_lang");
  return v === "en" ? "en" : "ja";
}
