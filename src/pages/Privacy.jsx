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
                <p className="text-slate-500 text-sm font-mono mb-16">Last updated: March 2026</p>

                <div className="space-y-12 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">What we collect</h2>
                        <p className="text-sm">We do not collect personal data. Payments are handled entirely by Gumroad. We have no access to your payment information.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Cookies & Tracking</h2>
                        <p className="text-sm">This site uses no tracking cookies and no third-party analytics.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Third-party services</h2>
                        <p className="text-sm">Purchases and subscriptions are processed by Stripe, Inc. Please review <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Stripe's Privacy Policy</a> for details on how your payment data is handled. AI features are powered by Groq, Inc.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Contact</h2>
                        <p className="text-sm"><a href="mailto:sage@onelovepeople.com" className="text-blue-400 hover:text-blue-300">sage@onelovepeople.com</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
}
