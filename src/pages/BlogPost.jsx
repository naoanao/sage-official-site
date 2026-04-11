import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

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

                {/* CTA Footer */}
                <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-violet-900/20 to-pink-900/20 border border-violet-500/20">
                    <h3 className="text-3xl font-bold mb-4">Ready to Automate Your Business?</h3>
                    <p className="text-gray-300 mb-6">
                        Sage automates your blog, social media, and product pipeline — no coding required. $20/month, cancel anytime.
                    </p>
                    <a
                        href="/sales"
                        className="inline-block px-8 py-4 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full text-white font-bold hover:shadow-lg hover:shadow-violet-500/50 transition-all"
                    >
                        Get Started →
                    </a>
                </div>
            </article>
        </div>
    );
};

export default BlogPost;
