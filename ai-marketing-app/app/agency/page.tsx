"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

// 代行サービスの紹介LP（/agency）。英語/日本語バイリンガル。
declare global { interface Window { fbq?: (...a: unknown[]) => void } }

const CTA = "/onboarding/industry";

export default function AgencyLandingPage() {
  const { lang } = useLang();
  const isEn = lang === "en";
  useEffect(() => { try { window.fbq?.("trackCustom", "AgencyLP_View"); } catch {} }, []);
  const onCta = () => { try { window.fbq?.("track", "Lead", { content_name: "agency_lp" }); } catch {} };

  const steps = isEn
    ? [
        { n: "1", t: "Answer a few questions", d: "Your industry, goal, and offer — that's it." },
        { n: "2", t: "AI builds your ad", d: "Copy, image and targeting generated. You can review it." },
        { n: "3", t: "We run it for you", d: "AI launches, optimizes and improves it. Results by report." },
      ]
    : [
        { n: "1", t: "質問に答える", d: "業種や目標など、いくつか答えるだけ。" },
        { n: "2", t: "AIが広告を作る", d: "コピー・画像・ターゲティングを自動生成。中身を確認できます。" },
        { n: "3", t: "おまかせで配信", d: "あとはAIが配信・最適化・改善まで代行。成果はレポートで。" },
      ];

  const benefits = isEn
    ? [
        { t: "A fraction of an agency", d: "No high retainers or contracts." },
        { t: "Zero work for you", d: "AI handles setup and management." },
        { t: "No wasted spend", d: "Budget caps + auto policy checks." },
      ]
    : [
        { t: "代理店の数分の一", d: "高い管理料・長期契約は不要。" },
        { t: "作業ゼロ", d: "接続も運用もAIにおまかせ。" },
        { t: "ムダ打ち防止", d: "予算上限とポリシー自動チェック。" },
      ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="flex justify-end px-5 pt-4">
        <LangToggle />
      </div>
      <div className="max-w-2xl mx-auto px-5 pt-4 pb-24">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-lg font-extrabold text-indigo-600">Growl</span>
          <span className="text-xs text-gray-400">{isEn ? "AI Ad Management" : "AI広告運用代行"}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          {isEn ? (
            <>Let <span className="text-indigo-600">AI run</span><br />your ads for you.</>
          ) : (
            <>広告、<span className="text-indigo-600">AIに丸ごと</span><br />おまかせしませんか？</>
          )}
        </h1>
        <p className="mt-4 text-gray-600 text-base leading-relaxed">
          {isEn
            ? "Creating, launching, and daily optimization — all done by AI. You focus on your business. Far cheaper than an agency, no expertise and no setup required."
            : "作るのも、配信も、毎日の改善も、ぜんぶAIが代行。あなたは事業のことに集中するだけ。代理店より圧倒的に安く、専門知識ゼロ・接続作業なしで始められます。"}
        </p>

        <Link href={CTA} onClick={onCta}
          className="mt-7 block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-colors">
          {isEn ? "Create your ad free →" : "まずは無料で広告を作ってみる →"}
        </Link>
        <p className="mt-2 text-center text-xs text-gray-400">
          {isEn ? "No credit card · 1 minute · cancel anytime" : "クレジットカード不要・1分で開始・縛りなし"}
        </p>

        <div className="mt-14">
          <p className="text-xs font-bold text-indigo-500 mb-4 tracking-wide">{isEn ? "3 SIMPLE STEPS" : "かんたん3ステップ"}</p>
          <div className="space-y-3">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-3 items-start bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">{s.n}</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{s.t}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {benefits.map((b) => (
            <div key={b.t} className="bg-indigo-50/60 rounded-2xl p-4">
              <p className="font-bold text-gray-900 text-sm">{b.t}</p>
              <p className="text-gray-500 text-xs mt-1">{b.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <p className="text-xs font-bold text-indigo-500 mb-1 tracking-wide">{isEn ? "PRICING (beta — first 10 lock this rate)" : "料金（ベータ・先着10名は料金ロック）"}</p>
          <div className="space-y-3 mt-3">
            <div className="bg-white border-2 border-indigo-500 rounded-2xl p-5 shadow-sm relative">
              <span className="absolute -top-2 right-4 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">{isEn ? "Recommended · Full auto" : "おすすめ・全自動"}</span>
              <p className="font-bold text-gray-900">{isEn ? "Full service (ad budget included)" : "フルおまかせ（広告費込み）"}</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">{isEn ? "$79" : "¥9,800"}<span className="text-sm font-medium text-gray-400">{isEn ? "/mo" : "/月"}</span></p>
              <p className="text-xs text-gray-500 mt-1">{isEn ? "Management + ad budget included. After payment, AI runs and optimizes it automatically. Zero work for you." : "管理＋広告費込み。支払い後、AIが自動で配信・最適化。あなたの作業はゼロ。"}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-gray-900">{isEn ? "Management only" : "管理だけ"}</p>
              <p className="text-2xl font-extrabold text-gray-800 mt-1">{isEn ? "$19" : "¥2,980"}<span className="text-sm font-medium text-gray-400">{isEn ? "/mo" : "/月"}</span></p>
              <p className="text-xs text-gray-500 mt-1">{isEn ? "AI creates and manages your ad; you provide the ad budget (for starting lean)." : "AIが広告を作成・運用代行。広告費はご自身でご用意（安く始めたい方に）。"}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-gray-400">{isEn ? "Cancel anytime. Results are not guaranteed. Ads run after review." : "いつでも解約可。成果を保証するものではありません。広告は審査後に配信されます。"}</p>
        </div>

        <Link href={CTA} onClick={onCta}
          className="mt-10 block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-colors">
          {isEn ? "Create your ad free →" : "無料で広告を作ってみる →"}
        </Link>
        <p className="mt-2 text-center text-xs text-gray-400">{isEn ? "See the ad first, then decide whether to continue." : "まず無料で中身を見てから、続けるか決められます。"}</p>

        <p className="mt-10 text-center text-[11px] text-gray-400">
          <Link href="/terms" className="underline">{isEn ? "Terms" : "利用規約"}</Link> ·
          <Link href="/privacy" className="underline">{isEn ? "Privacy" : "プライバシーポリシー"}</Link>
        </p>
      </div>
    </main>
  );
}
