import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { FiPlay, FiShield, FiDollarSign, FiCpu, FiMessageSquare, FiActivity, FiXCircle, FiCheckCircle, FiBox, FiCheck, FiSearch, FiAlertTriangle } from 'react-icons/fi';
import axios from 'axios';
import { BACKEND_URL } from '../config/backendUrl';

const api = axios.create({ baseURL: BACKEND_URL, timeout: 130000 });

const SageOS = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [d1Status, setD1Status] = useState('idle'); // idle, running, complete, error
    const [brakeEnabled, setBrakeEnabled] = useState(false);
    const [stats, setStats] = useState({ cpu: '3%', memory: '2GB', upTime: '144:20:10' });

    // Monetization state
    const [monetizeTopic, setMonetizeTopic] = useState('');
    const [market, setMarket] = useState('US');
    const [price, setPrice] = useState('$29');
    const [lang, setLang] = useState('auto'); // 'auto' | 'ja' | 'en'
    const [monetizeStatus, setMonetizeStatus] = useState('idle');
    // idle | checking_research | needs_research | running_d1 | running | review | finalizing | finalized | error
    const [monetizeResult, setMonetizeResult] = useState(null);
    const [researchCheck, setResearchCheck] = useState({ status: 'idle', file: null });
    // idle | checking | found | missing
    const researchDebounce = useRef(null);

    // Review & Edit state
    const [generateData, setGenerateData] = useState(null);
    const [editedSections, setEditedSections] = useState([]);
    const [editedSalesPage, setEditedSalesPage] = useState('');
    const [globalInstruction, setGlobalInstruction] = useState('');
    const [sectionInstructions, setSectionInstructions] = useState({});
    const [rewritingIdx, setRewritingIdx] = useState(null); // which section is being rewritten
    const [globalRewriting, setGlobalRewriting] = useState(false);
    const [expandedSection, setExpandedSection] = useState(null); // index or 'sales'
    const [nicheValidation, setNicheValidation] = useState({ status: 'idle', data: null });
    // 'idle' | 'running' | 'done' | 'error'

    // Sage Metrics states
    const [brainStats, setBrainStats] = useState({ learned_patterns: 0, accuracy: 0 });
    const [monetizationStats, setMonetizationStats] = useState({ qa_pass: 0, qa_warn: 0, safety: 0 });

    // Chat state
    const [messages, setMessages] = useState([
        { id: 1, role: 'system', content: 'Sage OS Online. Ready for instructions.' }
    ]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        // Fetch initial Sage Brake status and System Stats
        const init = async () => {
            try {
                const res = await api.get('/api/system/health');
                setBrakeEnabled(res.data?.brake_enabled ?? false);
            } catch (e) {
                console.log("Could not fetch system status");
            }
        };

        const fetchSageMetrics = async () => {
            try {
                const bRes = await api.get('/api/brain/stats');
                if (bRes.data?.status === 'success') setBrainStats(bRes.data.data);

                const mRes = await api.get('/api/monetization/stats');
                if (mRes.data?.status === 'success') setMonetizationStats(mRes.data.data);
            } catch (e) {
                console.log("Sage metrics fetch idle");
            }
        };

        init();
        fetchSageMetrics();
        const timer = setInterval(fetchSageMetrics, 10000);
        return () => clearInterval(timer);
    }, []);

    // Debounced research check when topic changes
    useEffect(() => {
        if (!monetizeTopic.trim()) {
            setResearchCheck({ status: 'idle', file: null });
            return;
        }
        setResearchCheck({ status: 'checking', file: null });
        clearTimeout(researchDebounce.current);
        researchDebounce.current = setTimeout(async () => {
            try {
                const res = await api.get(`/api/research/check?topic=${encodeURIComponent(monetizeTopic)}`);
                setResearchCheck({
                    status: res.data?.has_research ? 'found' : 'missing',
                    file: res.data?.file || null
                });
            } catch {
                setResearchCheck({ status: 'idle', file: null });
            }
        }, 600);
        return () => clearTimeout(researchDebounce.current);
    }, [monetizeTopic]);

    const handleD1Run = async () => {
        setD1Status('running');
        try {
            await api.post('/api/chat', { message: 'Run D1 knowledge loop: synthesize recent observations and generate insights.' });
            setD1Status('complete');
            setTimeout(() => setD1Status('idle'), 3000);
        } catch (e) {
            setD1Status('error');
            setTimeout(() => setD1Status('idle'), 3000);
        }
    };

    // Run D1 research for the current topic, then auto-proceed to generate
    const handleD1ForTopic = async () => {
        setMonetizeStatus('running_d1');
        try {
            await api.post('/api/d1/generate', { topic: monetizeTopic });
            // Re-check research after D1
            const res = await api.get(`/api/research/check?topic=${encodeURIComponent(monetizeTopic)}`);
            setResearchCheck({
                status: res.data?.has_research ? 'found' : 'missing',
                file: res.data?.file || null
            });
            // Auto-proceed to generation
            await runMonetizePipeline();
        } catch (e) {
            setMonetizeStatus('error');
            setMonetizeResult('D1リサーチに失敗しました: ' + (e.message || ''));
            setTimeout(() => { setMonetizeStatus('idle'); setMonetizeResult(null); }, 8000);
        }
    };

    const toggleBrake = () => {
        setBrakeEnabled(prev => !prev);
    };

    // Core pipeline — always runs generation regardless of research status
    const runMonetizePipeline = async () => {
        setMonetizeStatus('running');
        setMonetizeResult(null);
        try {
            const planRes = await api.post('/api/productize', { topic: monetizeTopic, market, price });
            if (!planRes.data || planRes.data.error) throw new Error(planRes.data?.error || 'Plan generation failed');

            const execRes = await api.post('/api/productize/execute', {
                topic: monetizeTopic,
                type: 'COURSE',
                plan: planRes.data.plan,
                language: lang
            });
            if (!execRes.data || execRes.data.error) throw new Error(execRes.data?.error || 'Course generation failed');

            // Store full data and enter Review & Edit mode
            const courseData = execRes.data;
            setGenerateData(courseData);
            setEditedSections((courseData.sections || []).map(s => ({ ...s })));
            setEditedSalesPage(courseData.sales_page || '');
            setSectionInstructions({});
            setExpandedSection(0);
            setMonetizeStatus('review');
        } catch (e) {
            console.error("Monetization failed", e);
            setMonetizeResult(e.message || 'エラーが発生しました');
            setMonetizeStatus('error');
            setTimeout(() => { setMonetizeStatus('idle'); setMonetizeResult(null); }, 8000);
        }
    };

    // Rewrite a single section with an instruction
    const handleRewriteSection = async (idx) => {
        const instruction = sectionInstructions[idx] || '';
        if (!instruction.trim()) return;
        setRewritingIdx(idx);
        try {
            const res = await api.post('/api/productize/rewrite', {
                content: editedSections[idx].content,
                instruction,
                language: lang === 'auto' ? (monetizeTopic.match(/[\u3000-\u9fff]/) ? 'ja' : 'en') : lang
            });
            if (res.data?.status === 'success') {
                setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, content: res.data.rewritten } : s));
                setSectionInstructions(prev => ({ ...prev, [idx]: '' }));
            }
        } catch (e) {
            console.error('Rewrite failed', e);
        } finally {
            setRewritingIdx(null);
        }
    };

    // Apply global instruction to all sections + sales page + images (always)
    // LLM on the backend translates the instruction into image style keywords automatically
    // tonePreset: optional preset ID (e.g. 'conversational', 'pasona') — backend uses full template
    const handleRewriteAll = async (overrideInstruction, tonePreset) => {
        const instruction = overrideInstruction || globalInstruction;
        if (!tonePreset && !instruction.trim()) return;
        if (overrideInstruction && !tonePreset) setGlobalInstruction(overrideInstruction);
        setGlobalRewriting(true);
        try {
            const resolvedLang = lang === 'auto' ? (monetizeTopic.match(/[\u3000-\u9fff]/) ? 'ja' : 'en') : lang;
            const rewritePayload = (content) => tonePreset
                ? { content, tone_preset: tonePreset, instruction: '', language: resolvedLang }
                : { content, instruction, language: resolvedLang };

            // Run text rewrites, sales page rewrite, and image regen all in parallel
            const textRewritePromise = Promise.all(
                editedSections.map(s =>
                    api.post('/api/productize/rewrite', rewritePayload(s.content))
                )
            );
            const salesPageRewritePromise = editedSalesPage
                ? api.post('/api/productize/rewrite', rewritePayload(editedSalesPage))
                : Promise.resolve(null);
            const imageRegenPromise = editedSections.length > 0
                ? api.post('/api/productize/regenerate_images', {
                    sections: editedSections,
                    custom_instruction: instruction,
                    topic: monetizeTopic
                })
                : Promise.resolve(null);

            const [rewritesResult, salesPageResult, imageResult] = await Promise.allSettled([
                textRewritePromise, salesPageRewritePromise, imageRegenPromise
            ]);
            const rewrites = rewritesResult.status === 'fulfilled' ? rewritesResult.value : [];
            const salesPageRes = salesPageResult.status === 'fulfilled' ? salesPageResult.value : null;
            const imageRes = imageResult.status === 'fulfilled' ? imageResult.value : null;
            if (rewritesResult.status === 'rejected') console.error('Text rewrite failed', rewritesResult.reason);
            if (salesPageResult.status === 'rejected') console.error('Sales page rewrite failed', salesPageResult.reason);
            if (imageResult.status === 'rejected') console.error('Image regen failed', imageResult.reason);

            setEditedSections(prev => prev.map((s, i) =>
                rewrites[i]?.data?.status === 'success' ? { ...s, content: rewrites[i].data.rewritten } : s
            ));
            if (salesPageRes?.data?.status === 'success') setEditedSalesPage(salesPageRes.data.rewritten);
            if (imageRes?.data?.status === 'success' && imageRes.data.images) {
                setGenerateData(prev => ({ ...prev, images: imageRes.data.images }));
            }
            setGlobalInstruction('');
        } catch (e) {
            console.error('Global rewrite failed', e);
        } finally {
            setGlobalRewriting(false);
        }
    };

    // Save finalized content back to Obsidian
    const handleFinalize = async () => {
        setMonetizeStatus('finalizing');
        try {
            const res = await api.post('/api/productize/finalize', {
                topic: monetizeTopic,
                sections: editedSections,
                sales_page: editedSalesPage,
                obsidian_note: generateData?.obsidian_note || ''
            });
            if (res.data?.status === 'success') {
                setMonetizeResult(res.data.saved_path);
                setMonetizeStatus('finalized');
            } else {
                throw new Error(res.data?.error || 'Finalize failed');
            }
        } catch (e) {
            setMonetizeResult(e.message);
            setMonetizeStatus('error');
            setTimeout(() => { setMonetizeStatus('review'); setMonetizeResult(null); }, 6000);
        }
    };

    // Content quality heuristic — runs client-side, no API call (JP + EN bilingual)
    const analyzeContentQuality = (content) => {
        if (!content) return { score: 0, badges: [] };
        const badges = [];
        let score = 0;
        if (/\d+/.test(content)) { score += 25; badges.push({ label: '数値', color: 'blue' }); }
        if (/\d+\.\s|今すぐ|ステップ|手順|Take Action|Step \d|Action \d/.test(content)) { score += 25; badges.push({ label: 'アクション', color: 'green' }); }
        if (/失敗|ミス|注意|間違い|エラー|Mistake|Common Error|Warning|Caution|Avoid/.test(content)) { score += 25; badges.push({ label: '失敗対策', color: 'orange' }); }
        if (/分間|時間|円|%|km|kg|回|分|秒|minutes|hours|billion|million|\$\d/.test(content)) { score += 25; badges.push({ label: '具体的', color: 'purple' }); }
        return { score, badges };
    };

    // Niche validation via backend
    const handleNicheValidate = async () => {
        if (!monetizeTopic.trim()) return;
        setNicheValidation({ status: 'running', data: null });
        try {
            const res = await api.post('/api/niche/validate', { topic: monetizeTopic });
            setNicheValidation({ status: 'done', data: res.data });
        } catch (e) {
            setNicheValidation({ status: 'error', data: null });
        }
    };

    // Entry point — checks research first, blocks if missing
    const handleMonetize = async () => {
        if (!monetizeTopic) return;
        if (researchCheck.status === 'missing') {
            setMonetizeStatus('needs_research');
            return;
        }
        await runMonetizePipeline();
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newMsg = { id: Date.now(), role: 'user', content: inputValue };
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');

        try {
            const res = await api.post('/api/chat', { message: newMsg.content });
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'sage',
                content: res.data.response || 'No response.'
            }]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'sage',
                content: 'Backend unreachable. Check server status.'
            }]);
        }
    };

    const convertToProduct = (content) => {
        setMonetizeTopic(content);
        setActiveTab('monetization');
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-hidden flex" translate="no">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900/50 border-r border-white/5 flex flex-col p-4 backdrop-blur-md z-10">
                <div className="text-xl font-bold tracking-tighter mb-8 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" translate="no"></span>
                    <span>SAGE COCKPIT</span>
                </div>

                <div className="space-y-2 flex-grow">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 border border-blue-500 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        <FiActivity /> <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('monetization')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'monetization' ? 'bg-purple-600 border border-purple-500 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        <FiDollarSign /> <span>Monetization</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'chat' ? 'bg-emerald-600 border border-emerald-500 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        <FiMessageSquare /> <span>AI Chat</span>
                    </button>
                </div>

                {/* Sage Brake Widget in Sidebar */}
                <div className="mt-auto p-4 bg-black/40 border border-white/5 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-slate-400 flex items-center gap-2"><FiShield /> <span>SAGE BRAKE</span></span>
                        <div className={`w-2 h-2 rounded-full ${brakeEnabled ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    </div>
                    <button
                        onClick={toggleBrake}
                        className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition-all flex justify-center items-center gap-2 ${brakeEnabled ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}`}
                    >
                        {brakeEnabled ? <><FiXCircle /> <span>BRAKE ACTIVE</span></> : <><FiCheckCircle /> <span>NORMAL OPERATION</span></>}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-black to-black overflow-y-auto" translate="no">

                {activeTab === 'dashboard' && (
                    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <h2 className="text-2xl font-bold mb-6">System Dashboard</h2>

                        {/* Brain Stats Widget */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-sm mb-2 flex items-center gap-2"><FiCpu /> CPU Usage</div>
                                <div className="text-3xl font-mono text-blue-400">{stats.cpu}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-sm mb-2 flex items-center gap-2"><FiActivity /> Memory</div>
                                <div className="text-3xl font-mono text-purple-400">{stats.memory}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-sm mb-2">System Uptime</div>
                                <div className="text-3xl font-mono text-emerald-400">{stats.upTime}</div>
                            </div>
                        </div>

                        {/* Sage 3.0 Engine Metrics - Row 2 (Requested) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-xs mb-2 flex items-center gap-2 uppercase tracking-widest"><FiActivity /> Learned Patterns</div>
                                <div className="text-2xl font-mono text-purple-400">{brainStats.learned_patterns || 0}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-xs mb-2 flex items-center gap-2 uppercase tracking-widest"><FiCpu /> Brain Hit Rate</div>
                                <div className="text-2xl font-mono text-blue-400">{(brainStats.accuracy * 100).toFixed(1)}%</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-xs mb-2 flex items-center gap-2 uppercase tracking-widest"><FiCheckCircle /> QA Pass Rate</div>
                                <div className="text-2xl font-mono text-emerald-400">
                                    {monetizationStats.qa_pass + monetizationStats.qa_warn > 0
                                        ? Math.round((monetizationStats.qa_pass / (monetizationStats.qa_pass + monetizationStats.qa_warn)) * 100)
                                        : 0}%
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-xs mb-2 flex items-center gap-2 uppercase tracking-widest"><FiShield /> Guard Blocks</div>
                                <div className="text-2xl font-mono text-red-400">{monetizationStats.contamination_blocked || 0}</div>
                            </div>
                        </div>

                        {/* D1 Knowledge Loop */}
                        <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 p-8 rounded-2xl">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">D1 Knowledge Loop <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Observation Phase</span></h3>
                            <p className="text-slate-400 mb-6 text-sm">Force observation, pattern detection, and generation of Obsidian artifacts independently of human query.</p>

                            <button
                                onClick={handleD1Run}
                                disabled={d1Status === 'running'}
                                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${d1Status === 'running' ? 'bg-slate-700 text-slate-400' :
                                    d1Status === 'error' ? 'bg-red-600 text-white' :
                                        d1Status === 'complete' ? 'bg-emerald-600 text-white' :
                                            'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]'
                                    }`}
                            >
                                {d1Status === 'idle' && <><FiPlay /> Execute D1 Loop</>}
                                {d1Status === 'running' && <><div className="animate-spin w-4 h-4 rounded-full border-2 border-slate-400 border-t-white"></div> Processing...</>}
                                {d1Status === 'complete' && <><FiCheck /> Knowledge Created</>}
                                {d1Status === 'error' && <><FiXCircle /> Error</>}
                            </button>
                        </div>
                    </Motion.div>
                )}

                {activeTab === 'monetization' && (
                    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto py-8">
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black mb-4">Consultative Productization</h2>
                            <p className="text-slate-400">Generate a full course and Gumroad landing page from a single topic.</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 backdrop-blur-sm">
                            {/* Topic + research status */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-bold text-slate-300">Topic / Idea</label>
                                        <button
                                            onClick={handleNicheValidate}
                                            disabled={!monetizeTopic.trim() || nicheValidation.status === 'running'}
                                            className="text-xs px-3 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 disabled:opacity-40 text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center gap-1.5 transition-all"
                                        >
                                            {nicheValidation.status === 'running'
                                                ? <><div className="w-3 h-3 rounded-full border border-indigo-300 border-t-transparent animate-spin" /> 検証中</>
                                                : <>📊 ニッチ検証</>}
                                        </button>
                                    </div>
                                    {researchCheck.status === 'checking' && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-slate-400 border-t-white animate-spin" /> リサーチ確認中...</span>
                                    )}
                                    {researchCheck.status === 'found' && (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1"><FiCheckCircle /> D1リサーチ済み: {researchCheck.file}</span>
                                    )}
                                    {researchCheck.status === 'missing' && (
                                        <span className="text-xs text-amber-400 flex items-center gap-1"><FiAlertTriangle /> D1リサーチ未実行</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={monetizeTopic}
                                    onChange={(e) => { setMonetizeTopic(e.target.value); setMonetizeStatus('idle'); setNicheValidation({ status: 'idle', data: null }); }}
                                    placeholder="e.g. 早朝釣り完全攻略 小田原港 2026"
                                    className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${researchCheck.status === 'missing' ? 'border-amber-500/50 focus:border-amber-400' : 'border-white/10 focus:border-purple-500'}`}
                                />
                            </div>

                            {/* Language selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">出力言語 / Output Language</label>
                                <div className="flex gap-2">
                                    {[['auto', '🌐 Auto'], ['ja', '🇯🇵 日本語'], ['en', '🇺🇸 English']].map(([val, label]) => (
                                        <button
                                            key={val}
                                            onClick={() => setLang(val)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${lang === val ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Target Market</label>
                                    <select
                                        value={market}
                                        onChange={(e) => setMarket(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none"
                                    >
                                        <option value="US">🇺🇸 US Market</option>
                                        <option value="JP">🇯🇵 Japan Market</option>
                                        <option value="CN">🇨🇳 China Market</option>
                                        <option value="IN">🇮🇳 India Market</option>
                                        <option value="GLOBAL">🌐 Global Market</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Suggested Price</label>
                                    <input
                                        type="text"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <hr className="border-white/5 my-6" />

                            {/* D1 research prompt — shown when research is missing and user tried to generate */}
                            {monetizeStatus === 'needs_research' && (
                                <div className="p-5 bg-amber-900/20 border border-amber-500/30 rounded-2xl space-y-3">
                                    <div className="text-amber-300 font-bold flex items-center gap-2"><FiAlertTriangle /> D1リサーチが見つかりません</div>
                                    <p className="text-slate-300 text-sm">「{monetizeTopic}」に一致するリサーチファイルがありません。汚染リスクを避けるため、先にD1リサーチを実行することを推奨します。</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleD1ForTopic}
                                            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            <FiPlay /> D1リサーチを実行してから生成
                                        </button>
                                        <button
                                            onClick={runMonetizePipeline}
                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-400 text-sm rounded-xl transition-all"
                                        >
                                            このまま生成（リスクあり）
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Generate button */}
                            {!['needs_research', 'review', 'finalizing', 'finalized'].includes(monetizeStatus) && (
                                <button
                                    onClick={handleMonetize}
                                    disabled={!monetizeTopic || ['running', 'running_d1'].includes(monetizeStatus)}
                                    className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-3 transition-all ${!monetizeTopic ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                                        monetizeStatus === 'running' ? 'bg-slate-700 text-slate-400' :
                                            monetizeStatus === 'running_d1' ? 'bg-amber-800 text-amber-200' :
                                                monetizeStatus === 'error' ? 'bg-red-700 text-white' :
                                                    'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white shadow-[0_0_40px_rgba(147,51,234,0.4)]'
                                        }`}
                                >
                                    {monetizeStatus === 'idle' && <><FiBox /> Format Product & Generate Gumroad ZIP</>}
                                    {monetizeStatus === 'running_d1' && <><div className="animate-spin w-5 h-5 rounded-full border-2 border-amber-400 border-t-white" /> D1リサーチ実行中...</>}
                                    {monetizeStatus === 'running' && <><div className="animate-spin w-5 h-5 rounded-full border-2 border-slate-400 border-t-white"></div> Running Pipeline...</>}
                                    {monetizeStatus === 'error' && <><FiXCircle /> Pipeline Failed — Retry</>}
                                </button>
                            )}

                            {monetizeResult && monetizeStatus === 'error' && (
                                <div className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-sm">
                                    <div className="text-red-400 font-bold mb-1">❌ エラー詳細</div>
                                    <div className="text-slate-300 text-xs break-all">{monetizeResult}</div>
                                </div>
                            )}
                        </div>

                        {/* ── Niche Validation Report ─────────────────────────── */}
                        {nicheValidation.status === 'done' && nicheValidation.data?.status === 'success' && (() => {
                            const v = nicheValidation.data;
                            const recStyle = {
                                GO: { wrap: 'border-emerald-500/30 bg-emerald-900/10', label: 'text-emerald-400', score: 'text-emerald-300', text: '✅ GO — 市場性あり' },
                                CAUTION: { wrap: 'border-amber-500/30 bg-amber-900/10', label: 'text-amber-400', score: 'text-amber-300', text: '⚠️ CAUTION — 要改善' },
                                STOP: { wrap: 'border-red-500/30 bg-red-900/10', label: 'text-red-400', score: 'text-red-300', text: '🛑 STOP — 市場性低' },
                            }[v.recommendation] || { wrap: 'border-slate-500/30 bg-slate-900/10', label: 'text-slate-400', score: 'text-slate-300', text: v.recommendation };
                            return (
                                <div className={`border ${recStyle.wrap} rounded-2xl p-6 space-y-4`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className={`text-lg font-black ${recStyle.label}`}>{recStyle.text}</div>
                                            <div className="text-slate-400 text-sm mt-0.5">総合スコア: <span className={`${recStyle.score} font-bold text-xl`}>{v.overall_score}</span>/100</div>
                                        </div>
                                        <button onClick={() => setNicheValidation({ status: 'idle', data: null })} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-white/5">✕</button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                        <div className="bg-black/30 rounded-xl p-3">
                                            <div className="text-slate-400 mb-1 uppercase tracking-widest font-bold">需要</div>
                                            <div className="text-white font-bold text-base">{v.demand?.score}/100</div>
                                            <div className="text-slate-500">{v.demand?.trend} · 検索:{v.demand?.search_volume}</div>
                                            <div className="text-slate-400 mt-1 leading-relaxed">{v.demand?.reason}</div>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-3">
                                            <div className="text-slate-400 mb-1 uppercase tracking-widest font-bold">競合</div>
                                            <div className="text-white font-bold text-base">{v.competition?.level}</div>
                                            <div className="text-slate-500">平均¥{(v.competition?.avg_price_jpy || 0).toLocaleString()}</div>
                                            {(v.competition?.gaps || []).length > 0 && (
                                                <div className="mt-1 text-indigo-300">ギャップ: {v.competition.gaps[0]}</div>
                                            )}
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-3">
                                            <div className="text-slate-400 mb-1 uppercase tracking-widest font-bold">オーディエンス</div>
                                            <div className="text-white font-bold text-base">{v.audience?.clarity_score}/100</div>
                                            <div className="text-slate-500">{v.audience?.persona?.age_range} · {v.audience?.persona?.occupation}</div>
                                            <div className="text-slate-400 mt-1 leading-relaxed">{v.audience?.persona?.pain_point}</div>
                                        </div>
                                    </div>
                                    {v.pricing && (
                                        <div className="flex gap-3 text-xs">
                                            <div className="bg-black/30 rounded-xl px-4 py-2 flex-1 text-center">
                                                <div className="text-slate-400">Basic</div>
                                                <div className="text-white font-bold">¥{(v.pricing.japan?.basic || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-2 flex-1 text-center">
                                                <div className="text-purple-300">Standard ★</div>
                                                <div className="text-white font-bold">¥{(v.pricing.japan?.standard || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-black/30 rounded-xl px-4 py-2 flex-1 text-center">
                                                <div className="text-slate-400">Premium</div>
                                                <div className="text-white font-bold">¥{(v.pricing.japan?.premium || 0).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    )}
                                    {(v.improvements || []).length > 0 && (
                                        <div className="bg-black/20 rounded-xl p-3 text-xs space-y-1">
                                            <div className="text-slate-400 uppercase tracking-widest font-bold mb-2">改善提案</div>
                                            {v.improvements.map((imp, i) => (
                                                <div key={i} className="text-slate-300 flex gap-2"><span className="text-indigo-400">→</span>{imp}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        {nicheValidation.status === 'error' && (
                            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-sm text-red-400 flex items-center gap-2">
                                <FiXCircle /> ニッチ検証に失敗しました。Flaskが起動しているか確認してください。
                            </div>
                        )}

                        {/* ── Review & Edit Panel ─────────────────────────────── */}
                        {['review', 'finalizing', 'finalized'].includes(monetizeStatus) && generateData && (
                            <div className="space-y-4">

                                {/* Header bar */}
                                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${generateData.qa_status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                QA {generateData.qa_status || 'WARN'}
                                            </span>
                                            <span className="text-white font-bold truncate max-w-xs">{monetizeTopic}</span>
                                        </div>
                                        {generateData.research_source && (
                                            <div className="text-xs text-slate-500 mt-1">D1: {generateData.research_source}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => { setMonetizeStatus('idle'); setGenerateData(null); }}
                                        className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                                    >
                                        ← やり直す
                                    </button>
                                </div>

                                {/* Visual Assets */}
                                {generateData.images && Object.keys(generateData.images).length > 0 && (
                                    <div className="p-4 bg-slate-900/60 border border-white/10 rounded-2xl">
                                        <div className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
                                            <FiActivity className="text-blue-400" /> Visual Assets
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(generateData.images).map(([title, data]) => (
                                                <div key={title} className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
                                                    {data.type === 'generated' && data.url ? (
                                                        <a href={data.url} target="_blank" rel="noopener noreferrer">
                                                            <img
                                                                src={data.url}
                                                                alt={title}
                                                                className="w-full h-28 object-cover hover:opacity-90 transition-opacity"
                                                                onError={e => { e.target.style.display = 'none'; }}
                                                            />
                                                        </a>
                                                    ) : (
                                                        <div className="w-full h-28 flex items-center justify-center bg-slate-800/60">
                                                            <span className="text-slate-500 text-xs">Prompt Only</span>
                                                        </div>
                                                    )}
                                                    <div className="px-2 py-1.5">
                                                        <p className="text-slate-300 text-[10px] truncate">{title}</p>
                                                        {data.prompt && (
                                                            <p className="text-slate-600 text-[9px] truncate mt-0.5">{data.prompt}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {Object.values(generateData.images).some(d => d.type === 'prompt_only') && (
                                            <p className="text-slate-500 text-[10px] mt-3 italic">
                                                ※ 一部の画像はプロンプトのみ。image_prompts.md をMidjourney等で利用可能。
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Global tone rewrite */}
                                {(() => {
                                    const resolvedLang = lang === 'auto' ? (monetizeTopic.match(/[\u3000-\u9fff]/) ? 'ja' : 'en') : lang;
                                    const isEn = resolvedLang === 'en';
                                    const enPresets = [
                                        { id: 'conversational', label: '💬 Conversational', desc: 'Like a smart friend' },
                                        { id: 'storytelling_us', label: '📖 Story-Driven', desc: 'US storytelling style' },
                                        { id: 'pasona', label: '💰 PASONA', desc: 'Problem→Action sales' },
                                        { id: 'quest', label: '🎯 QUEST', desc: 'Consultant persuasion' },
                                    ];
                                    const jaPresets = [
                                        'もっとカジュアルに',
                                        '専門的・権威ある口調で',
                                        '箇条書きにして',
                                        '半分の長さに要約',
                                        '超ニッチ特化（地域・対象者を限定）',
                                        'データ・事例を具体的に追加',
                                        '今すぐできるアクションに変換',
                                        'ありがち失敗パターンを削除',
                                    ];
                                    return (
                                        <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl">
                                            <div className="text-xs font-bold text-purple-300 mb-2 uppercase tracking-widest">
                                                {isEn ? 'Rewrite Tone & Style (All Sections)' : '全体の口調・スタイルを一括変更'}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={globalInstruction}
                                                    onChange={e => setGlobalInstruction(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleRewriteAll()}
                                                    placeholder={isEn ? 'e.g. Make it shorter / Add more examples / Bullet points' : '例: もっとカジュアルに / 箇条書きにして / 英語に翻訳 / 短くまとめて'}
                                                    className="flex-1 bg-black/40 border border-purple-500/30 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400 placeholder:text-slate-600"
                                                />
                                                <button
                                                    onClick={handleRewriteAll}
                                                    disabled={!globalInstruction.trim() || globalRewriting}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap"
                                                >
                                                    {globalRewriting
                                                        ? <><div className="w-4 h-4 rounded-full border border-white border-t-transparent animate-spin" /> {isEn ? 'Rewriting...' : '書き直し中'}</>
                                                        : <><FiPlay /> {isEn ? 'Rewrite All' : '全部書き直す'}</>}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {isEn
                                                    ? enPresets.map(p => (
                                                        <button key={p.id}
                                                            onClick={() => handleRewriteAll(p.label, p.id)}
                                                            disabled={globalRewriting}
                                                            title={p.desc}
                                                            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-purple-600/40 hover:text-white disabled:opacity-40 text-slate-300 rounded-lg transition-all font-medium border border-white/10 hover:border-purple-400/40">
                                                            {p.label}
                                                        </button>
                                                    ))
                                                    : jaPresets.map(preset => (
                                                        <button key={preset}
                                                            onClick={() => handleRewriteAll(preset)}
                                                            disabled={globalRewriting}
                                                            className="text-xs px-2 py-1 bg-white/5 hover:bg-purple-600/30 hover:text-white disabled:opacity-40 text-slate-400 rounded-lg transition-all">
                                                            {preset}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Section editors */}
                                <div className="space-y-3">
                                    {editedSections.map((section, idx) => (
                                        <div key={idx} className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                                            {/* Section header */}
                                            <button
                                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-all"
                                                onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                                            >
                                                <div className="flex items-center gap-3 text-left flex-wrap">
                                                    <span className="text-xs text-slate-500 font-mono w-5">{idx + 1}</span>
                                                    <span className="text-sm font-semibold text-white">{section.title}</span>
                                                    <span className="text-xs text-slate-500">{section.content?.length || 0} 文字</span>
                                                    {(() => {
                                                        const q = analyzeContentQuality(section.content);
                                                        const scoreColor = q.score >= 75 ? 'text-emerald-400' : q.score >= 50 ? 'text-amber-400' : 'text-red-400';
                                                        return (
                                                            <span className={`text-xs font-bold ${scoreColor}`}>Q{q.score}</span>
                                                        );
                                                    })()}
                                                </div>
                                                <span className="text-slate-500 text-xs">{expandedSection === idx ? '▲' : '▼'}</span>
                                            </button>

                                            {/* Expanded editor */}
                                            {expandedSection === idx && (
                                                <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                                                    {/* Title edit */}
                                                    <input
                                                        type="text"
                                                        value={section.title}
                                                        onChange={e => setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                                                        className="w-full mt-3 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-semibold text-sm focus:outline-none focus:border-blue-400"
                                                        placeholder="セクションタイトル"
                                                    />
                                                    {/* Content textarea */}
                                                    <textarea
                                                        value={section.content}
                                                        onChange={e => setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, content: e.target.value } : s))}
                                                        rows={10}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-blue-400 resize-y font-mono"
                                                    />
                                                    {/* Per-section rewrite */}
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={sectionInstructions[idx] || ''}
                                                            onChange={e => setSectionInstructions(prev => ({ ...prev, [idx]: e.target.value }))}
                                                            onKeyDown={e => e.key === 'Enter' && handleRewriteSection(idx)}
                                                            placeholder="このセクションだけ書き直す（例: もっと具体的な数字を入れて）"
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-400 placeholder:text-slate-600"
                                                        />
                                                        <button
                                                            onClick={() => handleRewriteSection(idx)}
                                                            disabled={!sectionInstructions[idx]?.trim() || rewritingIdx === idx}
                                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all whitespace-nowrap"
                                                        >
                                                            {rewritingIdx === idx
                                                                ? <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                                                                : <FiPlay />}
                                                            書き直す
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Sales page editor */}
                                {editedSalesPage && (
                                    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                                        <button
                                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-all"
                                            onClick={() => setExpandedSection(expandedSection === 'sales' ? null : 'sales')}
                                        >
                                            <span className="text-sm font-semibold text-emerald-300">💰 セールスページ</span>
                                            <span className="text-slate-500 text-xs">{expandedSection === 'sales' ? '▲' : '▼'}</span>
                                        </button>
                                        {expandedSection === 'sales' && (
                                            <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                                                <textarea
                                                    value={editedSalesPage}
                                                    onChange={e => setEditedSalesPage(e.target.value)}
                                                    rows={14}
                                                    className="w-full mt-3 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-emerald-400 resize-y font-mono"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={sectionInstructions['sales'] || ''}
                                                        onChange={e => setSectionInstructions(prev => ({ ...prev, sales: e.target.value }))}
                                                        onKeyDown={async e => {
                                                            if (e.key !== 'Enter' || !sectionInstructions['sales']?.trim()) return;
                                                            setRewritingIdx('sales');
                                                            const resolvedLang = lang === 'auto' ? (monetizeTopic.match(/[\u3000-\u9fff]/) ? 'ja' : 'en') : lang;
                                                            const res = await api.post('/api/productize/rewrite', { content: editedSalesPage, instruction: sectionInstructions['sales'], language: resolvedLang });
                                                            if (res.data?.status === 'success') { setEditedSalesPage(res.data.rewritten); setSectionInstructions(p => ({ ...p, sales: '' })); }
                                                            setRewritingIdx(null);
                                                        }}
                                                        placeholder="セールスページを書き直す（例: もっと煽り文句を入れて、CTAを強調して）"
                                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400 placeholder:text-slate-600"
                                                    />
                                                    <button
                                                        disabled={!sectionInstructions['sales']?.trim() || rewritingIdx === 'sales'}
                                                        onClick={async () => {
                                                            if (!sectionInstructions['sales']?.trim()) return;
                                                            setRewritingIdx('sales');
                                                            const resolvedLang = lang === 'auto' ? (monetizeTopic.match(/[\u3000-\u9fff]/) ? 'ja' : 'en') : lang;
                                                            const res = await api.post('/api/productize/rewrite', { content: editedSalesPage, instruction: sectionInstructions['sales'], language: resolvedLang });
                                                            if (res.data?.status === 'success') { setEditedSalesPage(res.data.rewritten); setSectionInstructions(p => ({ ...p, sales: '' })); }
                                                            setRewritingIdx(null);
                                                        }}
                                                        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all whitespace-nowrap"
                                                    >
                                                        {rewritingIdx === 'sales' ? <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" /> : <FiPlay />}
                                                        書き直す
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Finalize bar */}
                                {monetizeStatus !== 'finalized' ? (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleFinalize}
                                            disabled={monetizeStatus === 'finalizing'}
                                            className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                        >
                                            {monetizeStatus === 'finalizing'
                                                ? <><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> 保存中...</>
                                                : <><FiCheckCircle /> 確認完了 → Obsidianに保存</>}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-5 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl space-y-2">
                                        <div className="text-emerald-400 font-bold text-lg flex items-center gap-2"><FiCheck /> 最終版を保存しました</div>
                                        <div className="text-slate-300 font-mono text-xs break-all">{monetizeResult}</div>
                                        <button
                                            onClick={() => { setMonetizeStatus('idle'); setGenerateData(null); setMonetizeResult(null); }}
                                            className="mt-2 text-sm text-slate-400 hover:text-white px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                        >
                                            新しい商品を生成する
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    </Motion.div>
                )}

                {activeTab === 'chat' && (
                    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
                        <div className="flex-1 overflow-y-auto space-y-4 p-4 no-scrollbar">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 rounded-tr-none' :
                                        msg.role === 'system' ? 'bg-white/5 border border-white/10 text-slate-400 text-center mx-auto text-xs font-mono uppercase' :
                                            'bg-slate-800 rounded-tl-none border border-slate-700'
                                        }`}>
                                        {msg.content}
                                        {msg.role === 'sage' && (
                                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                                                <button
                                                    onClick={() => convertToProduct(msg.content)}
                                                    className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                                >
                                                    <FiDollarSign /> Productize This (D2)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="p-4 bg-black border-t border-white/5">
                            <div className="flex relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    placeholder="Tell Sage to research, heal, or generate..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-14 py-4 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button type="submit" className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                                    <FiPlay className="w-5 h-5 ml-0.5" />
                                </button>
                            </div>
                        </form>
                    </Motion.div>
                )}
            </div>
        </div>
    );
};

export default SageOS;
