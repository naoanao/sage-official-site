import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { trackEvent } from '../utils/tracking';

// ── メール収集フォームコンポーネント ────────────────────────────────
const EmailCapture = ({ source = 'blog' }) => {
    const [email, setEmail] = React.useState('');
    const [status, setStatus] = React.useState('idle'); // idle | loading | success | error
    const [message, setMessage] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || status === 'loading') return;

        setStatus('loading');
        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), source }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setStatus('success');
                setMessage('');
                // ローカルにメール保存（tracking.jsで使用）
                localStorage.setItem('sage_subscriber_email', email.trim().toLowerCase());
                trackEvent('blog_subscribe', { source, email });
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong. Try again.');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div className="mt-12 p-8 rounded-2xl border border-violet-500/30"
                style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.15), rgba(219,39,119,0.10))' }}>
                <div className="text-center">
                    <div className="text-4xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold mb-2">You're in.</h3>
                    <p className="text-gray-300">
                        Check your inbox — your AI automation starter guide is on its way.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-12 p-8 rounded-2xl border border-violet-500/20"
            style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.10), rgba(0,0,0,0.5))' }}>
            {/* Badge */}
            <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Free Insider Access</span>
            </div>

            <h3 className="text-2xl font-bold mb-2 text-white">
                Get the AI Automation Playbook — Free
            </h3>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Join 1,000+ builders getting weekly AI automation strategies that generate real passive income.
                No spam. Unsubscribe anytime.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={status === 'loading'}
                    className="flex-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
                    style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(139,92,246,0.3)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.7)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.3)'}
                />
                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all"
                    style={{
                        background: status === 'loading'
                            ? 'rgba(109,40,217,0.5)'
                            : 'linear-gradient(135deg, #7c3aed, #db2777)',
                        cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {status === 'loading' ? 'Sending...' : 'Get Free Access →'}
                </button>
            </form>

            {status === 'error' && (
                <p className="mt-3 text-red-400 text-xs">{message}</p>
            )}

            <p className="mt-3 text-gray-600 text-xs">
                🔒 No spam. Your email is safe. Unsubscribe in one click.
            </p>
        </div>
    );
};

// ── メインコンポーネント ─────────────────────────────────────────────
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
                    // ブログ訪問をトラッキング
                    trackEvent('blog_visit', { slug, title: frontmatter.title });
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
                <div className="text-2xl">Loading...</div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
                    <a href="/blog" className="text-violet-400 hover:underline">← Back to Blog</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center border-b border-white/10"
                style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', background: 'rgba(0,0,0,0.85)' }}>
                <Link to="/" className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    SAGE 3.0
                </Link>
                <div className="flex gap-5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                    <Link to="/blog" className="hover:text-white transition-colors font-semibold text-white">Blog</Link>
                    <Link to="/sales" className="hover:text-white transition-colors" style={{ color: '#a78bfa' }}>Get Sage →</Link>
                </div>
            </nav>

            {/* spacer for fixed nav */}
            <div className="h-16" />

            {/* Article */}
            <article className="max-w-4xl mx-auto px-4 py-12">
                {/* Meta */}
                <div className="mb-8">
                    <time className="text-gray-400 text-sm">
                        {new Date(post.frontmatter.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </time>
                    <h1 className="text-5xl md:text-6xl font-black mt-4 mb-6 leading-tight">
                        {post.frontmatter.title}
                    </h1>
                    <p className="text-xl text-gray-300 leading-relaxed">
                        {post.frontmatter.excerpt}
                    </p>
                </div>

                {/* Content */}
                <div
                    className="prose prose-invert prose-lg max-w-none
                        prose-headings:font-bold prose-headings:text-white
                        prose-h2:text-4xl prose-h2:mt-12 prose-h2:mb-6
                        prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6
                        prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-white prose-strong:font-bold
                        prose-ul:list-disc prose-ul:pl-6 prose-ul:my-6
                        prose-li:text-gray-300 prose-li:mb-2
                        prose-code:text-violet-400 prose-code:bg-white/5 prose-code:px-2 prose-code:py-1 prose-code:rounded"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* ── メール収集フォーム（記事中断後・購入前） ────────────────── */}
                <EmailCapture source={`blog_${slug}`} />

                {/* ── CTA Footer（Gumroad直リンク） ────────────────────────── */}
                <div className="mt-8 p-8 rounded-2xl bg-gradient-to-br from-violet-900/20 to-pink-900/20 border border-violet-500/20">
                    <h3 className="text-3xl font-bold mb-4">Ready to Build Your AI Clone?</h3>
                    <p className="text-gray-300 mb-6">
                        Get the complete Sage 3.0 Developer Blueprint — the exact system behind this blog,
                        running 24/7 without you. One-time purchase, yours forever.
                    </p>
                    <a
                        href="https://naofumi3.gumroad.com/l/apvbzh?utm_source=blog&utm_medium=article_cta&utm_campaign=developer_blueprint"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent('payment_click', { source: `blog_${slug}`, product: 'developer_blueprint' })}
                        className="inline-block px-8 py-4 rounded-full text-white font-bold transition-all"
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                            boxShadow: '0 0 0 0 rgba(124,58,237,0)',
                            transition: 'box-shadow 0.3s ease',
                        }}
                        onMouseEnter={e => e.target.style.boxShadow = '0 8px 32px rgba(124,58,237,0.5)'}
                        onMouseLeave={e => e.target.style.boxShadow = '0 0 0 0 rgba(124,58,237,0)'}
                    >
                        Get Sage 3.0 Developer Blueprint — $49 →
                    </a>
                </div>

                {/* Back to blog */}
                <div className="mt-12 text-center">
                    <Link to="/blog" className="text-gray-500 hover:text-violet-400 transition-colors text-sm">
                        ← Back to all posts
                    </Link>
                </div>
            </article>
        </div>
    );
};

export default BlogPost;
