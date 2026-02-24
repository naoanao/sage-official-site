import React from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiShoppingCart, FiArrowRight, FiStar, FiZap } from 'react-icons/fi';
import SpaceBackground from '../components/SpaceBackground';

const products = [
    {
        id: 1,
        title: '2026 AI Influencer Monetization Express',
        price: '$29.99',
        url: 'https://naofumi3.gumroad.com/l/yvzrfjd',
        badge: 'BESTSELLER',
        badgeColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
        accentColor: 'from-blue-500 to-purple-600',
        glowColor: 'rgba(37,99,235,0.3)',
        desc: 'The complete playbook for building an AI-powered influencer business in 2026. Autonomous content, 24/7 posting, and a proven monetization blueprint.',
        features: [
            'Full AI Influencer Blueprint (PDF + Video)',
            'Autonomous SNS posting templates',
            'Monetization funnel step-by-step',
            'Lifetime access + future updates',
        ],
    },
];

const Shop = () => {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <SpaceBackground />

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-black/50">
                <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    SAGE 3.0
                </div>
                <div className="flex gap-4 sm:gap-6 text-sm font-medium text-slate-400 flex-shrink-0 whitespace-nowrap">
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                    <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
                    <Link to="/shop" className="text-white transition-colors">Shop</Link>
                    <a href="https://bsky.app/profile/naofumi.bsky.social" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Bluesky</a>
                    <a href="https://www.instagram.com/sege.ai/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-40 pb-20 px-4 z-10 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300 mb-6">
                        <FiShoppingCart size={12} />
                        SAGE STORE
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
                        Ship Your{' '}
                        <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Empire.
                        </span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto">
                        Blueprints, templates, and systems built by Sage. Proven. Autonomous. Ready to deploy.
                    </p>
                </Motion.div>
            </section>

            {/* Product Grid */}
            <section className="relative z-10 pb-32 px-4">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {products.map((product, i) => (
                        <Motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative group p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all overflow-hidden"
                        >
                            {/* Top accent line */}
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${product.accentColor}`}></div>

                            {/* Badge */}
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono mb-5 ${product.badgeColor}`}>
                                <FiStar size={10} />
                                {product.badge}
                            </div>

                            {/* Title & Price */}
                            <h2 className="text-xl font-bold text-white mb-2 leading-snug">
                                {product.title}
                            </h2>
                            <div className="text-3xl font-black text-white mb-4">
                                {product.price}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">
                                {product.desc}
                            </p>

                            {/* Features */}
                            <ul className="space-y-2 mb-8">
                                {product.features.map((f, fi) => (
                                    <li key={fi} className="flex items-start gap-2 text-sm text-slate-300">
                                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
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
                                className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all`}
                                style={{ boxShadow: `0 0 30px ${product.glowColor}` }}
                            >
                                <FiZap size={16} />
                                Buy on Gumroad
                                <FiArrowRight size={16} />
                            </Motion.a>
                        </Motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-10 px-6 border-t border-white/5 bg-black">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 text-xs font-mono text-slate-500">
                        <a href="https://onelovepeople.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="https://onelovepeople.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="mailto:sage@onelovepeople.com" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    <p className="text-slate-600 text-xs font-mono">
                        © 2026 SAGE AI | Autonomous Architect Protocol
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Shop;
