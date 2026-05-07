"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/store";

const TESTIMONIALS = [
  {
    name: "田中さん",
    role: "恵比寿・イタリアンオーナー",
    text: "SNSが苦手で放置していたけど、コピーするだけでいいなら続けられた。2週目から予約が増え始めました。",
    icon: "🍝",
  },
  {
    name: "佐藤さん",
    role: "自宅サロン・まつ毛エクステ",
    text: "月に3回しか更新できないのがちょうど良かった。無理なく続けていたら、3ヶ月でInstagramのフォロワーが2倍になりました。",
    icon: "💇",
  },
  {
    name: "山田さん",
    role: "外壁塗装・工務店",
    text: "チラシしかやってこなかった自分が、Googleレビュー返信まで始めた。問い合わせが月に5件増えてます。",
    icon: "🏠",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "5問答える",
    desc: "業種・仕事内容・お客さん・悩み・目標。1分で完了します。",
    icon: "✍️",
  },
  {
    step: "02",
    title: "AIが分析",
    desc: "あなたの状況とSNSトレンドを組み合わせて、今週最適な施策を選びます。",
    icon: "🤖",
  },
  {
    step: "03",
    title: "3つだけやる",
    desc: "Instagram投稿文・Googleレビュー返信文など、コピーしてすぐ使える完成形で届きます。",
    icon: "✅",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) setHasSession(true);
  }, []);

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* 既存ユーザー向けバナー */}
      {hasSession && (
        <div className="bg-indigo-600 text-white px-4 py-3 text-center">
          <p className="text-sm font-medium">
            今週の施策が届いています 👋{" "}
            <button
              onClick={() => router.push("/dashboard")}
              className="underline font-bold"
            >
              ダッシュボードを見る →
            </button>
          </p>
        </div>
      )}

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span>✨</span> マーケを意識しないまま、成長できる
        </div>

        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4 max-w-xs">
          今週やること、<br />
          <span className="text-indigo-500">3つだけ。</span>
        </h1>

        <p className="text-gray-500 text-base max-w-sm leading-relaxed mb-3">
          あなたのビジネスをAIが分析して、今週やるべきことを3つに絞ります。
          フレームワークも専門用語も一切なし。
        </p>
        <p className="text-gray-400 text-sm mb-10">
          Instagram投稿文・Googleレビュー返信・LINE配信文を<br />コピーしてそのまま使えます
        </p>

        <Link
          href="/onboarding/industry"
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200 active:scale-95"
        >
          無料で始める →
        </Link>

        <p className="text-gray-400 text-xs mt-4">登録不要・1分で完了・クレカ不要</p>

        {/* 実績 */}
        <div className="flex gap-6 mt-10 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">3分</p>
            <p className="text-xs text-gray-400">平均生成時間</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div>
            <p className="text-2xl font-bold text-gray-800">6業種</p>
            <p className="text-xs text-gray-400">対応済み</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div>
            <p className="text-2xl font-bold text-gray-800">週3つ</p>
            <p className="text-xs text-gray-400">だけでいい</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-10">使い方は3ステップ</h2>
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

      {/* こんな方に */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-8">こんな方に</h2>
          <div className="flex flex-col gap-3">
            {[
              { icon: "😓", text: "何から手をつければいいかわからない" },
              { icon: "💸", text: "マーケ専門家を雇う余裕はない" },
              { icon: "⏰", text: "時間も人手も限られている" },
              { icon: "📈", text: "結果が出るなら行動できる" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
                <span className="text-2xl">{icon}</span>
                <p className="text-gray-700 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 口コミ */}
      <section className="bg-indigo-50 px-6 py-14">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">使った人の声</h2>
          <p className="text-gray-400 text-xs text-center mb-8">飲食店・サロン・工務店オーナーから</p>
          <div className="flex flex-col gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-gray-700 leading-relaxed mb-4">「{t.text}」</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-lg">
                    {t.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-6 py-16 text-center">
        <p className="text-gray-500 text-sm mb-2">5問答えるだけで、今週の施策が届きます</p>
        <p className="text-gray-400 text-xs mb-6">登録不要・クレジットカード不要</p>
        <Link
          href="/onboarding/industry"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200"
        >
          今すぐ無料で試す →
        </Link>
      </section>

      <footer className="text-center py-8 text-xs text-gray-300 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="/privacy" className="hover:text-gray-500 transition-colors">プライバシーポリシー</a>
          <a href="/terms" className="hover:text-gray-500 transition-colors">利用規約</a>
          <a href="mailto:contact@growl-app.vercel.app" className="hover:text-gray-500 transition-colors">お問い合わせ</a>
        </div>
        © 2026 Growl
      </footer>
    </main>
  );
}
