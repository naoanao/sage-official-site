import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { STRIPE_LINKS, addUTM } from '../config/stripe';

const Landing = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [snsStats, setSnsStats] = useState({ total_posts: 31 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        fetch('/api/sns/stats')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data && data.total_posts) setSnsStats(data); })
            .catch(() => { });
    }, []);

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Animated Gradient Background */}
            <div className="fixed inset-0 z-0">
                <motion.div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, 
                            rgba(139, 92, 246, 0.3) 0%, 
                            rgba(59, 130, 246, 0.2) 25%, 
                            rgba(16, 185, 129, 0.1) 50%, 
                            transparent 70%)`
                    }}
                />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
            </div>

            {/* Hero Section */}
            <section className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        {/* Main Heading with Massive Gradient */}
                        <h1 className="text-7xl md:text-9xl font-black mb-8 leading-none">
                            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                                AI AGENT
                            </span>
                            <span className="block text-white mt-4">
                                CONTROLS YOUR
                            </span>
                            <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent mt-4">
                                ENTIRE PC
                            </span>
                        </h1>

                        {/* Stats Bar */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="flex flex-wrap gap-8 justify-center mb-12 text-xl"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-violet-400 text-3xl font-black">30</span>
                                <span className="text-gray-400">DAYS NO HUMAN</span>
                            </div>
                            <div className="w-px h-8 bg-gray-700"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-pink-400 text-3xl font-black">39</span>
                                <span className="text-gray-400">INTEGRATIONS</span>
                            </div>
                            <div className="w-px h-8 bg-gray-700"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-fuchsia-400 text-3xl font-black">{snsStats.total_posts}</span>
                                <span className="text-gray-400">POSTS AUTO-SHIPPED</span>
                            </div>
                            <div className="w-px h-8 bg-gray-700"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-cyan-400 text-3xl font-black">24/7</span>
                                <span className="text-gray-400">AUTONOMOUS</span>
                            </div>
                        </motion.div>

                        {/* CTA Buttons */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                        >
                            <motion.a
                                href={addUTM(STRIPE_LINKS.fortress, 'website', 'hero_cta')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative px-12 py-6 text-2xl font-black rounded-2xl overflow-hidden"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 opacity-0 blur-xl group-hover:opacity-100 transition-opacity duration-500"></div>
                                <span className="relative z-10 flex items-center gap-3">
                                    GET FORTRESS EDITION
                                    <span className="text-yellow-300">$299</span>
                                </span>
                            </motion.a>

                            <motion.a
                                href="/blog"
                                className="px-12 py-6 text-2xl font-black rounded-2xl border-2 border-white/20 backdrop-blur-sm hover:border-white/40 hover:bg-white/5 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                READ BLOG
                            </motion.a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 py-32 px-4">
                <div className="max-w-7xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-6xl md:text-7xl font-black text-center mb-20"
                    >
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            CORE FEATURES
                        </span>
                    </motion.h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: '🧠', title: 'Neuromorphic Brain', desc: '1000-neuron SNN with 94% accuracy STDP learning' },
                            { icon: '🤖', title: 'Full Automation', desc: '39 integrations. SNS, Gmail, Notion, Jira automated' },
                            { icon: '🔒', title: 'Self-Healing', desc: 'Automatic error recovery. 30 days proven uptime' },
                            { icon: '🌐', title: 'Multi-Platform', desc: 'Bluesky, Instagram, Telegram, Gmail in one place' },
                            { icon: '📊', title: 'Real-time Analytics', desc: 'All actions logged. 24/7 performance tracking' },
                            { icon: '⚡', title: 'Blazing Fast', desc: 'Groq API (1.2s) + Local GPU (45s) dual-engine' },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ scale: 1.02, rotateY: 5 }}
                                className="group relative p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-lg hover:border-violet-500/50 transition-all duration-300"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 to-pink-600/0 group-hover:from-violet-600/10 group-hover:to-pink-600/10 rounded-3xl transition-all duration-500"></div>
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">{feature.icon}</div>
                                    <h3 className="text-2xl font-black mb-3 group-hover:text-violet-400 transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <section id="products" className="relative z-10 py-32 px-4 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
                <div className="max-w-7xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-6xl md:text-7xl font-black text-center mb-20"
                    >
                        <span className="bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
                            PRODUCTS
                        </span>
                    </motion.h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { name: 'Bluesky AI Marketer', price: '$29', period: '/mo', link: 'bluesky' },
                            { name: 'Instagram AI Marketer', price: '$39', period: '/mo', link: 'instagram' },
                            { name: 'SNS Bundle', price: '$59', period: '/mo', link: 'bundle', badge: 'POPULAR' },
                            { name: 'Fortress Edition', price: '$299', period: 'once', link: 'fortress', badge: 'BEST VALUE' },
                        ].map((product, i) => (
                            <motion.a
                                key={i}
                                href={addUTM(STRIPE_LINKS[product.link], 'website', 'product_grid')}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ scale: 1.05, y: -10 }}
                                className="group relative p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-lg hover:border-violet-500 transition-all duration-300"
                            >
                                {product.badge && (
                                    <div className="absolute -top-3 -right-3 px-4 py-1 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full text-xs font-black">
                                        {product.badge}
                                    </div>
                                )}
                                <div className="text-4xl font-black mb-2">
                                    <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                                        {product.price}
                                    </span>
                                    <span className="text-lg text-gray-500">{product.period}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4 group-hover:text-violet-400 transition-colors">
                                    {product.name}
                                </h3>
                                <div className="mt-auto pt-4 border-t border-white/10">
                                    <span className="text-violet-400 font-bold group-hover:text-pink-400 transition-colors">
                                        Learn More →
                                    </span>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-4 border-t border-white/10">
                <div className="max-w-7xl mx-auto text-center text-gray-500">
                    <p className="mb-4">© 2026 Sage AI. Fully Autonomous AI Agent.</p>
                    <p className="text-sm">Built for creators who value automation and precision.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
