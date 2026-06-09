"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/store";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

export default function LandingPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const isEn = lang === "en";
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) setHasSession(true);
  }, []);

  const HOW_IT_WORKS = [
    { step: "01", title: t("land.step1.title"), desc: t("land.step1.desc"), icon: "✍️" },
    { step: "02", title: t("land.step2.title"), desc: t("land.step2.desc"), icon: "🤖" },
    { step: "03", title: t("land.step3.title"), desc: t("land.step3.desc"), icon: "✅" },
  ];

  const TESTIMONIALS = [
    { name: t("land.testimonial1.name"), role: t("land.testimonial1.role"), text: t("land.testimonial1.text"), icon: "🍝" },
    { name: t("land.testimonial2.name"), role: t("land.testimonial2.role"), text: t("land.testimonial2.text"), icon: "💇" },
    { name: t("land.testimonial3.name"), role: t("land.testimonial3.role"), text: t("land.testimonial3.text"), icon: "🏠" },
  ];

  const TARGET_USERS = isEn ? [
    { icon: "😓", text: "You wonder 'what should I post this week?' every single week" },
    { icon: "💸", text: "You can't afford to hire a marketing specialist" },
    { icon: "⏰", text: "Time and staff are limited" },
    { icon: "📈", text: "Once you know what to do, you'll act — you just don't know what" },
  ] : [
    { icon: "😓", text: "毎週「今週何を投稿しよう」と悩んでいる" },
    { icon: "💸", text: "マーケ専門家を雇う余裕はない" },
    { icon: "⏰", text: "時間も人手も限られている" },
    { icon: "📈", text: "やると決めたら動ける。ただ何をやるかが分からない" },
  ];

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Language toggle */}
      <div className="flex justify-end px-4 py-3">
        <LangToggle />
      </div>

      {/* Returning user banner */}
      {hasSession && (
        <div className="bg-indigo-600 text-white px-4 py-3 text-center">
          <p className="text-sm font-medium">
            {isEn ? "Your weekly actions are ready 👋 " : "今週の施策が届いています 👋 "}
            <button
              onClick={() => router.push("/dashboard")}
              className="underline font-bold"
            >
              {isEn ? "Go to Dashboard →" : "ダッシュボードを見る →"}
            </button>
          </p>
        </div>
      )}

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span>✨</span> {t("land.badge")}
        </div>

        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4 max-w-xs">
          {isEn ? (
            <>Just <span className="text-indigo-500">3 actions</span><br />this week.</>
          ) : (
            <>今週やること、<br /><span className="text-indigo-500">3つだけ。</span></>
          )}
        </h1>

        <p className="text-gray-500 text-base max-w-sm leading-relaxed mb-3">
          {isEn
            ? "No more wondering 'what should I post this week?'. AI analyzes your business and delivers 3 ready-to-use pieces of content."
            : "「今週何を投稿しよう」と悩む時間、ゼロにしませんか。AIがあなたのビジネスを分析して、コピペするだけの完成文を3つ届けます。"}
        </p>
        <p className="text-gray-400 text-sm mb-10">
          {isEn ? (
            <>Instagram posts · Google review replies · social content —<br />all delivered ready to use</>
          ) : (
            <>Instagram投稿文・Googleレビュー返信・LINE配信文——<br />全部、明日から使える状態で届きます</>
          )}
        </p>

        <Link
          href="/onboarding/industry"
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200 active:scale-95"
        >
          {isEn ? "Start free →" : "無料で始める →"}
        </Link>

        <p className="text-gray-400 text-xs mt-4">
          {isEn ? "No signup · 1 minute · No credit card" : "登録不要・1分で完了・クレカ不要"}
        </p>

        <Link
          href="/diagnosis"
          className="inline-block mt-3 text-sm text-indigo-500 hover:text-indigo-600 font-medium underline underline-offset-4 transition-colors"
        >
          {t("diag.cta")}
        </Link>

        {/* Stats */}
        <div className="flex gap-6 mt-10 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{isEn ? "1 min" : "1分"}</p>
            <p className="text-xs text-gray-400">{isEn ? "to set up" : "入力にかかる時間"}</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div>
            <p className="text-2xl font-bold text-gray-800">{isEn ? "Weekly" : "毎週"}</p>
            <p className="text-xs text-gray-400">{isEn ? "AI auto-updates" : "AIが自動更新"}</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div>
            <p className="text-2xl font-bold text-gray-800">{isEn ? "3 tasks" : "週3つ"}</p>
            <p className="text-xs text-gray-400">{isEn ? "that's all" : "だけでいい"}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-10">
            {isEn ? "How it works" : "使い方は3ステップ"}
          </h2>
          <div className="flex flex-col gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.icon}</span>
                    <p className="font-bold text-gray-800">{item.title}</p>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target users */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-8">
            {isEn ? "Built for you if..." : "こんな方に"}
          </h2>
          <div className="flex flex-col gap-3">
            {TARGET_USERS.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
                <span className="text-2xl">{icon}</span>
                <p className="text-gray-700 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-indigo-50 px-6 py-14">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
            {isEn ? "What users say" : "使った人の声"}
          </h2>
          <p className="text-gray-400 text-xs text-center mb-8">
            {isEn ? "From restaurant, salon, and contractor owners" : "飲食店・サロン・工務店オーナーから"}
          </p>
          <div className="flex flex-col gap-4">
            {TESTIMONIALS.map((item) => (
              <div key={item.name} className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-gray-700 leading-relaxed mb-4">{isEn ? `"${item.text}"` : `「${item.text}」`}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-lg">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
            {isEn ? "Simple pricing" : "シンプルな料金"}
          </h2>
          <p className="text-gray-400 text-xs text-center mb-10">
            {isEn ? "Start free. Upgrade when you're ready." : "まず無料で試して、必要になったら上げる。"}
          </p>
          <div className="flex flex-col gap-4">
            {/* Free */}
            <div className="rounded-2xl border border-gray-100 p-6 bg-gray-50">
              <p className="text-sm font-semibold text-gray-500 mb-1">{isEn ? "Free" : "フリー"}</p>
              <p className="text-3xl font-bold text-gray-900 mb-4">{isEn ? "$0" : "¥0"}<span className="text-base font-normal text-gray-400">{isEn ? "/mo" : "/月"}</span></p>
              <ul className="flex flex-col gap-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{isEn ? "5 analyses per month" : "月5回まで分析"}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{isEn ? "All 10 frameworks (3C, SWOT, STP...)" : "全10フレームワーク（3C・SWOT・STPなど）"}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{isEn ? "No signup required" : "登録不要"}</li>
              </ul>
              <Link href="/onboarding/industry" className="block text-center border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                {isEn ? "Start free →" : "無料で始める →"}
              </Link>
            </div>
            {/* Standard — highlighted */}
            <div className="rounded-2xl border-2 border-indigo-500 p-6 bg-indigo-50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                {isEn ? "Most popular" : "おすすめ"}
              </div>
              <p className="text-sm font-semibold text-indigo-600 mb-1">{isEn ? "Standard" : "スタンダード"}</p>
              <p className="text-3xl font-bold text-gray-900 mb-4">{isEn ? "$19" : "¥3,000"}<span className="text-base font-normal text-gray-400">{isEn ? "/mo" : "/月"}</span></p>
              <ul className="flex flex-col gap-2 text-sm text-gray-700 mb-6">
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span>{isEn ? "Unlimited analyses" : "分析回数は無制限"}</li>
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span><strong>{isEn ? "Meta Ads copy generator" : "Meta広告コピー自動生成"}</strong></li>
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span>{isEn ? "Weekly actions auto-delivered" : "毎週の施策を自動配信"}</li>
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span>{isEn ? "Monthly performance report" : "月次レポートで効果を確認"}</li>
              </ul>
              <Link href="/upgrade" className="block text-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold transition-colors shadow-lg shadow-indigo-200">
                {isEn ? "Start Standard →" : "スタンダードにする →"}
              </Link>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            {isEn ? "Cancel anytime · Secure payment via Stripe" : "いつでもキャンセル可 · Stripe決済で安全"}
          </p>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-6 py-16 text-center">
        <p className="text-gray-500 text-sm mb-2">
          {isEn ? "Answer 5 questions and get this week's actions" : "5問答えるだけで、今週の施策が届きます"}
        </p>
        <p className="text-gray-400 text-xs mb-6">
          {isEn ? "No signup · No credit card" : "登録不要・クレジットカード不要"}
        </p>
        <Link
          href="/onboarding/industry"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200"
        >
          {isEn ? "Start free →" : "今すぐ無料で試す →"}
        </Link>
      </section>

      <footer className="text-center py-8 text-xs text-gray-300 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="/marketing" className="hover:text-gray-500 transition-colors">
            📊 {isEn ? "Market Analysis" : "マーケ分析"}
          </a>
          <a href="/privacy" className="hover:text-gray-500 transition-colors">
            {isEn ? "Privacy Policy" : "プライバシーポリシー"}
          </a>
          <a href="/terms" className="hover:text-gray-500 transition-colors">
            {isEn ? "Terms" : "利用規約"}
          </a>
          <a href="mailto:contact@growl-app.vercel.app" className="hover:text-gray-500 transition-colors">
            {isEn ? "Contact" : "お問い合わせ"}
          </a>
        </div>
        © 2026 Growl
      </footer>
    </main>
  );
}
