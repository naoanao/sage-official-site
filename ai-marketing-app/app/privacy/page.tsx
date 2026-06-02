export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 max-w-2xl mx-auto">
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
          <p>Use the "Start over" button to clear your session. To delete server data, email: kanagawatable@gmail.com</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact</h2>
          <p>kanagawatable@gmail.com</p>
        </div>
      </section>
      <div className="mt-12 border-t border-gray-100 pt-6">
        <a href="/" className="text-sm text-indigo-500">Back to Growl</a>
      </div>
    </main>
  );
}
