import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Blog = () => {
    // In production, this would fetch from API or server-side
    // For now, hardcoded example posts
    const posts = [
        {
            slug: 'automate-business-with-ai',
            title: 'How to Automate Your Entire Business with AI: Complete Guide',
            excerpt: 'Discover how Sage AI can revolutionize your workflow by automating social media, email, content creation, and more—completely hands-free.',
            date: '2026-02-06',
            keywords: ['AI automation', 'business automation', 'AI agents'],
            readTime: '8 min read'
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="border-b border-white/10 py-6">
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <Link to="/" className="text-2xl font-black bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                        Sage AI
                    </Link>
                    <nav className="flex gap-6">
                        <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
                        <Link to="/blog" className="text-white font-bold">Blog</Link>
                        <a href="https://naofumi3.gumroad.com/l/sage-professional" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors">
                            Get Sage →
                        </a>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-7xl font-black mb-6"
                    >
                        <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                            AI Automation Blog
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-300 max-w-3xl mx-auto"
                    >
                        Learn how to automate your business with AI agents, autonomous systems, and cutting-edge automation strategies.
                    </motion.p>
                </div>
            </section>

            {/* Posts Grid */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post, index) => (
                            <motion.article
                                key={post.slug}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group"
                            >
                                <Link
                                    to={`/blog/${post.slug}`}
                                    className="block p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-violet-500/50 hover:bg-white/10 transition-all duration-300"
                                >
                                    {/* Meta */}
                                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                                        <time>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                                        <span>•</span>
                                        <span>{post.readTime}</span>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-2xl font-bold mb-4 group-hover:text-violet-400 transition-colors leading-tight">
                                        {post.title}
                                    </h2>

                                    {/* Excerpt */}
                                    <p className="text-gray-300 mb-6 leading-relaxed">
                                        {post.excerpt}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2">
                                        {post.keywords.slice(0, 3).map((keyword, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 text-xs rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20"
                                            >
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Read More */}
                                    <div className="mt-6 text-violet-400 font-bold group-hover:text-pink-400 transition-colors">
                                        Read More →
                                    </div>
                                </Link>
                            </motion.article>
                        ))}
                    </div>

                    {/* Empty State (when we have no posts yet) */}
                    {posts.length === 0 && (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-2xl font-bold mb-2">No posts yet</h3>
                            <p className="text-gray-400">Check back soon for AI automation insights!</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-violet-900/30 to-pink-900/30 border border-violet-500/20">
                    <h2 className="text-4xl font-black mb-4">
                        Ready to Automate Everything?
                    </h2>
                    <p className="text-xl text-gray-300 mb-8">
                        Get Sage Fortress Edition and let AI handle your entire business workflow.
                    </p>
                    <a
                        href="https://naofumi3.gumroad.com/l/sage-professional"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-12 py-6 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full text-white text-xl font-bold hover:shadow-lg hover:shadow-violet-500/50 transition-all"
                    >
                        Get Started - $299
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 px-4">
                <div className="max-w-7xl mx-auto text-center text-gray-500">
                    <p className="mb-4">© 2026 Sage AI. Fully Autonomous AI Agent.</p>
                    <p className="text-sm">Built for creators who value automation and precision.</p>
                </div>
            </footer>
        </div>
    );
};

export default Blog;
