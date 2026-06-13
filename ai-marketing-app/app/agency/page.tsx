"use client";

import Link from "next/link";
import { useEffect } from "react";

// 代行サービスの紹介LP（/agency）。
// 「広告をAIに丸ごとおまかせ」を訴求し、生成→2プラン→決済の入口へ送る。
declare global { interface Window { fbq?: (...a: unknown[]) => void } }

const CTA = "/onboarding/industry";

export default function AgencyLandingPage() {
  useEffect(() => { try { window.fbq?.("trackCustom", "AgencyLP_View"); } catch {} }, []);
  const onCta = () => { try { window.fbq?.("track", "Lead", { content_name: "agency_lp" }); } catch {} };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="max-w-2xl mx-auto px-5 pt-12 pb-24">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-lg font-extrabold text-indigo-600">Growl</span>
          <span className="text-xs text-gray-400">AI広告運用代行</span>
        </div>

        {/* Hook: アウトカム先行 */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          広告、<span className="text-indigo-600">AIに丸ごと</span>
          <br />おまかせしませんか？
        </h1>
        <p className="mt-4 text-gray-600 text-base leading-relaxed">
          作るのも、配信も、毎日の改善も、ぜんぶAIが代行。あなたは事業のことに集中するだけ。
          代理店より圧倒的に安く、専門知識ゼロ・接続作業なしで始められます。
        </p>

        <Link href={CTA} onClick={onCta}
          className="mt-7 block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-colors">
          まずは無料で広告を作ってみる →
        </Link>
        <p className="mt-2 text-center text-xs text-gray-400">クレジットカード不要・1分で開始・縛りなし</p>

        {/* 3ステップ */}
        <div className="mt-14">
          <p className="text-xs font-bold text-indigo-500 mb-4 tracking-wide">かんたん3ステップ</p>
          <div className="space-y-3">
            {[
              { n: "1", t: "質問に答える", d: "業種や目標など、いくつか答えるだけ。" },
              { n: "2", t: "AIが広告を作る", d: "コピー・画像・ターゲティングを自動生成。中身を確認できます。" },
              { n: "3", t: "おまかせで配信", d: "あとはAIが配信・最適化・改善まで代行。成果はレポートで。" },
            ].map((s) => (
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

        {/* なぜGrowl */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { t: "代理店の数分の一", d: "高い管理料・長期契約は不要。" },
            { t: "作業ゼロ", d: "接続も運用もAIにおまかせ。" },
            { t: "ムダ打ち防止", d: "予算上限とポリシー自動チェック。" },
          ].map((b) => (
            <div key={b.t} className="bg-indigo-50/60 rounded-2xl p-4">
              <p className="font-bold text-gray-900 text-sm">{b.t}</p>
              <p className="text-gray-500 text-xs mt-1">{b.d}</p>
            </div>
          ))}
        </div>

        {/* 料金 */}
        <div className="mt-14">
          <p className="text-xs font-bold text-indigo-500 mb-1 tracking-wide">料金（ベータ・先着10名は料金ロック）</p>
          <div className="space-y-3 mt-3">
            <div className="bg-white border-2 border-indigo-500 rounded-2xl p-5 shadow-sm relative">
              <span className="absolute -top-2 right-4 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">おすすめ・全自動</span>
              <p className="font-bold text-gray-900">フルおまかせ（広告費込み）</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">¥9,800<span className="text-sm font-medium text-gray-400">/月</span></p>
              <p className="text-xs text-gray-500 mt-1">管理＋広告費込み。支払い後、AIが自動で配信・最適化。あなたの作業はゼロ。</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-gray-900">管理だけ</p>
              <p className="text-2xl font-extrabold text-gray-800 mt-1">¥2,980<span className="text-sm font-medium text-gray-400">/月</span></p>
              <p className="text-xs text-gray-500 mt-1">AIが広告を作成・運用代行。広告費はご自身でご用意（安く始めたい方に）。</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-gray-400">いつでも解約可。成果を保証するものではありません。広告は審査後に配信されます。</p>
        </div>

        <Link href={CTA} onClick={onCta}
          className="mt-10 block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-colors">
          無料で広告を作ってみる →
        </Link>
        <p className="mt-2 text-center text-xs text-gray-400">まず無料で中身を見てから、続けるか決められます。</p>

        <p className="mt-10 text-center text-[11px] text-gray-400">
          <Link href="/terms" className="underline">利用規約</Link>・
          <Link href="/privacy" className="underline">プライバシーポリシー</Link>
        </p>
      </div>
    </main>
  );
}
