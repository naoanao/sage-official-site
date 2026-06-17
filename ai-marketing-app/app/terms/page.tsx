"use client";

import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

export default function TermsPage() {
  const { isEn } = useLang();

  if (!isEn) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 max-w-2xl mx-auto">
        <div className="flex justify-end mb-4"><LangToggle /></div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">利用規約</h1>
        <p className="text-sm text-gray-400 mb-10">最終更新日: 2026年6月3日</p>
        <section className="space-y-8 text-gray-700 text-sm leading-relaxed">
          <div><h2 className="text-lg font-semibold text-gray-900 mb-2">1. 同意</h2><p>Growlをご利用いただくことで、本規約に同意したものとみなします。同意いただけない場合は、サービスをご利用いただけません。</p></div>
          <div><h2 className="text-lg font-semibold text-gray-900 mb-2">2. サービスの説明</h2><p>Growlは、小規模事業者向けにAIによるマーケティング提案およびMeta広告作成支援を提供します。本サービスは「現状のまま」提供され、いかなる保証も伴いません。</p></div>
          <div><h2 className="text-lg font-semibold text-gray-900 mb-2">3. Meta広告機能</h2><p>広告は必ず「一時停止（PAUSED）」状態で作成されます。ユーザー自身がMeta広告マネージャーで確認・有効化する必要があります。広告費用はお客様のMetaアカウントに直接請求され、Growlは一切の広告費用を請求しません。</p></div>
          <div><h2 className="text-lg font-semibold text-gray-900 mb-2">4. 免責事項</h2><p>AIが生成するマーケティング提案は参考情報です。実際のビジネス判断はご自身の責任で行ってください。AI利用に伴う第三者とのトラブルについて、当社は一切の責任を負いません。</p></div>
          <div><h2 className="text-lg font-semibold text-gray-900 mb-2">5. お問い合わせ</h2><p>hello@growl-ai.com</p></div>
        </section>
        <div className="mt-12 border-t border-gray-100 pt-6">
          <a href="/" className="text-sm text-indigo-500">Growlに戻る</a>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-white px-6 py-16 max-w-2xl mx-auto">
      <div className="flex justify-end mb-4"><LangToggle /></div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: June 3, 2026</p>
      <section className="space-y-8 text-gray-700 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance</h2>
          <p>By using Growl, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Service Description</h2>
          <p>Growl provides AI-generated marketing suggestions and Meta ad creation assistance for small businesses. The service is provided "as is" without warranties of any kind.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Meta Ads Feature</h2>
          <p>When using the Meta Ads feature, you authorize Growl to create ad campaigns in your Meta Ads account on your behalf. You are solely responsible for all ad spend charged to your Meta account. Growl creates ads in PAUSED state — you must activate them manually in Meta Ads Manager. You are responsible for ensuring your ads comply with Meta's Advertising Policies.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. User Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must have a valid Meta Business account to use the Meta Ads feature</li>
            <li>You are responsible for the accuracy of your business information</li>
            <li>You agree not to use Growl for illegal, harmful, or misleading advertising</li>
            <li>You are responsible for reviewing AI-generated content before publishing</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Limitation of Liability</h2>
          <p>Growl is not liable for any ad spend, campaign performance, or business outcomes resulting from use of our service. AI-generated content may contain errors — always review before use.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Termination</h2>
          <p>You may stop using Growl at any time. We may suspend access for violations of these terms.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Contact</h2>
          <p>hello@growl-ai.com</p>
        </div>
      </section>
      <div className="mt-12 border-t border-gray-100 pt-6">
        <a href="/" className="text-sm text-indigo-500">Back to Growl</a>
      </div>
    </main>
  );
}
