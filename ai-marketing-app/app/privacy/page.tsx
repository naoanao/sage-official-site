"use client";

import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

const JA_CONTENT = {
  title: "プライバシーポリシー",
  updated: "最終更新日: 2026年6月3日",
  sections: [
    {
      h: "1. Growlについて",
      p: "Growlは小規模事業者向けのAIマーケティングツールです。本プライバシーポリシーは、お客様の情報の収集・利用・保護について説明します。",
    },
    {
      h: "2. 収集する情報",
      items: [
        "お客様が提供する事業情報（業種、事業説明、ターゲット顧客）",
        "利用データ（完了したアクション、アプリ操作履歴）",
        "Metaアカウント接続時の情報：アクセストークン、広告アカウントID、ページID — これらはお客様の代理で広告を作成する目的のみに使用します",
        "ブラウザのローカルストレージに保存されるデバイス識別子",
      ],
    },
    {
      h: "3. Metaプラットフォームデータ",
      p: "Metaアカウントを接続すると、Growlはads_management、ads_read、pages_read_engagement、pages_show_listの権限をリクエストします。これらはお客様のアカウントで広告キャンペーンを作成するためだけに使用します。広告費用はお客様のMetaアカウントに直接請求され、Growlが代わりに請求することはありません。接続を解除するにはfacebook.com/settings（アプリとウェブサイト）からいつでも削除できます。",
    },
    {
      h: "4. データ共有",
      p: "当社はお客様のデータを販売することはありません。以下のプロバイダとのみ共有します：AIプロバイダ（Groq）によるコンテンツ生成、Supabaseによるデータベースホスティング、Vercelによるアプリホスティング。",
    },
    {
      h: "5. データの保存と削除",
      p: "データはSupabase（クラウドデータベース）に保存されます。アカウント削除をご希望の場合は、hello@growl-ai.comまでご連絡ください。",
    },
    {
      h: "6. お問い合わせ",
      p: "hello@growl-ai.com",
    },
  ],
};

export default function PrivacyPage() {
  const { isEn } = useLang();

  if (!isEn) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 max-w-2xl mx-auto">
        <div className="flex justify-end mb-4"><LangToggle /></div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{JA_CONTENT.title}</h1>
        <p className="text-sm text-gray-400 mb-10">{JA_CONTENT.updated}</p>
        <section className="space-y-8 text-gray-700 text-sm leading-relaxed">
          {JA_CONTENT.sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{s.h}</h2>
              {s.p && <p>{s.p}</p>}
              {s.items && <ul className="list-disc pl-5 space-y-1">{s.items.map((item, j) => <li key={j}>{item}</li>)}</ul>}
            </div>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 max-w-2xl mx-auto">
      <div className="flex justify-end mb-4"><LangToggle /></div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: June 3, 2026</p>
      <section className="space-y-8 text-gray-700 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. About Growl</h2>
          <p>Growl is an AI-powered marketing tool for small business owners. This Privacy Policy explains how we collect, use, and protect your information.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Business information you provide (industry, description, target customers)</li>
            <li>Usage data (actions completed, app interactions)</li>
            <li>Meta account data when you connect your Meta account: access tokens, ad account IDs, Page IDs — used solely to create ads on your behalf</li>
            <li>Device identifiers stored in your browser local storage</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Meta Platform Data</h2>
          <p>When you connect your Meta account, Growl requests: ads_management, ads_read, pages_read_engagement, pages_show_list. We use these only to create ad campaigns in your account. Ad spend is charged directly to your Meta account. We never charge your Meta account ourselves.</p>
          <p className="mt-2">You can revoke access anytime at facebook.com/settings (Apps and Websites).</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Data Sharing</h2>
          <p>We do not sell your data. We share only with: AI providers (Groq) for content generation, Supabase for database hosting, Vercel for app hosting.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Data Deletion</h2>
           <p>Use the "Start over" button to clear your session. To delete server data, email: hello@growl-ai.com</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact</h2>
          <p>hello@growl-ai.com</p>
        </div>
      </section>
      <div className="mt-12 border-t border-gray-100 pt-6">
        <a href="/" className="text-sm text-indigo-500">Back to Growl</a>
      </div>
    </main>
  );
}
