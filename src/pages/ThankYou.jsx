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
                        Your order is confirmed 🎉
                    </p>
                    <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                        Check your email for:<br />
                        <span className="text-white font-semibold">Download instructions</span> •
                        <span className="text-white font-semibold"> Setup guide</span> •
                        <span className="text-white font-semibold"> Order receipt</span>
                    </p>

                    {/* Info Box */}
                    <div className="mb-12 p-8 rounded-3xl bg-gradient-to-br from-violet-900/30 to-pink-900/30 border border-violet-500/20">
                        <h3 className="text-2xl font-bold mb-4">What's Next?</h3>
                        <div className="text-left space-y-3 text-gray-300">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📧</span>
                                <div>
                                    <strong className="text-white">Check your email</strong> - Download link sent within 5 minutes
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📦</span>
                                <div>
                                    <strong className="text-white">Extract the ZIP file</strong> - Follow the included README.md
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🚀</span>
                                <div>
                                    <strong className="text-white">Run setup</strong> - Takes 5 minutes, fully guided
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/"
                            className="px-10 py-5 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full text-white text-xl font-bold hover:shadow-lg hover:shadow-violet-500/50 transition-all"
                        >
                            Back to Home
                        </Link>
                        <Link
                            to="/blog"
                            className="px-10 py-5 bg-white/5 border-2 border-white/20 rounded-full text-white text-xl font-bold hover:bg-white/10 hover:border-white/40 transition-all"
                        >
                            Read Blog
                        </Link>
                    </div>

                    {/* Support */}
                    <p className="mt-12 text-gray-500">
                        Need help? Email us at <a href="mailto:support@sage-ai.com" className="text-violet-400 hover:underline">support@sage-ai.com</a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default ThankYou;
