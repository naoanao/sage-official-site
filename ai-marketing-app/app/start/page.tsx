"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

// 広告専用ランディングページ（/start）。英語/日本語バイリンガル。
// 広告コピーとメッセージを一致させ、リーク（トップページ回遊）を防ぐ。
// 単一CTA → オンボーディング開始。CTAクリックでMeta Pixel "Lead" を発火（CV計測）。
declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

const CTA_HREF = "/onboarding/industry";

export default function StartLandingPage() {
  const { lang } = useLang();
  const isEn = lang === "en";

  useEffect(() => {
    try { window.fbq?.("trackCustom", "LP_View", { lp: "start" }); } catch {}
  }, []);

  const onCta = () => {
    try { window.fbq?.("track", "Lead", { content_name: "free_trial_start" }); } catch {}
    try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "lp_cta_click", { lp: "start" }); } catch {}
  };

  const benefits = isEn
    ? [
        { t: "Ready in minutes", d: "Answer 5 questions. AI writes the copy and makes the image." },
        { t: "No expertise needed", d: "You don't need to know how ads work. AI handles the hard settings." },
        { t: "No wasted spend", d: "Budget caps + automatic policy checks. Start small and safe." },
      ]
    : [
        { t: "数分で完成", d: "5つの質問に答えるだけ。コピーも画像もAIが用意します。" },
        { t: "専門知識ゼロ", d: "広告の作り方を知らなくてOK。難しい設定はAIにおまかせ。" },
        { t: "ムダ打ちを防ぐ", d: "予算上限とポリシー自動チェック付き。安全に小さく始められます。" },
      ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="max-w-xl mx-auto px-5 pt-14 pb-24">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-lg font-extrabold text-indigo-600">Growl</span>
          <span className="text-xs text-gray-400">{isEn ? "AI marketing assistant" : "AI集客アシスタント"}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          {isEn ? (
            <>Your next ad, built by <span className="text-indigo-600">AI</span><br />in 3 minutes.</>
          ) : (
            <>広告は、AIに<span className="text-indigo-600">3分</span>で<br />作らせる時代。</>
          )}
        </h1>
        <p className="mt-4 text-gray-600 text-base leading-relaxed">
          {isEn ? (
            <>No agency, no expertise. Just answer a few questions and AI builds ad copy, an image and targeting that fit your business. <span className="font-semibold text-gray-800">Start free.</span></>
          ) : (
            <>代理店に頼まず、専門知識ゼロで。あなたの事業に合った広告コピー・画像・ターゲティングを、質問に答えるだけでAIが用意します。<span className="font-semibold text-gray-800">まずは無料で。</span></>
          )}
        </p>

        <Link href={CTA_HREF} onClick={onCta}
          className="mt-7 block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-colors">
          {isEn ? "Create your ad free →" : "無料で広告を作ってみる →"}
        </Link>
        <p className="mt-2 text-center text-xs text-gray-400">{isEn ? "No credit card · 1 minute to start" : "クレジットカード不要・1分で開始"}</p>

        <div className="mt-12 space-y-4">
          {benefits.map((b) => (
            <div key={b.t} className="flex gap-3 items-start bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">✓</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{b.t}</p>
                <p className="text-gray-500 text-sm mt-0.5">{b.d}</p>
              </div>
            </div>
          ))}
        </div>

        <Link href={CTA_HREF} onClick={onCta}
          className="mt-10 block text-center border border-indigo-200 text-indigo-700 font-semibold text-sm py-3 rounded-xl hover:bg-indigo-50 transition-colors">
          {isEn ? "Start free" : "無料ではじめる"}
        </Link>

        <p className="mt-10 text-center text-[11px] text-gray-400">
          {isEn ? (
            <>By using this you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</>
          ) : (
            <>ご利用は<Link href="/terms" className="underline">利用規約</Link>・<Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意の上で。</>
          )}
        </p>
      </div>
    </main>
  );
}
