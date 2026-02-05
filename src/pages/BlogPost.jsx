import React from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { useParams } from 'react-router-dom';

const BlogPost = () => {
    const { slug } = useParams();
    const [post, setPost] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        // In production, this would fetch from API or pre-rendered pages
        // For now, using direct file read (works in dev mode with Node backend)
        const loadPost = async () => {
            try {
                const postsDirectory = path.join(process.cwd(), 'src/blog/posts');
                const filePath = path.join(postsDirectory, `${slug}.mdx`);
                const fileContents = fs.readFileSync(filePath, 'utf8');
                const { data, content } = matter(fileContents);

                setPost({ frontmatter: data, content });
                setLoading(false);
            } catch (error) {
                console.error('Error loading post:', error);
                setLoading(false);
            }
        };

        loadPost();
    }, [slug]);

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
            {/* Header */}
            <header className="border-b border-white/10 py-6">
                <div className="max-w-4xl mx-auto px-4">
                    <a href="/" className="text-violet-400 hover:text-violet-300 transition-colors">
                        ← Back to Home
                    </a>
                </div>
            </header>

            {/* Article */}
            <article className="max-w-4xl mx-auto px-4 py-16">
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
                        Get Sage Fortress Edition and start automating everything—no coding required.
                    </p>
                    <a
                        href="https://naofumi3.gumroad.com/l/sage-professional"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-8 py-4 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full text-white font-bold hover:shadow-lg hover:shadow-violet-500/50 transition-all"
                    >
                        Get Started →
                    </a>
                </div>
            </article>

            {/* Related Products Sidebar */}
            <aside className="max-w-4xl mx-auto px-4 pb-16">
                <h3 className="text-2xl font-bold mb-6">Related Products</h3>
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
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/50 hover:bg-white/10 transition-all"
                        >
                            <div className="text-lg font-bold mb-2">{product.name}</div>
                            <div className="text-violet-400 font-bold">{product.price}</div>
                        </a>
                    ))}
                </div>
            </aside>
        </div>
    );
};

export default BlogPost;
