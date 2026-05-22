"use client";

import { useRouter } from "next/navigation";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

const TOPICS = [
  {
    icon: "🔍",
    title: "市場を知る（3C分析）",
    desc: "自社・競合・顧客の3つの視点でビジネスを整理する。Growlが業種別に施策を変える理由がここにある",
  },
  {
    icon: "📊",
    title: "外部環境を読む（PEST分析）",
    desc: "政治・経済・社会・技術のトレンドが自店に与える影響を把握する。SNSトレンド分析の土台",
  },
  {
    icon: "🎯",
    title: "ターゲットを絞る（STP）",
    desc: "セグメンテーション・ターゲティング・ポジショニング。誰に何をどう届けるかが決まると施策がブレなくなる",
  },
  {
    icon: "💡",
    title: "強みを活かす（SWOT分析）",
    desc: "強み・弱み・機会・脅威の4象限で自店を俯瞰する。Growlが今週の戦略メモを書く根拠になる",
  },
  {
    icon: "📱",
    title: "SNSマーケの基本",
    desc: "Instagram・LINE・Googleマップそれぞれの役割と効果の出し方。チャンネル選定の判断軸を持つ",
  },
  {
    icon: "⭐",
    title: "Googleレビューの活用",
    desc: "返信の書き方・口コミを増やす仕組み・MEO（マップ検索最適化）への繋げ方",
  },
  {
    icon: "🤝",
    title: "コミュニティマーケティング",
    desc: "常連客（ロイヤル顧客）を軸に売上を広げる戦略。リピート率・LTV・NPS改善の具体的な施策と事例を学ぶ",
  },
  {
    icon: "🏷️",
    title: "ブランド戦略",
    desc: "「ブランド＝消費者の頭の中の認知システム」。自店がカテゴリーの代表格になるための考え方と実践",
  },
  {
    icon: "📦",
    title: "EC運営の基礎と応用",
    desc: "通販・ネットショップの全体像からSEO・集客まで。商品ページ構成・キーワード戦略・SNS活用の実践ガイド",
  },
  {
    icon: "📈",
    title: "マーケ数値を読む（CPA・ROAS・CVR）",
    desc: "デジタル広告の核心指標。CPA（顧客獲得コスト）・ROAS（広告費対売上）・CVR（成約率）の計算と改善の考え方",
  },
  {
    icon: "🧩",
    title: "4P分析",
    desc: "Product（商品）・Price（価格）・Place（流通）・Promotion（販促）の4軸で戦略を整理する。Growlの施策がどの4Pに対応しているかを理解できる",
  },
  {
    icon: "💡",
    title: "デザイン思考",
    desc: "顧客の「言えていないニーズ」を掘り起こす思考プロセス。共感→問題定義→アイデア創出→試作→検証の5ステップで施策の質を上げる",
  },
  {
    icon: "🚀",
    title: "DX・デジタルシフト",
    desc: "AIやデジタルツールを組織・業務に組み込む方法論。ChatGPT登場以降の技術転換点でどう動くかを理解する",
  },
  {
    icon: "🤙",
    title: "クライアント視点の案件運用",
    desc: "「広告を売る」ではなく「顧客の事業を伸ばすコンサル」として動く考え方。数字で成果を語り、顧客と運命共同体になるための実務姿勢",
  },
];

export default function LearnPage() {
  const router = useRouter();
  const { t } = useLang();

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
          {TOPICS.map((t) => (
            <div
              key={t.title}
              className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 flex gap-4 items-start"
            >
              <span className="text-2xl shrink-0">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
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
