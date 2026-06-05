"use client";

import { useRouter } from "next/navigation";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

const TOPICS_EN = [
  { icon: "🔍", title: "Know Your Market (3C Analysis)", desc: "Organize your business from three angles: your company, competitors, and customers. This is why Growl tailors its actions to your industry." },
  { icon: "📊", title: "Read the Environment (PEST Analysis)", desc: "Understand how political, economic, social, and technological trends affect your business. The foundation for spotting market shifts early." },
  { icon: "🎯", title: "Find Your Target (STP)", desc: "Segmentation, Targeting, Positioning. Know exactly who you're serving and how to reach them — and your marketing will stop drifting." },
  { icon: "💡", title: "Leverage Your Strengths (SWOT)", desc: "Map strengths, weaknesses, opportunities, and threats. This is the reasoning engine behind Growl's weekly strategy notes." },
  { icon: "📱", title: "Social Media Marketing Basics", desc: "The role of Instagram, Google Maps, and messaging apps — and how to get results from each. Learn how to pick the right channel for your goals." },
  { icon: "⭐", title: "Using Google Reviews", desc: "How to respond to reviews, build a steady stream of new ones, and connect it all to local SEO (Google Maps ranking)." },
  { icon: "🤝", title: "Community Marketing", desc: "Grow revenue by building on loyal customers. Learn concrete tactics for improving repeat rate, LTV, and NPS with real examples." },
  { icon: "🏷️", title: "Brand Strategy", desc: "A brand is a recognition system in the customer's mind. Learn how to become the go-to choice in your category." },
  { icon: "📦", title: "E-Commerce Fundamentals", desc: "From store setup to SEO and social traffic. A practical guide to product pages, keyword strategy, and driving sales online." },
  { icon: "📈", title: "Reading Marketing Numbers (CPA, ROAS, CVR)", desc: "The core metrics of digital advertising. Learn to calculate and improve Cost Per Acquisition, Return on Ad Spend, and Conversion Rate." },
  { icon: "🧩", title: "4P Analysis", desc: "Product, Price, Place, Promotion. Organize your strategy across all four dimensions and see exactly which Growl actions map to each P." },
  { icon: "💡", title: "Design Thinking", desc: "A process for uncovering needs customers can't articulate. Five steps — Empathize, Define, Ideate, Prototype, Test — to sharpen every campaign." },
  { icon: "🚀", title: "Digital Transformation", desc: "How to integrate AI and digital tools into your business. Understand the shift since ChatGPT and what it means for small businesses." },
  { icon: "🤙", title: "Client-First Operations", desc: "Think like a growth consultant, not an ad seller. Learn to speak in outcomes, build trust through numbers, and grow alongside your customers." },
];

const TOPICS_JA = [
  { icon: "🔍", title: "市場を知る（3C分析）", desc: "自社・競合・顧客の3つの角度からビジネスを整理します。GrowlがあなたのアクションをなぜあなたのGrowlが業種ごとにカスタマイズする理由はここにあります。" },
  { icon: "📊", title: "環境を読む（PEST分析）", desc: "政治・経済・社会・技術のトレンドがビジネスにどう影響するかを理解します。市場変化をいち早く察知するための基礎分析です。" },
  { icon: "🎯", title: "ターゲットを絞る（STP）", desc: "セグメンテーション・ターゲティング・ポジショニング。誰に何を届けるかを明確にすることで、マーケの迷いがなくなります。" },
  { icon: "💡", title: "強みを活かす（SWOT）", desc: "強み・弱み・機会・脅威を整理します。GrowlがつくるAI週次戦略ノートの裏側にある思考プロセスです。" },
  { icon: "📱", title: "SNSマーケティングの基本", desc: "Instagram・Googleマップ・LINE。それぞれの役割と成果の出し方を学びます。目的に合ったチャネルを選ぶ力が身につきます。" },
  { icon: "⭐", title: "Googleレビューを活かす", desc: "返信の仕方・口コミを増やし続ける仕組み・ローカルSEO（Googleマップ順位）との連動まで、実践的に解説します。" },
  { icon: "🤝", title: "コミュニティマーケティング", desc: "常連客を軸に収益を伸ばします。リピート率・LTV・NPS改善のための具体的な施策を実例付きで学べます。" },
  { icon: "🏷️", title: "ブランド戦略", desc: "ブランドとはお客さんの頭の中にある認識システムです。特定カテゴリで「この店しかない」と選ばれるようになる方法を学びます。" },
  { icon: "📦", title: "ECの基本", desc: "ショップ開設からSEO・SNS流入まで。商品ページの作り方・キーワード戦略・売上を伸ばすための実践ガイドです。" },
  { icon: "📈", title: "マーケ数字の読み方（CPA・ROAS・CVR）", desc: "デジタル広告の核心指標を解説します。顧客獲得単価・広告費用対効果・転換率の計算方法と改善策を学びます。" },
  { icon: "🧩", title: "4P分析", desc: "Product（製品）・Price（価格）・Place（流通）・Promotion（販促）。4つの軸でGrowlのどのアクションがどこに対応するか一目でわかります。" },
  { icon: "💡", title: "デザイン思考", desc: "お客さんが言葉にできないニーズを発見するプロセスです。共感・定義・発想・プロトタイプ・テストの5ステップで、施策の精度が上がります。" },
  { icon: "🚀", title: "デジタルトランスフォーメーション", desc: "AIとデジタルツールをビジネスに組み込む方法を解説します。ChatGPT以降の変化と、中小事業者にとっての意味を具体的に学びます。" },
  { icon: "🤙", title: "顧客ファーストの運営", desc: "広告屋ではなく成長コンサルとして考えます。成果で語る・数字で信頼を築く・顧客とともに成長する思考法を身につけます。" },
];

export default function LearnPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const TOPICS = lang === "ja" ? TOPICS_JA : TOPICS_EN;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">

        <div className="flex justify-end mb-2">
          <LangToggle />
        </div>

        <div className="mb-8">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">
            {t("learn.badge")}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{t("learn.title")}</h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            {t("learn.sub")}
          </p>
        </div>

        <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-6">
          <p className="text-sm font-bold mb-1">{t("learn.banner.title")}</p>
          <p className="text-xs text-indigo-200 leading-relaxed">
            {t("learn.banner.sub")}
          </p>
        </div>

        <p className="text-sm font-semibold text-gray-600 mb-3">{t("learn.section")}</p>
        <div className="flex flex-col gap-3 mb-8">
          {TOPICS.map((topic) => (
            <div
              key={topic.title}
              className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 flex gap-4 items-start"
            >
              <span className="text-2xl shrink-0">{topic.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{topic.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{topic.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t("learn.diff.title")}</p>
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <div className="flex gap-3 items-start">
              <span className="font-bold text-indigo-600 shrink-0 pt-0.5">{t("learn.growl.label")}</span>
              <span>{t("learn.growl.desc")}</span>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex gap-3 items-start">
              <span className="font-bold text-gray-700 shrink-0 pt-0.5">{t("learn.learnai.label")}</span>
              <span>{t("learn.learnai.desc")}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 hover:text-indigo-500 transition-colors"
        >
          {t("learn.back")}
        </button>

      </div>
    </main>
  );
}
