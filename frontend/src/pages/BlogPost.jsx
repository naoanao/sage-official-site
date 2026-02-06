import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, Share2, Tag } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Configure marked to use highlight.js for code blocks
marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

const BlogPost = () => {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadPost = async () => {
            try {
                setLoading(true);
                // Use Vite's import.meta.glob to load MDX files from the posts directory
                const posts = import.meta.glob('../blog/posts/*.mdx', { as: 'raw', eager: true });

                let foundPath = null;
                let rawContent = null;

                for (const path in posts) {
                    if (path.includes(slug)) {
                        foundPath = path;
                        rawContent = posts[path];
                        break;
                    }
                }

                if (!rawContent) {
                    throw new Error('Post not found');
                }

                // Extremely simple frontmatter parser
                const parts = rawContent.split('---');
                let frontmatter = {};
                let content = rawContent;

                if (parts.length >= 3) {
                    const rawFrontmatter = parts[1];
                    content = parts.slice(2).join('---');

                    rawFrontmatter.split('\n').forEach(line => {
                        const [key, ...valueParts] = line.split(':');
                        if (key && valueParts.length > 0) {
                            frontmatter[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
                        }
                    });
                }

                // Sanitized Markdown to HTML
                const htmlContent = DOMPurify.sanitize(marked.parse(content));

                setPost({
                    title: frontmatter.title || 'Untitled Post',
                    date: frontmatter.date || 'Unknown Date',
                    author: frontmatter.author || 'Sage AI',
                    content: htmlContent,
                    keywords: frontmatter.keywords ? frontmatter.keywords.split(',') : []
                });
            } catch (err) {
                console.error('Error loading blog post:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] pt-32 pb-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] pt-32 pb-20 flex flex-col items-center justify-center px-4">
                <h1 className="text-3xl font-bold text-white mb-4">Post Not Found</h1>
                <p className="text-gray-400 mb-8 max-w-md text-center">
                    The article you're looking for doesn't exist or may have been moved.
                </p>
                <Link to="/blog" className="flex items-center text-purple-400 hover:text-purple-300 transition-colors">
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back to Blog
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0c] pt-32 pb-20 overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Link to="/blog" className="inline-flex items-center text-gray-400 hover:text-purple-400 transition-colors mb-8 group">
                        <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Articles
                    </Link>

                    <div className="mb-10">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-6 leading-tight">
                            {post.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm">
                            <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                                {post.date}
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                                8 min read
                            </div>
                            <div className="flex items-center text-purple-300">
                                By {post.author}
                            </div>
                        </div>
                    </div>

                    <div
                        className="prose prose-invert prose-purple max-w-none 
              prose-headings:text-white prose-headings:font-bold 
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-strong:text-purple-300 prose-ul:text-gray-300
              prose-code:text-cyan-300 prose-pre:bg-[#121217] prose-pre:border prose-pre:border-gray-800
              blog-content"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex flex-wrap gap-2">
                            {post.keywords.map((tag, idx) => (
                                <span key={idx} className="flex items-center px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>

                        <button className="flex items-center text-gray-400 hover:text-white transition-colors">
                            <Share2 className="w-5 h-5 mr-2" />
                            Share Article
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default BlogPost;
