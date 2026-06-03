import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-2xl mx-auto px-6 py-24">
                <Link to="/" className="text-xs font-mono text-slate-500 hover:text-white transition-colors mb-12 block">
                    ← Back to Sage
                </Link>
                <h1 className="text-4xl font-black mb-4">Privacy Policy</h1>
                <p className="text-slate-500 text-sm font-mono mb-16">Last updated: April 2026</p>

                <div className="space-y-12 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">What we collect</h2>
                        <p className="text-sm">When you subscribe, we store your email address and subscription status in a Cloudflare D1 database solely to verify your access. We do not collect names, addresses, or payment details — those are handled entirely by Stripe.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">How we use your data</h2>
                        <p className="text-sm">Your email is used only to verify your active subscription when you log in to the dashboard. We do not sell, share, or use it for marketing without your consent.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Cookies & Tracking</h2>
                        <p className="text-sm">This site uses no tracking cookies and no third-party analytics. We store minimal data in your browser's localStorage (subscription status, UI preferences) to improve your experience.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Third-party services</h2>
                        <ul className="text-sm space-y-2 list-disc list-inside">
                            <li><strong className="text-white">Stripe</strong> — payment processing. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Stripe's Privacy Policy</a>.</li>
                            <li><strong className="text-white">Cloudflare</strong> — hosting, edge functions, and database. See <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Cloudflare's Privacy Policy</a>.</li>
                            <li><strong className="text-white">Groq / Google Gemini</strong> — AI content generation (prompts only, no personal data sent).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Data deletion</h2>
                        <p className="text-sm">To request deletion of your email and subscription record, contact us at <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}`} className="text-blue-400 hover:text-blue-300">{import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}</a>. We will process your request within 30 days.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Contact</h2>
                        <p className="text-sm"><a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}`} className="text-blue-400 hover:text-blue-300">{import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
}
