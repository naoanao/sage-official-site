import React from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiShoppingCart, FiArrowRight, FiStar, FiZap } from 'react-icons/fi';

const products = [
    {
        id: 1,
        title: 'Sage AI — Full Access (Whop)',
        price: 'Members Only',
        url: 'https://whop.com/segeai/',
        badge: 'RECOMMENDED',
        badgeStyle: { color: '#059669', borderColor: 'rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.08)' },
        accentColor: 'from-emerald-500 to-teal-600',
        desc: 'Full access to Sage AI — autonomous content pipeline, dashboard, and all future updates. Join the Whop community and start building your AI income stream.',
        features: [
            'Sage Cockpit dashboard access',
            'Autonomous SNS + blog pipeline',
            'Gumroad product auto-generation',
            'Community + priority support',
        ],
        buttonLabel: 'Join on Whop',
    },
    {
        id: 2,
        title: '2026 AI Influencer Monetization Express',
        price: '$29.99',
        url: 'https://naofumi3.gumroad.com/l/yvzrfjd',
        badge: 'BESTSELLER',
        badgeStyle: { color: '#D97706', borderColor: 'rgba(217,119,6,0.25)', background: 'rgba(217,119,6,0.08)' },
        accentColor: 'from-blue-500 to-indigo-600',
        desc: 'The complete playbook for building an AI-powered influencer business in 2026. Autonomous content, 24/7 posting, and a proven monetization blueprint.',
        features: [
            'Full AI Influencer Blueprint (PDF + Video)',
            'Autonomous SNS posting templates',
            'Monetization funnel step-by-step',
            'Lifetime access + future updates',
        ],
        buttonLabel: 'Buy on Gumroad',
    },
];

const Shop = () => {
    return (
        <div className="min-h-screen mesh-bg noise font-sans overflow-x-hidden" style={{ color: 'var(--c-text)' }}>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center"
                style={{
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    background: 'rgba(244, 248, 255, 0.88)',
                    borderBottom: '1px solid var(--c-border)',
                }}>
                <div className="text-xl font-bold tracking-tighter flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-blue)' }}></span>
                    SAGE 3.0
                </div>
                <div className="flex gap-4 sm:gap-6 text-sm font-medium flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--c-muted)' }}>
                    <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
                    <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
                    <Link to="/shop" className="font-bold transition-colors" style={{ color: 'var(--c-blue)' }}>Shop</Link>
                    <a href="https://bsky.app/profile/naofumi.bsky.social" target="_blank" rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors">Bluesky</a>
                    <a href="https://www.instagram.com/sege.ai/" target="_blank" rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors">Instagram</a>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-40 pb-20 px-4 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6"
                        style={{
                            background: 'var(--c-raised)',
                            border: '1px solid var(--c-border)',
                            color: 'var(--c-subtle)',
                        }}>
                        <FiShoppingCart size={12} />
                        SAGE STORE
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
                        <span style={{ color: 'var(--c-text)' }}>Ship Your{' '}</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #0284C7 0%, #1A56DB 50%, #1E40AF 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            Empire.
                        </span>
                    </h1>
                    <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--c-muted)' }}>
                        Blueprints, templates, and systems built by Sage. Proven. Autonomous. Ready to deploy.
                    </p>
                </Motion.div>
            </section>

            {/* Product Grid */}
            <section className="pb-32 px-4">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {products.map((product, i) => (
                        <Motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative group p-8 rounded-2xl transition-all overflow-hidden"
                            style={{
                                background: 'var(--c-surface)',
                                border: '1px solid var(--c-border)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-hv)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
                        >
                            {/* Top accent line */}
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${product.accentColor}`}></div>

                            {/* Badge */}
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono mb-5"
                                style={product.badgeStyle}>
                                <FiStar size={10} />
                                {product.badge}
                            </div>

                            {/* Title & Price */}
                            <h2 className="text-xl font-bold mb-2 leading-snug" style={{ color: 'var(--c-blue)' }}>
                                {product.title}
                            </h2>
                            <div className="text-3xl font-black mb-4" style={{ color: 'var(--c-text)' }}>
                                {product.price}
                            </div>

                            {/* Description */}
                            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--c-muted)' }}>
                                {product.desc}
                            </p>

                            {/* Features */}
                            <ul className="space-y-2 mb-8">
                                {product.features.map((f, fi) => (
                                    <li key={fi} className="flex items-start gap-2 text-sm" style={{ color: 'var(--c-text)' }}>
                                        <span className="mt-0.5 flex-shrink-0" style={{ color: '#059669' }}>✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Motion.a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold text-sm transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, #1A56DB, #0284C7)',
                                    boxShadow: '0 4px 16px rgba(26,86,219,0.25)',
                                }}
                            >
                                <FiZap size={16} />
                                {product.buttonLabel}
                                <FiArrowRight size={16} />
                            </Motion.a>
                        </Motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 px-6" style={{ borderTop: '1px solid var(--c-border)' }}>
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 text-xs font-mono" style={{ color: 'var(--c-subtle)' }}>
                        <a href="/privacy"
                            className="hover:text-blue-600 transition-colors">Privacy Policy</a>
                        <a href="/terms"
                            className="hover:text-blue-600 transition-colors">Terms of Service</a>
                        <a href="/contact"
                            className="hover:text-blue-600 transition-colors">Contact</a>
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'var(--c-subtle)' }}>
                        © 2026 SAGE AI | Autonomous Architect Protocol
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Shop;
