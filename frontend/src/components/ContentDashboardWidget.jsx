import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiFileText, FiTrendingUp, FiZap } from 'react-icons/fi';

const ContentDashboardWidget = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/content/stats')
            .then(r => { setData(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <FiFileText className="text-green-400" />
                <h3 className="text-sm font-bold text-green-400 tracking-widest uppercase">Content Pipeline</h3>
            </div>
            {loading ? (
                <div className="animate-pulse space-y-2 flex-1">
                    {[1,2,3,4].map(i => <div key={i} className="h-4 bg-slate-800 rounded" />)}
                </div>
            ) : !data ? (
                <div className="text-slate-500 text-sm font-mono flex items-center gap-2 flex-1">
                    <FiZap className="text-yellow-500" />
                    Flask offline — start <code className="text-yellow-400">run_sage.ps1</code>
                </div>
            ) : (
                <div className="space-y-3 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Blog Posts', value: data.total_posts ?? '—', color: 'text-green-400' },
                            { label: 'Pool Size', value: data.pool_size ?? '—', color: 'text-blue-400' },
                            { label: 'Published', value: data.published ?? '—', color: 'text-emerald-400' },
                            { label: 'Queued', value: data.queued ?? '—', color: 'text-yellow-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] uppercase text-slate-500 mb-1">{s.label}</div>
                                <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                    {data.recent && data.recent.length > 0 && (
                        <div>
                            <div className="text-[10px] uppercase text-slate-500 mb-2 flex items-center gap-1">
                                <FiTrendingUp size={10} /> Recent Posts
                            </div>
                            <div className="space-y-1">
                                {data.recent.slice(0, 5).map((post, i) => (
                                    <div key={i} className="text-xs font-mono text-slate-400 truncate p-2 bg-white/[0.02] rounded">
                                        {post.title ?? post}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContentDashboardWidget;
