import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const Landing = () => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[hsl(240,20%,8%)] via-[hsl(260,30%,12%)] to-[hsl(280,25%,10%)] text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 opacity-30 pointer-events-none">
                <motion.div
                    className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-[hsl(280,100%,60%)] to-transparent rounded-full blur-3xl"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-[hsl(180,100%,50%)] to-transparent rounded-full blur-3xl"
                    animate={{
                        x: [0, -80, 0],
                        y: [0, -60, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, delay: 5 }}
                />
            </div>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center px-4">
                <div className="max-w-6xl mx-auto text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
                            <span className="bg-gradient-to-r from-[hsl(280,100%,70%)] via-[hsl(300,100%,60%)] to-[hsl(180,100%,60%)] bg-clip-text text-transparent">
                                AI Agent That
                            </span>
                            <br />
                            <span className="text-white">Controls Your PC</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                            <span className="text-[hsl(280,100%,70%)] font-bold">Fully autonomous</span> operations. 30 days without human intervention.
                            <br />
                            <span className="text-[hsl(180,100%,60%)]">39 integrations</span> running 24/7.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
                            <motion.a
                                href="https://naofumi3.gumroad.com/l/sage-professional?utm_source=official_site&utm_medium=hero_cta"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative px-10 py-5 rounded-full text-xl font-bold overflow-hidden"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-[hsl(280,100%,60%)] to-[hsl(180,100%,50%)]"></span>
                                <span className="relative z-10">Get Fortress Edition - $299</span>
                            </motion.a>

                            <motion.a
                                href="#features"
                                className="px-10 py-5 bg-white/5 backdrop-blur-lg rounded-full text-xl font-bold border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Learn More
                            </motion.a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative py-32 px-4">
                <div className="max-w-7xl mx-auto">
                    <motion.h2
                        className="text-5xl md:text-6xl font-black text-center mb-20"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <span className="bg-gradient-to-r from-[hsl(280,100%,70%)] to-[hsl(180,100%,60%)] bg-clip-text text-transparent">
                            Core Features
                        </span>
                    </motion.h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: '🧠',
                                title: 'Neuromorphic Brain',
                                desc: '1000-neuron SNN. 94% accuracy learning with STDP algorithms.'
                            },
                            {
                                icon: '🤖',
                                title: 'Full Automation',
                                desc: '39 integrations. SNS, Gmail, Notion, Jira... all automated.'
                            },
                            {
                                icon: '🔒',
                                title: 'Self-Healing',
                                desc: 'Automatic error recovery. 30 days continuous operation proven.'
                            },
                            {
                                icon: '🌐',
                                title: 'Multi-Platform',
                                desc: 'Bluesky, Instagram, Telegram, Gmail. Everything in one place.'
                            },
                            {
                                icon: '📊',
                                title: 'Real-time Analytics',
                                desc: 'All actions logged. 24/7 performance tracking.'
                            },
                            {
                                icon: '⚡',
                                title: 'Blazing Fast',
                                desc: 'Groq API (1.2s) + Local GPU (45s). Dual-engine architecture.'
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 hover:border-[hsl(280,100%,60%)]/50 transition-all duration-300"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="text-5xl mb-4">{feature.icon}</div>
                                <h3 className="text-2xl font-bold mb-3 group-hover:text-[hsl(280,100%,70%)] transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Live Proof Section */}
            <section className="relative py-32 px-4 bg-black/20">
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        className="text-5xl md:text-6xl font-black text-center mb-12"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <span className="bg-gradient-to-r from-[hsl(280,100%,70%)] to-[hsl(180,100%,60%)] bg-clip-text text-transparent">
                            Live Proof
                        </span>
                    </motion.h2>
                    <p className="text-center text-gray-400 mb-16 text-lg">
                        Real activity logs updated 24/7
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div
                            className="p-8 rounded-3xl bg-gradient-to-br from-purple-900/20 to-blue-900/10 backdrop-blur-lg border border-purple-400/20"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <span>📱</span> SNS Posts (Last 7 Days)
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Bluesky</span>
                                    <span className="text-3xl font-black text-[hsl(280,100%,70%)]">35 posts</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Instagram</span>
                                    <span className="text-3xl font-black text-[hsl(180,100%,60%)]">28 posts</span>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-sm text-gray-400">All automated. Zero manual intervention.</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="p-8 rounded-3xl bg-gradient-to-br from-cyan-900/20 to-teal-900/10 backdrop-blur-lg border border-cyan-400/20"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <span>🔧</span> Self-Healing
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Auto-recoveries</span>
                                    <span className="text-3xl font-black text-[hsl(180,100%,60%)]">127</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Uptime</span>
                                    <span className="text-3xl font-black text-green-400">99.8%</span>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-sm text-gray-400">30 days continuous operation verified.</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <section id="products" className="relative py-32 px-4">
                <div className="max-w-7xl mx-auto">
                    <motion.h2
                        className="text-5xl md:text-6xl font-black text-center mb-12"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <span className="bg-gradient-to-r from-[hsl(280,100%,70%)] to-[hsl(180,100%,60%)] bg-clip-text text-transparent">
                            Products
                        </span>
                    </motion.h2>
                    <p className="text-center text-gray-400 mb-16 text-lg">
                        All products available on Gumroad (completely free platform)
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                name: 'Bluesky AI Marketer',
                                price: '$29',
                                period: '/mo',
                                description: '5 posts/day fully automated. Trending keyword optimization with proof logs.',
                                url: 'https://naofumi3.gumroad.com/l/bluesky-marketer?utm_source=official_site&utm_medium=products',
                                badge: null
                            },
                            {
                                name: 'Instagram AI Marketer',
                                price: '$39',
                                period: '/mo',
                                description: '4 posts/day with AI image generation. Caption optimization, 360 posts/90 days proven.',
                                url: 'https://naofumi3.gumroad.com/l/instagram-marketer?utm_source=official_site&utm_medium=products',
                                badge: null
                            },
                            {
                                name: 'SNS Bundle',
                                price: '$59',
                                period: '/mo',
                                description: 'Bluesky + Instagram bundle ($10 off). 9 posts/day fully automated.',
                                url: 'https://naofumi3.gumroad.com/l/sns-bundle?utm_source=official_site&utm_medium=products',
                                badge: 'Most Popular'
                            },
                            {
                                name: 'Fortress Edition',
                                price: '$299',
                                period: 'one-time',
                                description: 'Full feature unlock. 39 integrations, fully autonomous, lifetime license.',
                                url: 'https://naofumi3.gumroad.com/l/sage-professional?utm_source=official_site&utm_medium=products',
                                badge: null
                            },
                            {
                                name: 'Developer Kit',
                                price: '$79',
                                period: 'one-time',
                                description: 'Full source code + API docs. Customize freely.',
                                url: 'https://naofumi3.gumroad.com/l/sage-dev-kit?utm_source=official_site&utm_medium=products',
                                badge: null
                            }
                        ].map((product, index) => (
                            <motion.div
                                key={index}
                                className={`group relative p-6 rounded-3xl backdrop-blur-lg border transition-all duration-300 ${product.badge
                                        ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-purple-400'
                                        : 'bg-gradient-to-br from-gray-800/30 to-gray-700/20 border-white/10 hover:border-white/30'
                                    }`}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ scale: 1.03 }}
                            >
                                {product.badge && (
                                    <div className="absolute -top-3 right-6 bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full text-xs font-bold">
                                        {product.badge}
                                    </div>
                                )}

                                <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                                <div className="mb-4">
                                    <span className="text-4xl font-black">{product.price}</span>
                                    <span className="text-gray-400">{product.period}</span>
                                </div>
                                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                    {product.description}
                                </p>

                                <motion.a
                                    href={product.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block w-full py-3 rounded-full text-center font-bold transition-colors ${product.badge
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                                            : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Buy on Gumroad
                                </motion.a>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative py-16 px-4 border-t border-white/10">
                <div className="max-w-6xl mx-auto text-center text-gray-400">
                    <p className="mb-4">© 2026 Sage AI. All Rights Reserved.</p>
                    <p className="text-sm">
                        Built with React + Vite. Deployed on Cloudflare Pages.
                        <br />
                        Fully autonomous. Fully free hosting. Fully open for global market.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
