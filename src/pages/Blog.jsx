import React from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import SpaceBackground from '../components/SpaceBackground';
import { STRIPE_LINKS, addUTM } from '../config/stripe';

// Dynamically load all MDX files from src/blog/posts/
const postModules = import.meta.glob('../blog/posts/*.mdx', { eager: true, query: '?raw', import: 'default' });

const loadedPosts = Object.entries(postModules).map(([path, raw]) => {
    const parts = raw.split('---');
    let fm = {};
    if (parts.length >= 3) {
        parts[1].split('\n').forEach(line => {
            const [key, ...vals] = line.split(':');
            if (key && vals.length > 0) {
                fm[key.trim()] = vals.join(':').trim().replace(/^["']|["']$/g, '');
            }
        });
    }
    const filename = path.split('/').pop().replace('.mdx', '');
    const keywords = fm.keywords
        ? fm.keywords.split(',').map(k => k.trim())
        : [];
    return {
        slug: fm.slug || filename,
        title: fm.title || filename,
        excerpt: fm.excerpt || '',
        date: fm.date || '',
        keywords,
        readTime: '8 min read',
    };
}).sort((a, b) => new Date(b.date) - new Date(a.date));

const Blog = () => {
    const posts = loadedPosts;

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <SpaceBackground />

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-black/50">
                <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    SAGE 3.0
                </Link>
                <div className="flex gap-4 sm:gap-6 text-sm font-medium text-slate-400 flex-shrink-0 whitespace-nowrap">
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                    <Link to="/blog" className="text-white font-bold">Blog</Link>
                    <Link to="/shop" className="hover:text-white transition-colors">Shop</Link>
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
                        📝 SAGE BLOG
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
                        AI Automation{' '}
                        <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Blog
                        </span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto">
                        Learn how to automate your business with AI agents, autonomous systems, and cutting-edge automation strategies.
                    </p>
                </Motion.div>
            </section>

            {/* Posts Grid */}
            <section className="relative z-10 pb-32 px-4">
                <div className="max-w-6xl mx-auto">
                    {posts.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-2xl font-bold mb-2">No posts yet</h3>
                            <p className="text-slate-400">Check back soon for AI automation insights!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map((post, index) => (
                                <Motion.article
                                    key={post.slug}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                    className="group"
                                >
                                    <Link
                                        to={`/blog/${post.slug}`}
                                        className="block h-full p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 overflow-hidden relative"
                                    >
                                        {/* Top accent line on hover */}
                                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        {/* Meta */}
                                        <div className="flex items-center gap-3 mb-4 text-xs text-slate-500 font-mono">
                                            <time>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                                            <span>·</span>
                                            <span>{post.readTime}</span>
                                        </div>

                                        {/* Title */}
                                        <h2 className="text-lg font-bold text-white mb-3 leading-snug group-hover:text-blue-400 transition-colors">
                                            {post.title}
                                        </h2>

                                        {/* Excerpt */}
                                        <p className="text-sm text-slate-400 leading-relaxed mb-5 line-clamp-3">
                                            {post.excerpt}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-5">
                                            {post.keywords.slice(0, 3).map((keyword, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Read More */}
                                        <div className="text-xs font-mono text-slate-500 group-hover:text-blue-400 transition-colors">
                                            Read More →
                                        </div>
                                    </Link>
                                </Motion.article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 pb-24 px-4">
                <div className="max-w-4xl mx-auto p-10 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-3">
                        Ready to Automate Everything?
                    </h2>
                    <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                        Get Sage Fortress Edition and let AI handle your entire business workflow.
                    </p>
                    <a
                        href={addUTM(STRIPE_LINKS.fortress, 'blog', 'cta_section')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                        style={{ boxShadow: '0 0 30px rgba(37,99,235,0.3)' }}
                    >
                        Get Started — $299
                    </a>
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

export default Blog;
