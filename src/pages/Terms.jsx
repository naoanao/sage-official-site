import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-2xl mx-auto px-6 py-24">
                <Link to="/" className="text-xs font-mono text-slate-500 hover:text-white transition-colors mb-12 block">
                    ← Back to Sage
                </Link>
                <h1 className="text-4xl font-black mb-4">Terms of Service</h1>
                <p className="text-slate-500 text-sm font-mono mb-16">Last updated: April 2026</p>

                <div className="space-y-12 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Service Description</h2>
                        <p className="text-sm">Sage AI is a cloud-based SaaS platform that automates content generation and social media publishing. The service runs on Cloudflare's global network and is accessible via any web browser — no local installation required.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Subscriptions & Billing</h2>
                        <p className="text-sm">Subscriptions are billed monthly via Stripe. You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Refund Policy</h2>
                        <p className="text-sm">We offer a 30-day money-back guarantee. To request a refund, contact us at <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}`} className="text-blue-400 hover:text-blue-300">{import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}</a> within 30 days of your initial purchase. Refunds are processed through Stripe and typically appear within 5–10 business days.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Usage</h2>
                        <p className="text-sm">Your subscription is for personal or single-business use. Resale, redistribution, or white-labeling without written permission is prohibited. Enterprise plan holders may request white-label rights separately.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Service Availability</h2>
                        <p className="text-sm">We aim for maximum uptime but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance where possible. No refund is issued for brief outages.</p>
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
