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
                <p className="text-slate-500 text-sm font-mono mb-16">Last updated: March 2026</p>

                <div className="space-y-12 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Digital Products</h2>
                        <p className="text-sm">All products are digital downloads. Refunds are handled through Gumroad's 30-day money-back guarantee — one-click, no questions asked.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Usage</h2>
                        <p className="text-sm">Products are for personal use. Resale or redistribution without written permission is prohibited.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Platform Availability</h2>
                        <p className="text-sm">Sage is currently Windows-only. Mac and Linux support is on the roadmap. No refund is issued for platform incompatibility — please confirm compatibility before purchasing.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mb-4">Contact</h2>
                        <p className="text-sm"><a href="mailto:naofumi0930@gmail.com" className="text-blue-400 hover:text-blue-300">naofumi0930@gmail.com</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
}
