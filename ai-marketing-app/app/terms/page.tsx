export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 max-w-2xl mx-auto">
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
          <p>kanagawatable@gmail.com</p>
        </div>
      </section>
      <div className="mt-12 border-t border-gray-100 pt-6">
        <a href="/" className="text-sm text-indigo-500">Back to Growl</a>
      </div>
    </main>
  );
}
