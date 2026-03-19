import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import SpaceBackground from '../components/SpaceBackground';

const BlogPost = () => {
    const { slug } = useParams();
    const [post, setPost] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const loadPost = async () => {
            try {
                // Dynamically load all MDX files in the posts directory
                const posts = import.meta.glob('../blog/posts/*.mdx', { eager: true, query: '?raw', import: 'default' });

                let rawContent = null;
                let frontmatter = {};
                let content = "";

                // Find the post that matches the current slug
                for (const path in posts) {
                    const raw = posts[path];
                    const parts = raw.split('---');
                    let currentFM = {};

                    if (parts.length >= 3) {
                        const rawFM = parts[1];
                        rawFM.split('\n').forEach(line => {
                            const [key, ...valueParts] = line.split(':');
                            if (key && valueParts.length > 0) {
                                currentFM[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
                            }
                        });
                    }

                    const filename = path.split('/').pop().replace('.mdx', '');
                    if (currentFM.slug === slug || filename === slug || path.includes(slug)) {
                        rawContent = raw;
                        frontmatter = currentFM;
                        content = parts.length >= 3 ? parts.slice(2).join('---') : raw;
                        break;
                    }
                }

                const htmlContent = DOMPurify.sanitize(marked.parse(content));

                if (rawContent) {
                    setPost({ frontmatter, content: htmlContent });
                }
                setLoading(false);
            } catch (error) {
                console.error('Error loading post:', error);
                setLoading(false);
            }
        };

        loadPost();
    }, [slug]);

    React.useEffect(() => {
        if (post) {
            hljs.highlightAll();
        }
    }, [post]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-slate-400 font-mono text-sm animate-pulse">Loading…</div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
                    <Link to="/blog" className="text-blue-400 hover:text-blue-300 transition-colors">← Back to Blog</Link>
                </div>
            </div>
        );
    }

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

            {/* Article */}
            <article className="relative z-10 max-w-4xl mx-auto px-4 pt-32 pb-16">
                {/* Back link */}
                <div className="mb-10">
                    <Link to="/blog" className="text-xs font-mono text-slate-500 hover:text-blue-400 transition-colors">
                        ← Back to Blog
                    </Link>
                </div>

                {/* Meta */}
                <div className="mb-8">
                    <time className="text-xs font-mono text-slate-500">
                        {new Date(post.frontmatter.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </time>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mt-4 mb-6 leading-tight">
                        {post.frontmatter.title}
                    </h1>
                    <p className="text-lg text-slate-400 leading-relaxed">
                        {post.frontmatter.excerpt}
                    </p>
                    <div className="mt-6 h-px bg-gradient-to-r from-blue-500/30 via-indigo-500/30 to-transparent"></div>
                </div>

                {/* Content */}
                <div
                    className="prose prose-invert prose-lg max-w-none
                        prose-headings:font-bold prose-headings:text-white prose-headings:tracking-tight
                        prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                        prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                        prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
                        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-white prose-strong:font-bold
                        prose-ul:list-disc prose-ul:pl-6 prose-ul:my-6
                        prose-li:text-slate-300 prose-li:mb-2
                        prose-code:text-blue-400 prose-code:bg-white/5 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* CTA Footer */}
                <div className="mt-16 p-8 rounded-2xl bg-white/[0.03] border border-white/10">
                    <h3 className="text-2xl font-black tracking-tighter mb-3">Ready to Automate Your Business?</h3>
                    <p className="text-slate-400 mb-6">
                        Get Sage Fortress Edition and start automating everything — no coding required.
                    </p>
                    <a
                        href="https://naofumi3.gumroad.com/l/sage-professional"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm"
                        style={{ boxShadow: '0 0 24px rgba(37,99,235,0.3)' }}
                    >
                        Get Started →
                    </a>
                </div>
            </article>

            {/* Related Products */}
            <aside className="relative z-10 max-w-4xl mx-auto px-4 pb-16">
                <h3 className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-4">Related Products</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { name: 'Bluesky Marketer', price: '$29/mo', url: 'https://naofumi3.gumroad.com/l/bluesky-marketer' },
                        { name: 'Instagram Marketer', price: '$39/mo', url: 'https://naofumi3.gumroad.com/l/instagram-marketer' },
                        { name: 'Fortress Edition', price: '$299', url: 'https://naofumi3.gumroad.com/l/sage-professional' },
                    ].map((product, i) => (
                        <a
                            key={i}
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all group"
                        >
                            <div className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{product.name}</div>
                            <div className="text-blue-400 text-xs font-mono">{product.price}</div>
                        </a>
                    ))}
                </div>
            </aside>

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

export default BlogPost;
