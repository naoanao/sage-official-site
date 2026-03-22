import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
        <div className="min-h-screen mesh-bg noise font-sans" style={{ color: 'var(--c-text)' }}>
            {/* Header */}
            <header className="py-6" style={{ borderBottom: '1px solid var(--c-border)' }}>
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <Link to="/" className="text-2xl font-black bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
                        Sage AI
                    </Link>
                    <nav className="flex gap-6 text-sm">
                        <Link to="/" className="transition-colors hover:text-blue-600" style={{ color: 'var(--c-muted)' }}>Home</Link>
                        <Link to="/blog" className="font-bold" style={{ color: 'var(--c-blue)' }}>Blog</Link>
                        <a href="https://naofumi3.gumroad.com/l/sage-professional" target="_blank" rel="noopener noreferrer"
                            className="transition-colors hover:text-blue-700" style={{ color: 'var(--c-blue)' }}>
                            Get Sage →
                        </a>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-7xl font-black mb-6"
                        style={{
                            background: 'linear-gradient(135deg, #0284C7 0%, #1A56DB 50%, #1E40AF 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        AI Automation Blog
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        className="text-xl max-w-3xl mx-auto"
                        style={{ color: 'var(--c-muted)' }}
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
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ delay: Math.min(index, 5) * 0.05, duration: 0.3 }}
                                className="group"
                            >
                                <Link
                                    to={`/blog/${post.slug}`}
                                    className="block p-8 rounded-3xl transition-all duration-300"
                                    style={{
                                        background: 'var(--c-surface)',
                                        border: '1px solid var(--c-border)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-hv)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
                                >
                                    {/* Meta */}
                                    <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: 'var(--c-subtle)' }}>
                                        <time>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                                        <span>•</span>
                                        <span>{post.readTime}</span>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-2xl font-bold mb-4 leading-tight transition-colors duration-200 group-hover:text-blue-600"
                                        style={{ color: 'var(--c-text)' }}>
                                        {post.title}
                                    </h2>

                                    {/* Excerpt */}
                                    <p className="mb-6 leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                                        {post.excerpt}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2">
                                        {post.keywords.slice(0, 3).map((keyword, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 text-xs rounded-full"
                                                style={{
                                                    background: 'rgba(26,86,219,0.08)',
                                                    color: 'var(--c-blue)',
                                                    border: '1px solid rgba(26,86,219,0.18)',
                                                }}
                                            >
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Read More */}
                                    <div className="mt-6 font-bold transition-colors duration-200 group-hover:text-blue-700"
                                        style={{ color: 'var(--c-blue)' }}>
                                        Read More →
                                    </div>
                                </Link>
                            </motion.article>
                        ))}
                    </div>

                    {/* Empty State */}
                    {posts.length === 0 && (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--c-text)' }}>No posts yet</h3>
                            <p style={{ color: 'var(--c-muted)' }}>Check back soon for AI automation insights!</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(26,86,219,0.06) 0%, rgba(2,132,199,0.06) 100%)',
                        border: '1px solid rgba(26,86,219,0.15)',
                    }}>
                    <h2 className="text-4xl font-black mb-4"
                        style={{
                            background: 'linear-gradient(135deg, #0284C7 0%, #1A56DB 50%, #1E40AF 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                        Ready to Automate Everything?
                    </h2>
                    <p className="text-xl mb-8" style={{ color: 'var(--c-muted)' }}>
                        Get Sage Fortress Edition and let AI handle your entire business workflow.
                    </p>
                    <a
                        href={addUTM(STRIPE_LINKS.fortress, 'blog', 'cta_section')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-12 py-6 rounded-full text-white text-xl font-bold transition-all hover:shadow-xl"
                        style={{
                            background: 'linear-gradient(135deg, #1A56DB, #0284C7)',
                            boxShadow: '0 4px 20px rgba(26,86,219,0.25)',
                        }}
                    >
                        Get Started - $299
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4" style={{ borderTop: '1px solid var(--c-border)' }}>
                <div className="max-w-7xl mx-auto text-center" style={{ color: 'var(--c-subtle)' }}>
                    <p className="mb-4">© 2026 Sage AI. Fully Autonomous AI Agent.</p>
                    <p className="text-sm">Built for creators who value automation and precision.</p>
                </div>
            </footer>
        </div>
    );
};

export default Blog;
