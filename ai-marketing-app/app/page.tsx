"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/store";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";
import SpaceBackground from "@/components/SpaceBackground";

export default function LandingPage() {
  const router = useRouter();
  const { t, lang } = useLang();
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

  const TARGET_USERS = [
    { icon: "😓", text: t("land.target.t1") },
    { icon: "💸", text: t("land.target.t2") },
    { icon: "⏰", text: t("land.target.t3") },
    { icon: "📈", text: t("land.target.t4") },
  ];

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <SpaceBackground />

      {/* Language toggle */}
      <div className="flex justify-end px-4 py-3">
        <LangToggle />
      </div>

      {/* Returning user banner */}
      {hasSession && (
        <div className="bg-indigo-600 text-white px-4 py-3 text-center">
          <p className="text-sm font-medium">
            {lang === "en" ? "Your weekly actions are ready 👋 " : "今週の施策が届いています 👋 "}
            <button
              onClick={() => router.push("/dashboard")}
              className="underline font-bold"
            >
              {lang === "en" ? "Go to Dashboard →" : "ダッシュボードを見る →"}
            </button>
          </p>
        </div>
      )}

      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 text-center bg-black/60 backdrop-blur-sm">
        <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-8 border border-indigo-500/20">
          <span>✨</span> {t("land.badge")}
        </div>

        <h1 className="text-4xl font-bold text-white leading-tight mb-4 max-w-xs whitespace-pre-wrap">
          {t("land.hero.title1")}
          <span className="text-indigo-400">{t("land.hero.title2")}</span>
          {t("land.hero.title3")}
        </h1>

        <p className="text-gray-300 text-base max-w-sm leading-relaxed mb-3 whitespace-pre-wrap">
          {t("land.hero.desc")}
        </p>
        <p className="text-gray-400 text-sm mb-10 whitespace-pre-wrap">
          {t("land.hero.subdesc")}
        </p>

        <Link
          href="/onboarding/industry"
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-500/30 active:scale-95"
        >
          {t("land.hero.cta")}
        </Link>

        <p className="text-gray-400 text-xs mt-4">
          {t("land.hero.cta_sub")}
        </p>

        <Link
          href="/diagnosis"
          className="inline-block mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 transition-colors"
        >
          {t("land.hero.diag")}
        </Link>

        <Link
          href="/agency"
          className="inline-block mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 transition-colors"
        >
          {t("land.hero.agency")}
        </Link>

        {/* Stats */}
        <div className="flex gap-6 mt-10 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{t("land.stats.time")}</p>
            <p className="text-xs text-gray-400">{t("land.stats.time_sub")}</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold text-white">{t("land.stats.freq")}</p>
            <p className="text-xs text-gray-400">{t("land.stats.freq_sub")}</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold text-white">{t("land.stats.tasks")}</p>
            <p className="text-xs text-gray-400">{t("land.stats.tasks_sub")}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-10">
            {t("land.how")}
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
            {t("land.target.title")}
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
            {t("land.voice")}
          </h2>
          <p className="text-gray-400 text-xs text-center mb-8">
            {t("land.voice.sub")}
          </p>
          <div className="flex flex-col gap-4">
            {TESTIMONIALS.map((item) => (
              <div key={item.name} className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-gray-700 leading-relaxed mb-4">{`「${item.text}」`}</p>
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
            {t("land.price.title")}
          </h2>
          <p className="text-gray-400 text-xs text-center mb-10">
            {t("land.price.sub")}
          </p>
          <div className="flex flex-col gap-4">
            {/* Free */}
            <div className="rounded-2xl border border-gray-100 p-6 bg-gray-50">
              <p className="text-sm font-semibold text-gray-500 mb-1">{t("land.price.free")}</p>
              <p className="text-3xl font-bold text-gray-900 mb-4">{t("land.price.free.price")}<span className="text-base font-normal text-gray-400">{t("land.price.free.unit")}</span></p>
              <ul className="flex flex-col gap-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{t("land.price.free.f1")}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{t("land.price.free.f2")}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span>{t("land.price.free.f3")}</li>
              </ul>
              <Link href="/onboarding/industry" className="block text-center border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                {t("land.price.free.cta")}
              </Link>
            </div>
            {/* Standard — highlighted */}
            <div className="rounded-2xl border-2 border-indigo-500 p-6 bg-indigo-50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t("land.price.popular")}
              </div>
              <p className="text-sm font-semibold text-indigo-600 mb-1">{t("land.price.std")}</p>
              <p className="text-3xl font-bold text-gray-900 mb-4">{t("land.price.std.price")}<span className="text-base font-normal text-gray-400">{t("land.price.std.unit")}</span></p>
              <ul className="flex flex-col gap-2 text-sm text-gray-700 mb-6">
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span>{t("land.price.std.f1")}</li>
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span><strong>{t("land.price.std.f2")}</strong></li>
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span>{t("land.price.std.f3")}</li>
                <li className="flex items-center gap-2"><span className="text-indigo-500">✓</span>{t("land.price.std.f4")}</li>
              </ul>
              <Link href="/upgrade" className="block text-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold transition-colors shadow-lg shadow-indigo-200">
                {t("land.price.std.cta")}
              </Link>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            {t("land.price.footer")}
          </p>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-6 py-16 text-center">
        <p className="text-gray-500 text-sm mb-2">
          {t("land.bottom.desc")}
        </p>
        <p className="text-gray-400 text-xs mb-6">
          {t("land.bottom.sub")}
        </p>
        <Link
          href="/onboarding/industry"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200"
        >
          {t("land.bottom.cta")}
        </Link>
      </section>

      <footer className="text-center py-8 text-xs text-gray-300 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="/marketing" className="hover:text-gray-500 transition-colors">
            📊 {t("land.footer.market")}
          </a>
          <a href="/privacy" className="hover:text-gray-500 transition-colors">
            {t("land.footer.privacy")}
          </a>
          <a href="/terms" className="hover:text-gray-500 transition-colors">
            {t("land.footer.terms")}
          </a>
          <a href="mailto:contact@growl-ai.com" className="hover:text-gray-500 transition-colors">
            {t("land.footer.contact")}
          </a>
        </div>
        © 2026 Growl
      </footer>
    </main>
  );
}
