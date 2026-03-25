import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ThankYou = () => {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
            <div className="max-w-3xl text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Success Icon */}
                    <div className="mb-8">
                        <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-6xl md:text-7xl font-black mb-6">
                        <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                            Thank You!
                        </span>
                    </h1>

                    {/* Message */}
                    <p className="text-2xl md:text-3xl text-gray-200 mb-4 font-bold">
                        Your subscription is live! 🎉
                    </p>
                    <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                        A welcome email is on its way with your{' '}
                        <span className="text-white font-semibold">access details</span> •
                        <span className="text-white font-semibold"> setup guide</span> •
                        <span className="text-white font-semibold"> receipt</span>
                    </p>

                    {/* Info Box */}
                    <div className="mb-12 p-8 rounded-3xl bg-gradient-to-br from-violet-900/30 to-pink-900/30 border border-violet-500/20">
                        <h3 className="text-2xl font-bold mb-4">What happens next</h3>
                        <div className="text-left space-y-3 text-gray-300">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📧</span>
                                <div>
                                    <strong className="text-white">Check your email</strong> — Welcome email with access info arrives within 5 minutes
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🤖</span>
                                <div>
                                    <strong className="text-white">Sage AI is running</strong> — Autonomous social posting and content generation are already live
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📊</span>
                                <div>
                                    <strong className="text-white">Open your dashboard</strong> — Chat with Sage AI, generate content, and monitor your automations in real time
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">💳</span>
                                <div>
                                    <strong className="text-white">Auto-renews monthly</strong> — Cancel anytime from your Stripe billing portal
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                        <Link
                            to="/dashboard"
                            className="px-10 py-5 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full text-white text-xl font-bold hover:shadow-lg hover:shadow-violet-500/50 transition-all"
                        >
                            Open Sage AI →
                        </Link>
                        <a
                            href="/welcome-guide.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-10 py-5 bg-white/5 border-2 border-emerald-500/40 rounded-full text-emerald-300 text-xl font-bold hover:bg-emerald-500/10 hover:border-emerald-400/60 transition-all"
                        >
                            📖 Getting Started Guide
                        </a>
                        <Link
                            to="/blog"
                            className="px-10 py-5 bg-white/5 border-2 border-white/20 rounded-full text-white text-xl font-bold hover:bg-white/10 hover:border-white/40 transition-all"
                        >
                            Read the Blog
                        </Link>
                    </div>

                    {/* Billing portal + Support */}
                    <div className="mt-12 flex flex-col items-center gap-3">
                        <a
                            href="/api/customer-portal"
                            className="text-sm text-gray-500 hover:text-violet-400 transition-colors"
                        >
                            🔧 Manage or cancel your subscription
                        </a>
                        <p className="text-sm text-gray-600">
                            Need help?{' '}
                            <a href="mailto:kanagawatable@gmail.com" className="text-violet-400 hover:underline">
                                kanagawatable@gmail.com
                            </a>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ThankYou;
