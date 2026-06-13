"use client";

import { useEffect } from "react";
import Link from "next/link";

// 広告専用ランディングページ（/start）。
// 広告コピーとメッセージを一致させ、リーク（トップページ回遊）を防ぐ。
// 単一CTA → オンボーディング開始。CTAクリックでMeta Pixel "Lead" を発火（CV計測）。
// fbq はlayoutのPixelで読み込まれる（NEXT_PUBLIC_META_PIXEL_ID 設定時）。
declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

const CTA_HREF = "/onboarding/industry";

export default function StartLandingPage() {
  useEffect(() => {
    // 広告流入の到達を計測（任意イベント）
    try { window.fbq?.("trackCustom", "LP_View", { lp: "start" }); } catch {}
  }, []);

  const onCta = () => {
    try { window.fbq?.("track", "Lead", { content_name: "free_trial_start" }); } catch {}
    try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "lp_cta_click", { lp: "start" }); } catch {}
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="max-w-xl mx-auto px-5 pt-14 pb-24">
        {/* ロゴ／信頼の一言 */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-lg font-extrabold text-indigo-600">Growl</span>
          <span className="text-xs text-gray-400">AI集客アシスタント</span>
        </div>

        {/* 見出し：機能でなく“結果”を売る・アウトカム先行 */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          広告は、AIに<span className="text-indigo-600">3分</span>で
          <br />作らせる時代。
        </h1>
        <p className="mt-4 text-gray-600 text-base leading-relaxed">
          代理店に頼まず、専門知識ゼロで。あなたの事業に合った広告コピー・画像・ターゲティングを、
          質問に答えるだけでAIが用意します。<span className="font-semibold text-gray-800">まずは無料で。</span>
        </p>

        {/* CTA（単一・明確） */}
        <Link
          href={CTA_HREF}
          onClick={onCta}
          className="mt-7 block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-colors"
        >
          無料で広告を作ってみる →
        </Link>
        <p className="mt-2 text-center text-xs text-gray-400">クレジットカード不要・1分で開始</p>

        {/* ベネフィット3点（行動を促す要点） */}
        <div className="mt-12 space-y-4">
          {[
            { t: "数分で完成", d: "5つの質問に答えるだけ。コピーも画像もAIが用意します。" },
            { t: "専門知識ゼロ", d: "広告の作り方を知らなくてOK。難しい設定はAIにおまかせ。" },
            { t: "ムダ打ちを防ぐ", d: "予算上限とポリシー自動チェック付き。安全に小さく始められます。" },
          ].map((b) => (
            <div key={b.t} className="flex gap-3 items-start bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">✓</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{b.t}</p>
                <p className="text-gray-500 text-sm mt-0.5">{b.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* セカンダリCTA */}
        <Link
          href={CTA_HREF}
          onClick={onCta}
          className="mt-10 block text-center border border-indigo-200 text-indigo-700 font-semibold text-sm py-3 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          無料ではじめる
        </Link>

        <p className="mt-10 text-center text-[11px] text-gray-400">
          ご利用は<Link href="/terms" className="underline">利用規約</Link>・
          <Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意の上で。
        </p>
      </div>
    </main>
  );
}
