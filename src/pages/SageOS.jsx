import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiPlay, FiShield, FiDollarSign, FiActivity, FiXCircle, FiCheckCircle, FiCheck, FiAlertTriangle, FiHome, FiShoppingCart, FiCpu, FiRefreshCw, FiFolder } from 'react-icons/fi';
import axios from 'axios';
import { BACKEND_URL } from '../config/backendUrl';
import PhaseStepperBar from '../components/PhaseStepperBar';
import SageMiniChat from '../components/SageMiniChat';

const api = axios.create({ baseURL: BACKEND_URL, timeout: 130000 });
const apiRewrite = axios.create({ baseURL: BACKEND_URL, timeout: 90000 });

// ── Demo output shown to public visitors (no real API call) ─────────────────
const DEMO_RESULT = {
    qa_status: 'PASS',
    research_source: 'demo_preview',
    sections: [
        {
            title: 'Why AI is the #1 Passive Income Tool in 2025',
            content: `AI tools have fundamentally changed the passive income landscape. Unlike traditional methods that require constant manual effort, AI-powered systems can generate content, respond to customers, and optimize your revenue streams 24/7.\n\nHere's what makes AI different:\n- **Zero sleep required**: Your AI works while you sleep, handling tasks that would take hours manually\n- **Scale without cost**: Adding a second revenue stream costs almost nothing when AI does the heavy lifting\n- **Compound learning**: The longer you run AI systems, the smarter they become about your niche\n\nThe data is clear: solopreneurs using AI tools are generating 3-5x more content than those who don't, with 40% less time invested.`
        },
        {
            title: '5 Proven AI Income Streams You Can Start This Week',
            content: `You don't need to be a tech expert to start earning passive income with AI. Here are five proven approaches:\n\n**1. AI-Powered Digital Products ($500–$5,000/month)**\nCreate ebooks, courses, and templates using AI, then sell them on Gumroad. The upfront work takes a weekend; the income continues for years.\n\n**2. AI Blog + Ad Revenue ($200–$2,000/month)**\nUse AI to publish 3–5 SEO-optimized posts per week. With 50+ posts, expect consistent ad and affiliate income.\n\n**3. AI Newsletter Monetization ($300–$3,000/month)**\nCurate and summarize industry news using AI, then monetize with sponsorships after hitting 1,000 subscribers.\n\n**4. AI Prompt Libraries ($100–$1,000/month)**\nPackage your best AI prompts into organized libraries and sell them as low-ticket products.\n\n**5. AI Social Media Management ($1,000–$10,000/month)**\nOffer AI-assisted social media services to local businesses. You manage the strategy; AI handles the execution.`
        },
        {
            title: 'The 90-Day Blueprint: $0 → $2,000/month',
            content: `Success with AI passive income requires a structured approach. Here's the blueprint that works:\n\n**Days 1–30: Foundation**\n- Pick ONE income stream\n- Set up your platform (Gumroad, blog, or newsletter)\n- Create your first 5 AI-generated products or posts\n- Target: $0 → First $100\n\n**Days 31–60: Optimization**\n- Analyze what's getting traction\n- Double down on the top 20% of content\n- Add your second revenue source\n- Target: $100 → $500/month\n\n**Days 61–90: Scale**\n- Automate your content pipeline\n- Launch an email list to own your audience\n- Cross-promote between channels\n- Target: $500 → $2,000/month\n\nThe key insight: **consistency beats perfection**. An AI-generated post published today beats a perfect post never published.`
        }
    ],
    sales_page: `# The Complete Guide to AI Passive Income\n\n## Stop Trading Time for Money\n\nYou've been told passive income is hard. That you need years of experience, thousands of followers, or a huge budget to start.\n\n**That was true before AI.**\n\nNow, anyone with a laptop and the right knowledge can build multiple income streams that pay while they sleep — in weeks, not years.\n\n## What You'll Get\n✅ The 5 AI income streams generating $500–$10,000/month\n✅ The exact tools, prompts, and workflows (ready to copy-paste)\n✅ A 90-day blueprint from $0 to your first $2,000/month\n✅ Real examples with actual revenue data\n\n## Price: $29.99`,
    images: {
        'Why AI is the #1 Passive Income Tool': {
            type: 'generated',
            url: 'https://loremflickr.com/400/225/technology,laptop?lock=101',
            prompt: 'Modern workspace with laptop showing AI dashboard'
        },
        '5 Proven AI Income Streams': {
            type: 'generated',
            url: 'https://loremflickr.com/400/225/business,money?lock=202',
            prompt: 'Multiple income streams visualization'
        },
        'The 90-Day Blueprint': {
            type: 'generated',
            url: 'https://loremflickr.com/400/225/success,growth?lock=303',
            prompt: 'Growth chart with milestones'
        }
    }
};

// ── Japanese demo result (CF Pages visitors with JP topic) ──────────────────
const DEMO_RESULT_JA = {
    qa_status: 'PASS',
    research_source: 'demo_preview',
    sections: [
        {
            title: 'ChatGPT副業で月3万円を最速90日で達成する全体像',
            content: `ChatGPT副業で成果を出せる人と出せない人の差は、ツールの知識ではなく「収益化までの設計図」があるかどうかです。今月だけで副業ChatGPT関連のGumroadショップが国内で300件以上新規開設されています（矢野経済研究所 2025年調査より）。

このセクションを読み終えると、自分に合った副業パターンを1つ選んで収益化計画を立てられるようになります。

**副業ChatGPTで稼げる3つのパターン**:
1. デジタル商品販売（電子書籍・テンプレート）— 月1〜10万円
2. コンテンツ代行（ブログ・SNS文章作成）— 月2〜15万円
3. プロンプト設計コンサル — 月5〜30万円

**今すぐできること**:
1. 上記3パターンのうち「今の自分が最速で始められるもの」を1つ選ぶ — 所要時間: 10分
2. Gumroadの無料アカウントを作成する — 所要時間: 5分
3. 最初の商品テーマを1行でメモする — 所要時間: 5分

**よくある失敗と対策**:
- 失敗1: 3パターン全部やろうとして1つも完成しない → 対策: 最初の30日は1つに絞ること
- 失敗2: 完璧な商品を作ろうとして公開できない → 対策: 3,000文字の最小商品からスタートする`
        },
        {
            title: 'ChatGPTで売れる電子書籍を48時間で作る手順',
            content: `国内のGumroad販売者のうち、ChatGPTを使って商品制作期間を1週間以内に短縮したケースは全体の62%に上ります。しかし「ChatGPTに書かせたまま」の商品は返金率が高く、平均レビュー評価が3.1と低い傾向にあります。差を生むのは「編集の質」です。

**48時間タイムライン（実証済みの手順）**:

1日目（24時間）:
1. テーマリサーチ — ChatGPTで需要確認プロンプト実行 — 所要時間: 30分
2. 目次生成 — 「10章構成で書いて」プロンプト — 所要時間: 15分
3. 各章の本文生成 — 1章15分 × 10章 = 150分
4. 事実確認・数値の修正 — 所要時間: 60分

2日目（24時間）:
1. Canvaで表紙デザイン — 所要時間: 45分
2. PDF化とGumroadアップロード — 所要時間: 20分
3. 価格設定（推奨: 980〜1,980円）と販売開始 — 所要時間: 15分

**よくある失敗と対策**:
- 失敗1: 1万字の大作を最初に作ろうとして挫折する → 対策: 最初は5,000字・5章の「ミニガイド」から
- 失敗2: タイトルをChatGPTに決めさせて埋もれる → 対策: Amazon販売ランキング上位のタイトルパターンを参考にする
- 失敗3: 価格を無料にして価値が伝わらない → 対策: 980円以上に設定すること（無料は「価値がない」のシグナル）`
        },
        {
            title: '初売上を3日以内に出すSNSプロモーション戦略',
            content: `Bluesky国内ユーザーは2025年末に350万人を突破し、副業・AI関連コンテンツのエンゲージメント率はTwitter/Xの2.3倍という計測結果が出ています（MMD研究所 2026年1月調査）。適切な投稿をすれば、フォロワー0人でも3日以内の初売上は現実的な目標です。

**初売上3日間プラン（実績ベース）**:

Day 1: 商品公開 + Bluesky告知
1. 「なぜ作ったか」ストーリー投稿（300文字） — 所要時間: 20分
2. 商品の「Before/After」図解を1枚作成・投稿 — 所要時間: 30分
3. 関連ハッシュタグ5つ付けて再投稿 — 所要時間: 10分

Day 2: 無料サンプル配布
1. 商品の「Chapter 1」をまるごと無料公開 — 所要時間: 5分
2. 「全文はこちら→リンク」でGumroadへ誘導 — 所要時間: 5分

Day 3: フォロワーへのDM + 価格引き上げ
1. リポストしてくれた人に御礼DM（テンプレ使用） — 所要時間: 15分
2. 「明日から価格を500円上げます」告知で緊急性を作る — 所要時間: 5分

**よくある失敗と対策**:
- 失敗1: 「いいね」がつかないと諦める → 対策: いいね数は関係ない。1件でも見てもらえれば購入は起きる
- 失敗2: 告知文が「商品紹介」になってしまう → 対策: 「読んだ人の悩みが〇〇日で解決する」というアウトカムで語る
- 失敗3: 1回投稿しただけで「売れなかった」と判断する → 対策: 同じ商品を切り口を変えて最低7回投稿する`
        }
    ],
    sales_page: `# ChatGPT副業 完全実践ガイド — 90日で月3万円を達成する

## あなたの状況に当てはまりませんか？

「ChatGPTで稼げると聞いたけど、何から始めればいいかわからない」
「副業を始めてみたけど、全然収益にならない」
「コンサルに30万円払う余裕はない」

## このガイドの内容

✅ 最速90日で月3万円を達成する3ステップロードマップ
✅ 48時間で電子書籍を完成させるプロンプトテンプレート集
✅ フォロワー0人から初売上を3日以内に出すSNS戦略
✅ 返金ゼロを維持するための品質チェックリスト

## 価格: ¥1,980（期間限定）`,
    images: {},
};

// ── Rewrite preset definitions (8 presets, 2×4 grid) ────────────────────────
const PRESETS = [
    { id: 'casual', label: 'Casual', icon: '😊', tonePreset_ja: 'casual', tonePreset_en: 'conversational' },
    { id: 'expert', label: 'Expert', icon: '🎓', tonePreset_ja: 'professional', tonePreset_en: 'quest' },
    {
        id: 'bullets', label: 'Bullets', icon: '📋',
        instruction_ja: '内容を箇条書きリスト形式に書き直してください。各項目を3語以内の見出しで整理してください。',
        instruction_en: 'Rewrite this as a bulleted list. Use short, punchy 3-5 word headers for each point.'
    },
    {
        id: 'shorter', label: 'Shorten', icon: '✂️',
        instruction_ja: '半分の長さに要約してください。重要な情報は保持してください。',
        instruction_en: 'Shorten this to half its length. Keep the most important points.'
    },
    {
        id: 'niche', label: 'Niche Focus', icon: '🎯',
        instruction_ja: 'より具体的なターゲット読者に特化した内容に書き直してください。専門用語と具体例を使ってください。',
        instruction_en: 'Rewrite this for a highly specific niche audience. Use insider terminology and concrete examples.'
    },
    {
        id: 'data', label: 'Add Data', icon: '📊',
        instruction_ja: 'データや統計情報を追加するプレースホルダーを含めて書き直してください（例：[統計データ], [調査結果]）。',
        instruction_en: 'Rewrite with data placeholders added (e.g., [STAT: X% of users...], [STUDY: Research shows...]). Make it evidence-based.'
    },
    {
        id: 'action', label: 'Actionable', icon: '⚡',
        instruction_ja: '読者がすぐに行動できる形に書き直してください。各段落の最後に具体的な行動指示を入れてください。',
        instruction_en: 'Rewrite as an action-oriented piece. End each section with a specific, immediate call-to-action.'
    },
    {
        id: 'positive', label: 'Positive', icon: '✨',
        instruction_ja: 'ネガティブな表現・失敗事例・問題点の記述を削除し、ポジティブで希望に満ちた内容に書き直してください。',
        instruction_en: 'Remove all negative examples, failure cases, and problem-focused language. Rewrite as purely positive and aspirational.'
    },
];

const _ls = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

const SageOS = () => {
    // ── Phase navigation state ───────────────────────────────────────────────
    const [currentPhase, setCurrentPhase] = useState(() => _ls.get('sage_phase', 1));
    const [activeTopic, setActiveTopic] = useState(() => _ls.get('sage_activeTopic', ''));
    const [showAutomations, setShowAutomations] = useState(false);
    const [showContentManager, setShowContentManager] = useState(false);
    // Self-Test panel
    const [showSelfTest, setShowSelfTest] = useState(false);
    const [selfTestResults, setSelfTestResults] = useState({ tier1: null, tier2: null });
    const [selfTestRunning, setSelfTestRunning] = useState({});
    const [selfTestError, setSelfTestError] = useState(null);

    const [d1Status, setD1Status] = useState('idle');
    const [brakeEnabled, setBrakeEnabled] = useState(false);
    const [stats, setStats] = useState({ cpu: '3%', memory: '2GB', upTime: '144:20:10' });

    // Monetization state
    const [monetizeTopic, setMonetizeTopic] = useState(() => _ls.get('sage_topic', ''));
    const [market, setMarket] = useState('US');
    const [price, setPrice] = useState('$29.99');
    const [lang, setLang] = useState('auto');
    const [monetizeStatus, setMonetizeStatus] = useState('idle');
    const [monetizeResult, setMonetizeResult] = useState(null);
    const [generateProgress, setGenerateProgress] = useState('');
    const [researchCheck, setResearchCheck] = useState({ status: 'idle', file: null });
    const researchDebounce = useRef(null);
    const chatInputRef = useRef(null);
    const nicheResultRef = useRef(null);
    const mainScrollRef = useRef(null);
    const chatBottomRef = useRef(null);

    const CREATE_PLACEHOLDERS = [
        "e.g. Beginner's guide to passive income with AI",
        "e.g. 10-minute morning routine for busy moms",
        "e.g. How to start freelancing with no experience",
    ];
    const [placeholderIdx, setPlaceholderIdx] = useState(0);

    // Review & Edit state
    const [generateData, setGenerateData] = useState(null);
    const [editedSections, setEditedSections] = useState([]);
    const [editedSalesPage, setEditedSalesPage] = useState('');
    const [editedCaptions, setEditedCaptions] = useState([]);
    const [globalInstruction, setGlobalInstruction] = useState('');
    const [sectionInstructions, setSectionInstructions] = useState({});
    const [rewritingIdx, setRewritingIdx] = useState(null);
    const [globalRewriting, setGlobalRewriting] = useState(false);
    const [rewritingPreset, setRewritingPreset] = useState(null); // preset.id currently running
    const [presetResults, setPresetResults] = useState({}); // { [presetId]: 'success'|'error' }
    const [rewriteError, setRewriteError] = useState(null);
    const [rewriteEmptyIdx, setRewriteEmptyIdx] = useState(null); // shake effect for empty instruction
    const [expandedSection, setExpandedSection] = useState(null);
    const [nicheValidation, setNicheValidation] = useState({ status: 'idle', data: null });
    const [isDemo, setIsDemo] = useState(false);
    const [quickPreview, setQuickPreview] = useState(null); // { headline, buyer, price, hooks[] }
    const [progressPercent, setProgressPercent] = useState(0);
    const [copyStatus, setCopyStatus] = useState('idle'); // 'idle'|'success'|'error'
    const [copyToast, setCopyToast] = useState(null); // null | 'success' | 'error'

    // Content tabs & publish
    const [contentTab, setContentTab] = useState('blog');
    const [imageRegenStatus, setImageRegenStatus] = useState('idle');
    const [publishChecklist, setPublishChecklist] = useState({ bluesky: 'idle', instagram: 'idle', copied: false });

    // Automations
    const [automationLoading, setAutomationLoading] = useState(new Set());
    const [automations, setAutomations] = useState([
        { id: 'bluesky', name: 'Bluesky Daily Post', icon: '🦋', active: true, schedule: 'Daily · UTC 00:00', lastRun: 'Today ✓' },
        { id: 'instagram', name: 'Instagram Daily Post', icon: '📸', active: true, schedule: 'Daily · UTC 00:00', lastRun: 'Today ✓' },
        { id: 'blog', name: 'Blog Weekly Post', icon: '📝', active: false, schedule: 'Weekly · Mon 09:00', lastRun: 'Not connected' },
    ]);

    const [brainStats, setBrainStats] = useState({ learned_patterns: 0, accuracy: 0 });
    const [monetizationStats, setMonetizationStats] = useState({ qa_pass: 0, qa_warn: 0, safety: 0 });

    // Chat state
    const [messages, setMessages] = useState([
        { id: 1, role: 'system', content: 'Hi. What would you like to create today?' }
    ]);
    const [inputValue, setInputValue] = useState('');

    // Quick Monetize Preview — local heuristic, no API needed
    const buildQuickPreview = (topic) => {
        if (!topic || topic.trim().length < 2) return null;
        const isJa = /[\u3000-\u9fff]/.test(topic);
        const hooks = isJa
            ? [`「${topic}」で月5万円稼ぐ人がやっている3つのこと`, `今すぐ始められる！${topic}で副収入を作る最短ルート`, `失敗しない${topic}の完全マップ`]
            : [`The exact ${topic} system generating passive income in 2026`, `3 steps to your first $500 with ${topic}`, `Why most people fail at ${topic} — and how to be different`];
        return {
            headline: isJa ? `「${topic}」で結果を出すための完全ガイド` : `The Complete ${topic} Blueprint`,
            buyer: isJa ? '副業・収益化を目指す社会人' : 'Solopreneurs & creators looking for their first income stream',
            price: price || '$29.99',
            hooks,
        };
    };

    const fetchAutomations = async () => {
        try {
            const res = await api.get('/api/automations');
            const data = Array.isArray(res.data) ? res.data : res.data?.automations;
            if (data?.length) setAutomations(data);
        } catch { /* use defaults */ }
    };

    const handleToggle = async (id, currentActive) => {
        setAutomationLoading(prev => new Set([...prev, id]));
        try {
            await api.post('/api/automations/toggle', { id, active: !currentActive });
            await fetchAutomations();
        } catch (err) {
            setAutomations(prev => prev.map(a =>
                a.id === id ? { ...a, active: !currentActive } : a
            ));
        } finally {
            setAutomationLoading(prev => { const n = new Set(prev); n.delete(id); return n; });
        }
    };

    useEffect(() => {
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
        fetchAutomations();
        const timer = setInterval(fetchSageMetrics, 10000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    useEffect(() => {
        const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % CREATE_PLACEHOLDERS.length), 3000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setQuickPreview(buildQuickPreview(monetizeTopic)), 600);
        return () => clearTimeout(t);
    }, [monetizeTopic, price]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll chat to bottom when new messages are added
    useEffect(() => {
        if (chatBottomRef.current) {
            chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Persist phase + topic to localStorage so refresh restores state
    useEffect(() => { _ls.set('sage_phase', currentPhase); }, [currentPhase]);
    useEffect(() => { _ls.set('sage_topic', monetizeTopic); }, [monetizeTopic]);
    useEffect(() => { _ls.set('sage_activeTopic', activeTopic); }, [activeTopic]);

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

    const handleD1ForTopic = async () => {
        setMonetizeStatus('running_d1');
        try {
            await api.post('/api/d1/generate', { topic: monetizeTopic });
            const res = await api.get(`/api/research/check?topic=${encodeURIComponent(monetizeTopic)}`);
            setResearchCheck({
                status: res.data?.has_research ? 'found' : 'missing',
                file: res.data?.file || null
            });
            await runMonetizePipeline();
        } catch (e) {
            setMonetizeStatus('error');
            setMonetizeResult('D1リサーチに失敗しました: ' + (e.message || ''));
            // エラーは自動リセットしない
        }
    };

    const handleRunResearch = async () => {
        const topic = monetizeTopic || inputValue;
        if (!topic.trim()) {
            chatInputRef.current?.focus();
            setMessages(prev => [...prev, { id: Date.now(), role: 'sage', content: '🔍 リサーチするトピックを入力してください。' }]);
            return;
        }
        setMonetizeStatus('running_d1');
        try {
            const res = await api.post('/api/research/run', { topic });
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'sage',
                content: res.data.summary ?? 'リサーチ完了！結果を output/ に保存しました。'
            }]);
            const check = await api.get(`/api/research/check?topic=${encodeURIComponent(topic)}`);
            setResearchCheck({
                status: check.data?.has_research ? 'found' : 'missing',
                file: check.data?.file || null
            });
            setMonetizeStatus('idle');
        } catch (e) {
            setMonetizeStatus('idle');
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'sage',
                content: `リサーチエラー: ${e?.response?.data?.error || e.message}`
            }]);
        }
    };

    const toggleBrake = () => { setBrakeEnabled(prev => !prev); };

    const IS_OWNER = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const runMonetizePipeline = async (topicOverride) => {
        const topicToUse = topicOverride || monetizeTopic;
        setMonetizeStatus('running');
        setMonetizeResult(null);

        const _progressSteps = [
            [0,      '🔍 Analyzing your topic...',             5],
            [4000,   '🧠 Building product structure...',       18],
            [12000,  '✍️ Generating content...',               40],
            [30000,  '💡 Refining with market data...',        62],
            [60000,  '⏳ Still working (LLM processing)...',   80],
            [100000, '🔥 Almost there...',                     93],
            [130000, '🔥 Almost there... (LLM slow today)',    94],
            [155000, '⏳ Finalizing your product...',          95],
            [180000, '🔥 Just wrapping up, hang tight!',      96],
            [210000, '⏳ Nearly done...',                      97],
        ];
        const _progressTimers = _progressSteps.map(([delay, msg, pct]) =>
            setTimeout(() => { setGenerateProgress(msg); setProgressPercent(pct); }, delay)
        );

        if (!IS_OWNER) {
            await new Promise(r => setTimeout(r, 1200));
            const isJaTopic = !!(topicToUse || '').match(/[\u3000-\u9fff]/);
            const courseData = isJaTopic ? { ...DEMO_RESULT_JA } : { ...DEMO_RESULT };
            setIsDemo(true);
            setGenerateData(courseData);
            setEditedSections((courseData.sections || []).map(s => ({ ...s })));
            setEditedSalesPage(courseData.sales_page || '');
            setEditedCaptions((courseData.sections || []).slice(0, 3).map(s => s.content?.slice(0, 280) || ''));
            setSectionInstructions({});
            setExpandedSection(0);
            setContentTab('blog');
            setPublishChecklist({ bluesky: 'idle', instagram: 'idle', copied: false });
            _progressTimers.forEach(clearTimeout);
            setGenerateProgress('');
            setMonetizeStatus('review');
            return;
        }

        try {
            // ── Step 1: Generate product plan (fast, ~2s) ───────────────────
            const planRes = await api.post('/api/productize', { topic: topicToUse, market, price, language: lang });
            const plan = planRes?.data;
            if (!plan || plan.status === 'error') throw new Error(plan?.error || 'Plan failed');

            // ── Step 2: Start background job (returns immediately) ──────────
            // Uses short timeout — CF Pages Function only needs to start the job (<30s)
            const startRes = await api.post('/api/jobs/pipeline/start', {
                type: 'COURSE',
                topic: topicToUse,
                plan: plan.plan,
                language: lang,
                market,
                price
            });
            const jobId = startRes?.data?.job_id;
            if (!jobId) throw new Error('Failed to start background job');

            // ── Step 3: Poll for result every 3 seconds ─────────────────────
            const MAX_POLLS = 120; // 6 minutes max
            let polls = 0;
            const courseData = await new Promise((resolve, reject) => {
                const pollInterval = setInterval(async () => {
                    polls++;
                    if (polls > MAX_POLLS) {
                        clearInterval(pollInterval);
                        reject(new Error('Job timeout (6 min) — LLM did not complete. Please try again.'));
                        return;
                    }
                    try {
                        const statusRes = await api.get(`/api/jobs/${jobId}/status`);
                        const { status, result, error } = statusRes.data;
                        if (status === 'done') {
                            clearInterval(pollInterval);
                            resolve(result);
                        } else if (status === 'error') {
                            clearInterval(pollInterval);
                            reject(new Error(error || 'Pipeline failed'));
                        }
                        // 'running' → keep polling
                    } catch (pollErr) {
                        // Network blip — keep polling until MAX_POLLS
                    }
                }, 3000);
            });

            if (!courseData || courseData.status === 'error') throw new Error(courseData?.error || 'Execute failed');

            setIsDemo(false);
            setGenerateData(courseData);
            setEditedSections((courseData.sections || []).map(s => ({ ...s })));
            setEditedSalesPage(courseData.sales_page || '');
            // Use pipeline-generated SNS captions (proper marketing copy) when available
            const snsCaptions = courseData.whop_captions
                ? [courseData.whop_captions.bluesky, courseData.whop_captions.instagram, ...(courseData.sns_captions || []).slice(2)]
                : courseData.sns_captions
                    || (courseData.sections || []).slice(0, 3).map(s => s.content?.slice(0, 280) || '');
            setEditedCaptions(snsCaptions);
            setSectionInstructions({});
            setExpandedSection(0);
            setContentTab('blog');
            setPublishChecklist({ bluesky: 'idle', instagram: 'idle', copied: false });
            _progressTimers.forEach(clearTimeout);
            setGenerateProgress('');
            setProgressPercent(100);
            setMonetizeStatus('review');
        } catch (e) {
            _progressTimers.forEach(clearTimeout);
            setGenerateProgress('');
            setProgressPercent(0);
            setMonetizeResult(e.message || 'Pipeline failed');
            setMonetizeStatus('error');
            // エラーは自動リセットしない — ユーザーが明示的にRetryするまで表示
        }
    };

    const handleRewriteSection = async (idx, instructionOverride) => {
        const instruction = instructionOverride || sectionInstructions[idx] || '';
        if (!instruction.trim()) {
            setRewriteEmptyIdx(idx);
            setTimeout(() => setRewriteEmptyIdx(null), 600);
            return;
        }
        setRewritingIdx(idx);
        setRewriteError(null);
        try {
            const res = await apiRewrite.post('/api/productize/rewrite', {
                content: editedSections[idx].content,
                instruction,
                language: lang === 'auto' ? (monetizeTopic.match(/[\u3000-\u9fff]/) ? 'ja' : 'en') : lang
            });
            if (res.data?.status === 'success') {
                setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, content: res.data.rewritten } : s));
                if (!instructionOverride) setSectionInstructions(prev => ({ ...prev, [idx]: '' }));
            } else {
                setRewriteError(`Rewrite failed: ${res.data?.error || 'Unknown error'}`);
            }
        } catch (e) {
            const isTimeout = e?.code === 'ECONNABORTED' || e?.message?.includes('timeout');
            setRewriteError(isTimeout ? 'Timeout: LLM is taking too long. Please try again.' : `Rewrite failed: ${e?.message || 'Unknown error'}`);
        } finally {
            setRewritingIdx(null);
        }
    };

    const handleRewriteAll = async (overrideInstruction, tonePreset) => {
        const instruction = overrideInstruction || globalInstruction;
        if (!tonePreset && !instruction.trim()) return;
        if (overrideInstruction && !tonePreset) setGlobalInstruction(overrideInstruction);
        setGlobalRewriting(true);
        setRewriteError(null);
        try {
            const resolvedLang = lang === 'auto' ? (monetizeTopic.match(/[\u3000-\u9fff]/) ? 'ja' : 'en') : lang;
            const rewritePayload = (content) => tonePreset
                ? { content, tone_preset: tonePreset, instruction: '', language: resolvedLang }
                : { content, instruction, language: resolvedLang };

            // Sequential rewrite to avoid Groq rate limits (parallel causes 429 → timeout)
            const sectionResults = [];
            for (const s of editedSections) {
                try {
                    const r = await apiRewrite.post('/api/productize/rewrite', rewritePayload(s.content));
                    sectionResults.push({ status: 'fulfilled', value: r });
                } catch (err) {
                    sectionResults.push({ status: 'rejected', reason: err });
                }
            }
            const salesPageRes = editedSalesPage
                ? await apiRewrite.post('/api/productize/rewrite', rewritePayload(editedSalesPage)).catch(() => null)
                : null;

            setEditedSections(prev => prev.map((s, i) => {
                const r = sectionResults[i];
                return r?.status === 'fulfilled' && r.value?.data?.status === 'success'
                    ? { ...s, content: r.value.data.rewritten }
                    : s;
            }));
            if (salesPageRes?.data?.status === 'success') setEditedSalesPage(salesPageRes.data.rewritten);

            const failCount = sectionResults.filter(r => r.status === 'rejected').length;
            if (failCount > 0) {
                setRewriteError(`${failCount} section(s) failed to rewrite. Others were updated.`);
            }
            setGlobalInstruction('');
        } catch (e) {
            const isTimeout = e?.code === 'ECONNABORTED' || e?.message?.includes('timeout');
            const msg = isTimeout
                ? 'タイムアウト: LLMの応答が遅れています（30秒）。もう一度お試しください。'
                : (e?.response?.data?.error || e?.message || 'Rewrite failed') + ' — Please try again.';
            setRewriteError(msg);
            console.error('Global rewrite failed', e);
            throw e; // let applyPreset catch it for per-button error state
        } finally {
            setGlobalRewriting(false);
        }
    };

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

                // ── Whop sync (fire-and-forget) ──────────────────────────
                // Push edited content back to Whop product page.
                // Non-fatal: finalize already succeeded regardless of Whop result.
                const whopData = generateData?.whop;
                const productId = whopData?.product_id;
                if (productId && productId !== 'prod_DRY_RUN') {
                    const updatedDesc = editedSalesPage ||
                        editedSections.map(s => `## ${s.title}\n${s.content}`).join('\n\n').slice(0, 800);
                    api.post('/api/productize/update-whop', {
                        product_id: productId,
                        topic: monetizeTopic,
                        description: updatedDesc,
                    }).catch(() => {}); // swallow — background update
                } else if (monetizeTopic) {
                    // No product_id in memory — let backend look up registry by topic
                    const updatedDesc = editedSalesPage ||
                        editedSections.map(s => `## ${s.title}\n${s.content}`).join('\n\n').slice(0, 800);
                    api.post('/api/productize/update-whop', {
                        topic: monetizeTopic,
                        description: updatedDesc,
                    }).catch(() => {});
                }
            } else {
                throw new Error(res.data?.error || 'Finalize failed');
            }
        } catch (e) {
            setMonetizeResult(e.message);
            setMonetizeStatus('error');
            // エラーは自動消去しない — ユーザーが✕閉じるで明示的に閉じる
        }
    };

    const handleRegenImages = async () => {
        setImageRegenStatus('running');
        try {
            const res = await api.post('/api/productize/regenerate_images', {
                sections: editedSections,
                topic: monetizeTopic,
                custom_instruction: globalInstruction || ''
            });
            if (res.data?.status === 'success' && res.data.images) {
                setGenerateData(prev => ({ ...prev, images: res.data.images }));
                setImageRegenStatus('done');
            } else {
                setImageRegenStatus('error');
            }
        } catch (e) {
            console.error('Image regen failed', e);
            setImageRegenStatus('error');
        } finally {
            setTimeout(() => setImageRegenStatus('idle'), 3000);
        }
    };

    const handlePublishBluesky = async () => {
        setPublishChecklist(p => ({ ...p, bluesky: 'running' }));
        try {
            const caption = editedCaptions[0] || (editedSections[0]?.content?.slice(0, 280) ?? '');
            await api.post('/api/bluesky/post', { content: caption });
            setPublishChecklist(p => ({ ...p, bluesky: 'done' }));
        } catch { setPublishChecklist(p => ({ ...p, bluesky: 'error' })); }
    };

    const handlePublishInstagram = async () => {
        setPublishChecklist(p => ({ ...p, instagram: 'running' }));
        try {
            const imageEntries = generateData?.images ? Object.entries(generateData.images) : [];
            const firstImageUrl = imageEntries.length > 0 ? imageEntries[0][1]?.url : null;
            if (!firstImageUrl) throw new Error('No image available');
            const caption = editedCaptions[0] || (editedSections[0]?.content?.slice(0, 280) ?? '');
            await api.post('/api/instagram/post', { image_url: firstImageUrl, caption });
            setPublishChecklist(p => ({ ...p, instagram: 'done' }));
        } catch { setPublishChecklist(p => ({ ...p, instagram: 'error' })); }
    };

    const handleCopyBlogPost = async () => {
        const text = editedSections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
        let success = false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                success = true;
            } else {
                const el = document.createElement('textarea');
                el.value = text;
                el.style.position = 'fixed';
                el.style.opacity = '0';
                document.body.appendChild(el);
                el.select();
                success = document.execCommand('copy');
                document.body.removeChild(el);
            }
        } catch (e) { success = false; }
        setCopyStatus(success ? 'success' : 'error');
        setCopyToast(success ? 'success' : 'error');
        setPublishChecklist(p => ({ ...p, copied: success }));
        setTimeout(() => {
            setCopyStatus('idle');
            setCopyToast(null);
            setPublishChecklist(p => ({ ...p, copied: false }));
        }, 3500);
    };

    const handleStartNew = () => {
        setIsDemo(false);
        setMonetizeStatus('idle');
        setGenerateData(null);
        setMonetizeResult(null);
        setContentTab('blog');
        setEditedCaptions([]);
        setPublishChecklist({ bluesky: 'idle', instagram: 'idle', copied: false });
        _ls.del('sage_phase');
        _ls.del('sage_topic');
        _ls.del('sage_activeTopic');
    };

    const analyzeContentQuality = (content) => {
        if (!content) return { score: 0, badges: [] };
        const badges = [];
        let score = 0;
        if (/\d+/.test(content)) { score += 25; badges.push({ label: 'Numbers', color: 'blue' }); }
        if (/\d+\.\s|今すぐ|ステップ|手順|Take Action|Step \d|Action \d/.test(content)) { score += 25; badges.push({ label: 'Action', color: 'green' }); }
        if (/失敗|ミス|注意|間違い|エラー|Mistake|Common Error|Warning|Caution|Avoid/.test(content)) { score += 25; badges.push({ label: 'Mistakes', color: 'orange' }); }
        if (/分間|時間|円|%|km|kg|回|分|秒|minutes|hours|billion|million|\$\d/.test(content)) { score += 25; badges.push({ label: 'Specific', color: 'purple' }); }
        return { score, badges };
    };

    // Generate targeted auto-improve instruction based on which Q-criteria are missing
    const getAutoImproveInstruction = (content, isJa) => {
        const q = analyzeContentQuality(content);
        const met = new Set(q.badges.map(b => b.label));
        const missing = [];
        if (!met.has('Numbers'))  missing.push(isJa ? '具体的な数字や統計データ' : 'specific numbers and statistics');
        if (!met.has('Action'))   missing.push(isJa ? '番号付きの行動ステップ（1. 2. 3. 形式）' : 'numbered action steps (1. 2. 3.)');
        if (!met.has('Mistakes')) missing.push(isJa ? 'よくある失敗例と対策（失敗→対策の形式）' : 'common mistakes and fixes');
        if (!met.has('Specific')) missing.push(isJa ? '具体的な数値（所要時間・金額・割合など）' : 'specific measurements (minutes, %, $)');
        if (missing.length === 0) return isJa
            ? '内容をより詳しく実践的に書き直してください。最低600文字以上。'
            : 'Expand with more detail and practical examples. Minimum 600 characters.';
        return isJa
            ? `以下を追加して書き直してください: ${missing.join('、')}。最低600文字以上。`
            : `Rewrite adding: ${missing.join(', ')}. Minimum 600 characters.`;
    };

    const handleNicheValidate = async (topicOverride) => {
        const topicToUse = topicOverride || monetizeTopic;
        if (!topicToUse.trim()) return;
        setNicheValidation({ status: 'running', data: null });
        try {
            const res = await api.post('/api/niche/validate', { topic: topicToUse });
            if (res.data?.status === 'rate_limited') {
                setNicheValidation({ status: 'rate_limited', data: res.data });
            } else {
                setNicheValidation({ status: 'done', data: res.data });
                setTimeout(() => nicheResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
        } catch (e) {
            if (e?.response?.status === 429) {
                setNicheValidation({ status: 'rate_limited', data: e.response?.data });
            } else {
                setNicheValidation({ status: 'error', data: null });
            }
        }
    };

    const handleMonetize = async (topicOverride) => {
        const topicToUse = topicOverride || monetizeTopic;
        if (!topicToUse) return;
        if (researchCheck.status === 'missing') {
            setMonetizeStatus('needs_research');
            return;
        }
        await runMonetizePipeline(topicToUse);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newMsg = { id: Date.now(), role: 'user', content: inputValue };
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');

        // CF Pages (non-owner): use demo response — backend not accessible via static ngrok URL
        if (!IS_OWNER) {
            const isJa = newMsg.content.match(/[\u3000-\u9fff]/);
            const demoContent = isJa
                ? `「${newMsg.content.slice(0, 40)}」は面白いテーマですね！Sage AIのフルアクセスで実際のAI会話・市場調査・商品生成が使えます。下の「Get Full Access」から始めてみてください。`
                : `"${newMsg.content.slice(0, 50)}" sounds like a great topic! Get Full Access to unlock real AI conversation, market research, and product generation.`;
            setTimeout(() => setMessages(prev => [...prev, { id: Date.now() + 1, role: 'sage', content: demoContent }]), 700);
            return;
        }

        try {
            const res = await api.post('/api/chat', { message: newMsg.content });
            const reply = { id: Date.now() + 1, role: 'sage', content: res.data.response || 'No response.' };
            setMessages(prev => {
                const next = [...prev, reply];
                const sageCount = next.filter(m => m.role === 'sage').length;
                if (sageCount >= 3 && !next.some(m => m.role === 'upgrade_banner')) {
                    return [...next, { id: Date.now() + 2, role: 'upgrade_banner', content: '' }];
                }
                return next;
            });
        } catch (e) {
            const errMsg = e?.response?.data?.error || e?.message || 'Backend unreachable';
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'sage',
                content: `${errMsg} — Make sure Flask is running on port 8080.`
            }]);
        }
    };

    // ── Self-Test helpers ────────────────────────────────────────────────────
    const runSelfTestItem = async (tier, checkName = null) => {
        const key = checkName || `t${tier}`;
        setSelfTestError(null);
        setSelfTestRunning(p => ({ ...p, [key]: true }));
        try {
            const params = checkName
                ? { tier: String(tier), check: checkName }
                : { tier: String(tier) };
            const res = await api.get('/api/system/self_test', { params, timeout: 30000 });
            if (checkName) {
                const check = res.data.check;
                setSelfTestResults(prev => {
                    const tierKey = `tier${tier}`;
                    const tests = (prev[tierKey]?.tests || []).map(t =>
                        t.name === checkName ? check : t
                    );
                    return { ...prev, [tierKey]: { ...(prev[tierKey] || {}), tests } };
                });
            } else {
                setSelfTestResults(prev => ({ ...prev, [`tier${tier}`]: res.data.report }));
            }
        } catch (e) {
            console.error('[SelfTest]', e);
            setSelfTestError(e?.response?.data?.error || e?.message || 'Backend unreachable');
        } finally {
            setSelfTestRunning(p => { const n = { ...p }; delete n[key]; return n; });
        }
    };
    const runAllSelfTests = async () => {
        setSelfTestError(null);
        setSelfTestRunning({ all: true });
        try {
            const res = await api.get('/api/system/self_test', { params: { tier: 'all' }, timeout: 60000 });
            const report = res.data.report;
            setSelfTestResults({ tier1: report.tier1, tier2: report.tier2 });
        } catch (e) {
            console.error('[SelfTest]', e);
            setSelfTestError(e?.response?.data?.error || e?.message || 'Backend unreachable');
        } finally {
            setSelfTestRunning({});
        }
    };

    // ── Phase helpers ────────────────────────────────────────────────────────
    const goToPhase = (phase, topic) => {
        setCurrentPhase(phase);
        if (topic !== undefined && topic !== null && topic !== '') {
            setActiveTopic(topic);
            setMonetizeTopic(topic);
        }
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    };

    const extractTopic = (chatHistory) => {
        const lastUserMsg = chatHistory.filter(m => m.role === 'user').slice(-1)[0];
        return lastUserMsg?.content || '';
    };

    const applyPreset = async (preset) => {
        if (rewritingPreset || globalRewriting) return;
        setRewritingPreset(preset.id);
        setPresetResults(prev => { const n = { ...prev }; delete n[preset.id]; return n; });
        const isJa = lang === 'ja' || (lang === 'auto' && monetizeTopic.match(/[\u3000-\u9fff]/));
        let tonePreset, instruction;
        if (isJa && preset.tonePreset_ja) tonePreset = preset.tonePreset_ja;
        else if (!isJa && preset.tonePreset_en) tonePreset = preset.tonePreset_en;
        else instruction = isJa ? preset.instruction_ja : preset.instruction_en;
        try {
            await handleRewriteAll(instruction, tonePreset);
            setPresetResults(prev => ({ ...prev, [preset.id]: 'success' }));
        } catch {
            setPresetResults(prev => ({ ...prev, [preset.id]: 'error' }));
        } finally {
            setRewritingPreset(null);
            setTimeout(() => setPresetResults(prev => { const n = { ...prev }; delete n[preset.id]; return n; }), 3000);
        }
    };

    const convertToProduct = (_content) => {
        // Use the topic already entered in the Topic/Idea field;
        // fall back to the last user message — never dump the full Sage response as topic
        const topic = monetizeTopic.trim() || extractTopic(messages);
        setMonetizeTopic(topic);
        goToPhase(2, topic);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] font-sans selection:bg-blue-500/30 overflow-hidden flex" translate="no">

            {/* ── Copy Toast (fixed overlay) ──────────────────────────────── */}
            {copyToast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold pointer-events-none transition-all
                    ${copyToast === 'success'
                        ? 'bg-emerald-600 border-emerald-400/60 text-white shadow-emerald-900/50'
                        : 'bg-red-700 border-red-500/60 text-white shadow-red-900/50'}`}>
                    <span className="text-base">{copyToast === 'success' ? '✅' : '❌'}</span>
                    <span>{copyToast === 'success' ? 'Blog post copied to clipboard!' : 'Copy failed — please try again'}</span>
                </div>
            )}

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <div className="w-64 bg-[var(--c-surface)] border-r border-[var(--c-border)] flex flex-col p-4 z-10 shrink-0 shadow-sm">
                <div className="text-xl font-bold tracking-tighter mb-8 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" translate="no"></span>
                    <span>SAGE COCKPIT</span>
                </div>

                <div className="space-y-2 flex-grow">
                    <Link
                        to="/"
                        className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all hover:bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)]"
                    >
                        <FiHome /> <span>Landing Page</span>
                    </Link>

                    {/* Phase navigation (visible in phases 2-4) */}
                    {currentPhase >= 2 && (
                        <div className="mt-2 space-y-1">
                            <div className="text-xs text-[var(--c-subtle)] uppercase tracking-widest px-2 mb-2">Phases</div>
                            {[
                                { id: 1, label: 'TALK', icon: '💬' },
                                { id: 2, label: 'CREATE', icon: '⚡' },
                                { id: 3, label: 'REFINE', icon: '✏️' },
                                { id: 4, label: 'PUBLISH', icon: '🚀' },
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => goToPhase(p.id)}
                                    disabled={currentPhase < p.id}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all text-sm ${currentPhase === p.id
                                        ? 'bg-purple-600 text-white'
                                        : currentPhase > p.id
                                            ? 'text-emerald-400 hover:bg-[var(--c-raised)]'
                                            : 'text-[var(--c-subtle)] cursor-not-allowed'
                                        }`}
                                >
                                    <span>{p.icon}</span>
                                    <span>{p.label}</span>
                                    {currentPhase > p.id && <FiCheck className="ml-auto text-xs" />}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Automations toggle */}
                    <button
                        onClick={() => { setShowAutomations(p => !p); setShowSelfTest(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${showAutomations ? 'bg-[var(--c-raised)] text-[var(--c-text)]' : 'hover:bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)]'}`}
                    >
                        <FiActivity /> <span>Automations</span>
                    </button>

                    {/* Self-Test toggle */}
                    <button
                        onClick={() => { setShowSelfTest(p => !p); setShowAutomations(false); setShowContentManager(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${showSelfTest ? 'bg-[var(--c-raised)] text-[var(--c-text)]' : 'hover:bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)]'}`}
                    >
                        <FiCpu /> <span>Self-Test</span>
                    </button>

                    {/* Content Manager toggle */}
                    <button
                        onClick={() => { setShowContentManager(p => !p); setShowAutomations(false); setShowSelfTest(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${showContentManager ? 'bg-[var(--c-raised)] text-[var(--c-text)]' : 'hover:bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)]'}`}
                    >
                        <FiFolder /> <span>Content</span>
                    </button>

                    {/* Whop member link */}
                    <a
                        href="https://whop.com/joined/segeai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all hover:bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)]"
                    >
                        <FiShoppingCart /> <span>Whop Members</span>
                    </a>
                </div>

                {/* Brake Widget */}
                <div className="mt-auto p-4 bg-[var(--c-raised)] border border-[var(--c-border)] rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-[var(--c-muted)] flex items-center gap-2"><FiShield /> <span>SAGE BRAKE</span></span>
                        <div className={`w-2 h-2 rounded-full ${brakeEnabled ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    </div>
                    <button
                        onClick={toggleBrake}
                        className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition-all flex justify-center items-center gap-2 ${brakeEnabled ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-[var(--c-raised)] hover:bg-[var(--c-border)] text-[var(--c-text)] border border-[var(--c-border)]'}`}
                    >
                        {brakeEnabled ? <><FiXCircle /> <span>BRAKE ACTIVE</span></> : <><FiCheckCircle /> <span>● Online</span></>}
                    </button>
                </div>
            </div>

            {/* ── Main Content ─────────────────────────────────────────────── */}
            <div ref={mainScrollRef} className="flex-1 bg-[var(--c-bg)] overflow-y-auto" translate="no">

                {/* Automations Panel */}
                {showAutomations && (
                    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black" style={{ color: '#1A56DB' }}>Active Automations</h2>
                            <button onClick={() => setShowAutomations(false)} className="text-[var(--c-muted)] hover:text-[var(--c-text)] text-sm px-3 py-1 bg-[var(--c-raised)] rounded-lg">✕ Close</button>
                        </div>
                        <div className="p-5 bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-bold text-[var(--c-text)] flex items-center gap-2">⚡ Active Automations</div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {automations.map(a => (
                                    <div key={a.id} className={`p-4 rounded-xl border transition-all ${a.active ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-[var(--c-raised)] border-[var(--c-border)]'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xl">{a.icon}</span>
                                            <div className={`w-2 h-2 rounded-full ${a.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
                                        </div>
                                        <div className="text-sm font-semibold text-[var(--c-text)] mb-0.5">{a.name}</div>
                                        <div className="text-xs text-[var(--c-subtle)]">{a.schedule}</div>
                                        <div className="text-xs text-[var(--c-subtle)] mb-3">{a.lastRun || 'Never'}</div>
                                        <button
                                            onClick={() => handleToggle(a.id, a.active)}
                                            disabled={automationLoading.has(a.id)}
                                            className={`w-full text-xs py-1.5 rounded-lg transition-all ${automationLoading.has(a.id) ? 'opacity-50 cursor-not-allowed' : ''} ${a.active ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400'}`}>
                                            {automationLoading.has(a.id) ? '…' : (a.active ? 'Stop' : 'Start')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Motion.div>
                )}

                {/* Self-Test Panel */}
                {/* old Self-Test panel removed — new modal rendered at root level below */}

                {/* Content Manager Panel */}
                {showContentManager && <ContentManager />}

                {/* Phase Pages */}
                {!showAutomations && !showSelfTest && !showContentManager && (
                    <>
                        {/* PhaseStepperBar (phases 2-4) */}
                        {currentPhase >= 2 && (
                            <PhaseStepperBar currentPhase={currentPhase} topic={activeTopic} onPhaseClick={goToPhase} />
                        )}

                        {/* ════════════════════════════════════════════════════
                            Phase 1: TALK
                        ════════════════════════════════════════════════════ */}
                        {currentPhase === 1 && (
                            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="max-w-3xl mx-auto py-8 px-4 flex flex-col" style={{ minHeight: 'calc(100vh - 0px)' }}>
                                <div className="text-center mb-8">
                                    <div className="text-5xl mb-4">🤖</div>
                                    <h1 className="text-3xl font-black mb-2" style={{ background: 'linear-gradient(135deg, #0284C7 0%, #1A56DB 50%, #1E40AF 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hi, I'm Sage.</h1>
                                    <p className="text-[var(--c-muted)]">Tell me your idea — I'll help you build a full product around it.</p>
                                </div>

                                <div className="flex flex-col bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl overflow-hidden" style={{ minHeight: '480px' }}>
                                    <div className="flex-1 overflow-y-auto space-y-4 p-4 no-scrollbar">
                                        {messages.map(msg =>
                                            msg.role === 'upgrade_banner' ? (
                                                <div key={msg.id} className="flex justify-center my-2">
                                                    <div className="w-full max-w-xl p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 text-center">
                                                        <div className="text-sm font-bold text-[var(--c-text)] mb-1">🔒 Free demo limit reached (3 messages)</div>
                                                        <p className="text-xs text-[var(--c-muted)] mb-3">Upgrade to unlock unlimited Sage conversations, automation control, and product generation.</p>
                                                        <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all">
                                                            💎 Get Full Access on Whop →
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                                        ? 'bg-blue-600 rounded-tr-none'
                                                        : msg.role === 'system'
                                                            ? 'bg-[var(--c-raised)] border border-[var(--c-border)] text-[var(--c-muted)] text-center mx-auto text-xs font-mono uppercase'
                                                            : 'bg-[var(--c-raised)] rounded-tl-none border border-[var(--c-border)]'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                    {/* Action buttons after last Sage reply */}
                                                    {msg.role === 'sage' && msg.id === messages.filter(m => m.role === 'sage').slice(-1)[0]?.id && (
                                                        <div className="flex gap-2 flex-wrap mt-3 ml-1">
                                                            <button
                                                                onClick={() => {
                                                                    const topic = monetizeTopic.trim() || extractTopic(messages);
                                                                    if (topic) setMonetizeTopic(topic);
                                                                    goToPhase(2, topic);
                                                                    runMonetizePipeline(topic);
                                                                }}
                                                                className="text-sm px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-xl flex items-center gap-2 transition-all"
                                                            >
                                                                🚀 Generate Content with This Topic
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const topic = monetizeTopic.trim() || extractTopic(messages);
                                                                    if (topic) setMonetizeTopic(topic);
                                                                    goToPhase(2, topic);
                                                                    handleNicheValidate(topic);
                                                                }}
                                                                className="text-sm px-4 py-2 bg-white/10 hover:bg-[var(--c-border)] text-[var(--c-text)] font-medium rounded-xl flex items-center gap-2 transition-all"
                                                            >
                                                                📊 Validate Niche First
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    chatInputRef.current?.focus();
                                                                    chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                }}
                                                                className="text-sm px-4 py-2 bg-[var(--c-raised)] hover:bg-[var(--c-raised)] text-[var(--c-muted)] rounded-xl flex items-center gap-2 transition-all"
                                                            >
                                                                💬 もう少し話す
                                                            </button>
                                                        </div>
                                                    )}
                                                    {/* Productize button for Sage messages */}
                                                    {msg.role === 'sage' && msg.id !== messages.filter(m => m.role === 'sage').slice(-1)[0]?.id && (
                                                        <div className="mt-2 ml-1">
                                                            <button
                                                                onClick={() => convertToProduct(msg.content)}
                                                                className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                                            >
                                                                <FiDollarSign /> Productize This (D2)
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                        <div ref={chatBottomRef} />
                                    </div>
                                    <form onSubmit={sendMessage} className="p-4 bg-[var(--c-surface)] border-t border-[var(--c-border)]">
                                        <div className="flex relative">
                                            <input
                                                ref={chatInputRef}
                                                type="text"
                                                value={inputValue}
                                                onChange={e => setInputValue(e.target.value)}
                                                placeholder="あなたのビジネスやコンテンツのアイデアを話してください..."
                                                className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl pl-4 pr-14 py-4 focus:outline-none focus:border-blue-500 transition-colors"
                                            />
                                            <button type="submit" className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                                                <FiPlay className="w-5 h-5 ml-0.5" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            <button type="button" onClick={handleRunResearch} disabled={monetizeStatus === 'running_d1'}
                                                className="text-xs px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border border-blue-500 transition-all flex items-center gap-1">
                                                {d1Status === 'running' ? <><div className="animate-spin w-3 h-3 rounded-full border-2 border-white/30 border-t-white mr-1"></div> Processing...</> : d1Status === 'complete' ? <><FiCheck /> Done</> : d1Status === 'error' ? <><FiXCircle /> Error</> : <>🚀 Run Research (D1)</>}
                                            </button>
                                            <button type="button" onClick={() => setInputValue('Research a topic for me: ')}
                                                className="text-xs px-3 py-2 bg-[var(--c-raised)] hover:bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)] rounded-lg border border-[var(--c-border)] transition-all">🔍 Find ideas</button>
                                            <button type="button" onClick={() => setInputValue('Generate content about: ')}
                                                className="text-xs px-3 py-2 bg-[var(--c-raised)] hover:bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)] rounded-lg border border-[var(--c-border)] transition-all">⚡ Generate content</button>
                                            <button type="button" onClick={() => goToPhase(2, monetizeTopic || extractTopic(messages))}
                                                className="text-xs px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 hover:text-[var(--c-text)] rounded-lg border border-purple-500/30 transition-all">⚡ Skip to Create</button>
                                        </div>
                                    </form>
                                </div>
                            </Motion.div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            Phase 2: CREATE
                        ════════════════════════════════════════════════════ */}
                        {currentPhase === 2 && (
                            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto py-8 px-8">

                                {/* Chat topic banner */}
                                {activeTopic && (
                                    <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-2xl flex items-center gap-3">
                                        <span className="text-purple-300 text-sm">💬</span>
                                        <span className="text-[var(--c-text)] font-semibold truncate">{activeTopic}</span>
                                        <button onClick={() => setActiveTopic('')} className="ml-auto text-[var(--c-subtle)] hover:text-[var(--c-text)] text-xs">✕</button>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h2 className="text-4xl font-black mb-4" style={{ color: '#1A56DB' }}>Create Your Product</h2>
                                    <p className="text-[var(--c-muted)]">One topic. Blog post, social captions, and a product. In 90 seconds.</p>
                                </div>

                                <div className="bg-[var(--c-raised)] border border-[var(--c-border)] p-8 rounded-3xl space-y-6 backdrop-blur-sm">
                                    {/* Identity Panel */}
                                    <details className="group border border-[var(--c-border)] bg-[var(--c-raised)] rounded-2xl overflow-hidden cursor-pointer transition-all">
                                        <summary className="px-6 py-4 flex items-center justify-between text-sm font-bold text-[var(--c-text)] hover:text-[var(--c-text)] hover:bg-[var(--c-raised)] transition-colors focus:outline-none">
                                            <span className="flex items-center gap-2">🎭 Your AI Clone Identity <span className="text-xs font-normal text-[var(--c-subtle)] ml-2">Review before creating...</span></span>
                                            <span className="group-open:-rotate-180 transition-transform duration-300">▼</span>
                                        </summary>
                                        <div className="p-2 border-t border-[var(--c-border)] bg-[var(--c-surface)] cursor-default">
                                            <IdentityPanel />
                                        </div>
                                    </details>

                                    {/* Topic + research status */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <label className="text-sm font-bold text-[var(--c-text)]">Topic / Idea</label>
                                                <button
                                                    onClick={handleNicheValidate}
                                                    disabled={!monetizeTopic.trim() || nicheValidation.status === 'running'}
                                                    className={`text-xs px-3 py-1 disabled:opacity-40 rounded-lg flex items-center gap-1.5 transition-all border ${
                                                        nicheValidation.status === 'error'
                                                            ? 'bg-red-900/30 text-red-300 border-red-500/30 hover:bg-red-800/40'
                                                            : nicheValidation.status === 'done'
                                                                ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30 hover:bg-emerald-800/40'
                                                                : 'bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border-indigo-500/30'
                                                    }`}
                                                >
                                                    {nicheValidation.status === 'running'
                                                        ? <><div className="w-3 h-3 rounded-full border border-indigo-300 border-t-transparent animate-spin" /> Checking...</>
                                                        : nicheValidation.status === 'error'
                                                            ? <>❌ Failed — Retry</>
                                                            : nicheValidation.status === 'done'
                                                                ? <>✅ Checked</>
                                                                : <>📊 Check Market Demand</>}
                                                </button>
                                            </div>
                                            {researchCheck.status === 'checking' && (
                                                <span className="text-xs text-[var(--c-muted)] flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-slate-400 border-t-white animate-spin" /> Checking research...</span>
                                            )}
                                            {researchCheck.status === 'found' && (
                                                <span className="text-xs text-emerald-400 flex items-center gap-1"><FiCheckCircle /> D1 Research found: {researchCheck.file}</span>
                                            )}
                                            {researchCheck.status === 'missing' && (
                                                <span className="text-xs text-amber-400 flex items-center gap-1"><FiAlertTriangle /> D1 Research not run</span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={monetizeTopic}
                                            onChange={(e) => { setMonetizeTopic(e.target.value); setMonetizeStatus('idle'); setNicheValidation({ status: 'idle', data: null }); }}
                                            placeholder={CREATE_PLACEHOLDERS[placeholderIdx]}
                                            className={`w-full bg-[var(--c-surface)] border rounded-xl px-4 py-3 text-[var(--c-text)] focus:outline-none transition-colors ${researchCheck.status === 'missing' ? 'border-amber-500/50 focus:border-amber-400' : 'border-[var(--c-border)] focus:border-purple-500'}`}
                                        />
                                        {nicheValidation.status === 'rate_limited' && (
                                            <div className="mt-3 p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="text-sm font-bold text-[var(--c-text)]">🔒 Free demo limit reached (1/day)</div>
                                                    <p className="text-xs text-[var(--c-muted)] mt-0.5">Upgrade for unlimited market demand checks.</p>
                                                </div>
                                                <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold text-xs transition-all">
                                                    💎 Upgrade on Whop
                                                </a>
                                            </div>
                                        )}
                                        {nicheValidation.status === 'error' && (
                                            <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                                <div className="text-xs text-red-400 flex items-center gap-2 mb-2">
                                                    <FiXCircle className="shrink-0" /> Validation failed — check manually:
                                                    <button onClick={() => setNicheValidation({ status: 'idle', data: null })} className="ml-auto text-red-500 hover:text-red-300">✕</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { label: '📈 Google Trends', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(monetizeTopic)}` },
                                                        { label: '💬 Reddit', url: `https://www.reddit.com/search/?q=${encodeURIComponent(monetizeTopic)}` },
                                                        { label: '▶️ YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(monetizeTopic)}` },
                                                    ].map(({ label, url }) => (
                                                        <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                                                            className="text-xs px-2 py-1.5 bg-[var(--c-raised)] hover:bg-[var(--c-raised)] text-[var(--c-text)] rounded-lg border border-[var(--c-border)] transition-all font-medium">
                                                            {label}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Always-visible external research links when topic is entered */}
                                        {monetizeTopic.trim().length >= 2 && nicheValidation.status !== 'error' && (
                                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-[var(--c-subtle)]">Research:</span>
                                                {[
                                                    { label: '📈 Trends', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(monetizeTopic)}` },
                                                    { label: '💬 Reddit', url: `https://www.reddit.com/search/?q=${encodeURIComponent(monetizeTopic)}` },
                                                    { label: '▶️ YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(monetizeTopic)}` },
                                                ].map(({ label, url }) => (
                                                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs px-2 py-1 bg-[var(--c-raised)] hover:bg-[var(--c-raised)] text-[var(--c-text)] hover:text-[var(--c-text)] rounded-lg border border-[var(--c-border)] transition-all font-medium">
                                                        {label}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        {nicheValidation.status === 'done' && nicheValidation.data?.status === 'success' && (
                                            <div className="mt-2 px-3 py-2 bg-emerald-900/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-1">
                                                <FiCheckCircle className="shrink-0" /> Market research complete — see report below
                                            </div>
                                        )}
                                    </div>

                                    {/* Language selector */}
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--c-text)] mb-2">Output Language</label>
                                        <div className="flex gap-2">
                                            {[['auto', '🌐 Auto'], ['ja', '🇯🇵 Japanese'], ['en', '🇺🇸 English']].map(([val, label]) => (
                                                <button key={val} onClick={() => setLang(val)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${lang === val ? 'bg-purple-600 text-white' : 'bg-[var(--c-raised)] text-[var(--c-muted)] hover:bg-[var(--c-raised)] hover:text-[var(--c-text)]'}`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--c-text)] mb-2">Target Market</label>
                                            <select value={market} onChange={(e) => setMarket(e.target.value)}
                                                className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl px-4 py-3 text-[var(--c-text)] focus:outline-none focus:border-purple-500 appearance-none">
                                                <option value="US">🇺🇸 US Market</option>
                                                <option value="JP">🇯🇵 Japan Market</option>
                                                <option value="CN">🇨🇳 China Market</option>
                                                <option value="IN">🇮🇳 India Market</option>
                                                <option value="GLOBAL">🌐 Global Market</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--c-text)] mb-2">Suggested Price</label>
                                            <input type="text" value={price} onChange={(e) => setPrice(e.target.value)}
                                                className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl px-4 py-3 text-[var(--c-text)] focus:outline-none focus:border-purple-500" />
                                        </div>
                                    </div>

                                    <hr className="border-[var(--c-border)] my-6" />

                                    {/* D1 research warning */}
                                    {monetizeStatus === 'needs_research' && (
                                        <div className="p-5 bg-amber-900/20 border border-amber-500/30 rounded-2xl space-y-3">
                                            <div className="text-amber-300 font-bold flex items-center gap-2"><FiAlertTriangle /> D1 Research not found</div>
                                            <p className="text-[var(--c-text)] text-sm">No research file found for "{monetizeTopic}". We recommend running D1 Research first to avoid content contamination.</p>
                                            <div className="flex gap-3">
                                                <button onClick={handleD1ForTopic} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                                    <FiPlay /> Run D1 Research, Then Generate
                                                </button>
                                                <button onClick={() => runMonetizePipeline()} className="px-4 py-3 bg-[var(--c-raised)] hover:bg-[var(--c-raised)] text-[var(--c-muted)] text-sm rounded-xl transition-all">
                                                    Generate anyway (risky)
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Demo mode notice for public visitors */}
                                    {!IS_OWNER && !['needs_research', 'review', 'finalizing', 'finalized'].includes(monetizeStatus) && (
                                        <div className="flex items-center justify-between px-4 py-3 bg-amber-900/20 border border-amber-500/20 rounded-xl text-xs">
                                            <span className="text-amber-300">⚡ Demo mode — sample output will be shown</span>
                                            <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                                Upgrade for real output →
                                            </a>
                                        </div>
                                    )}

                                    {/* Generate button */}
                                    {!['needs_research', 'review', 'finalizing', 'finalized'].includes(monetizeStatus) && (
                                        <button
                                            onClick={() => handleMonetize()}
                                            disabled={!monetizeTopic || ['running', 'running_d1'].includes(monetizeStatus)}
                                            className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-3 transition-all ${!monetizeTopic ? 'bg-[var(--c-raised)] text-[var(--c-subtle)] cursor-not-allowed' :
                                                monetizeStatus === 'running' ? 'bg-[var(--c-raised)] text-[var(--c-muted)]' :
                                                    monetizeStatus === 'running_d1' ? 'bg-amber-800 text-amber-200' :
                                                        monetizeStatus === 'error' ? 'bg-red-700 text-white' :
                                                            'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white shadow-[0_0_40px_rgba(147,51,234,0.4)]'
                                                }`}
                                        >
                                            {monetizeStatus === 'idle' && <>⚡ Generate Product</>}
                                            {monetizeStatus === 'running_d1' && <><div className="animate-spin w-5 h-5 rounded-full border-2 border-amber-400 border-t-white" /> Running D1 Research...</>}
                                            {monetizeStatus === 'running' && <><div className="animate-spin w-5 h-5 rounded-full border-2 border-slate-400 border-t-white"></div> Running Pipeline...</>}
                                            {monetizeStatus === 'error' && <><FiXCircle /> Pipeline Failed — Retry</>}
                                        </button>
                                    )}

                                    {monetizeStatus === 'running' && (
                                        <div className="mt-3 space-y-2">
                                            {/* Progress bar */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-[var(--c-raised)] rounded-full h-2.5 overflow-hidden border border-[var(--c-border)]">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all ease-out"
                                                        style={{ width: `${progressPercent}%`, transitionDuration: '2000ms' }}
                                                    />
                                                </div>
                                                <span className="text-xs text-[var(--c-muted)] shrink-0 w-8 text-right">{progressPercent}%</span>
                                            </div>
                                            <p className="text-xs text-violet-300 animate-pulse text-center">{generateProgress}</p>
                                        </div>
                                    )}

                                    {/* Quick Monetize Preview — shows while typing, generating, or on error */}
                                    {!['review', 'finalizing', 'finalized'].includes(monetizeStatus) && quickPreview && (
                                        <div className="mt-4 p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl space-y-3">
                                            <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">⚡ Quick Preview</div>
                                            <div className="text-[var(--c-text)] font-bold text-sm">{quickPreview.headline}</div>
                                            <div className="text-xs text-[var(--c-muted)]">👤 {quickPreview.buyer}</div>
                                            <div className="text-xs text-emerald-400 font-bold">💰 {quickPreview.price}</div>
                                            <div className="space-y-1">
                                                {quickPreview.hooks.map((h, i) => (
                                                    <div key={i} className="text-xs text-[var(--c-text)] flex gap-2">
                                                        <span className="text-purple-400 shrink-0">→</span>{h}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {monetizeStatus === 'error' && (
                                        <div className="mt-4 p-4 bg-red-900/30 border border-red-500/40 rounded-xl text-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-red-400 font-bold flex items-center gap-2">❌ Pipeline Failed</div>
                                                <button
                                                    onClick={() => { setMonetizeStatus('idle'); setMonetizeResult(null); }}
                                                    className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] px-2 py-1 rounded hover:bg-[var(--c-raised)] border border-[var(--c-border)] transition-all"
                                                >
                                                    ✕ Close
                                                </button>
                                            </div>
                                            <div className="text-[var(--c-text)] text-xs break-all">
                                                {monetizeResult || 'An error occurred in the LLM pipeline. Please retry or wait a moment.'}
                                            </div>
                                            <button
                                                onClick={() => { setMonetizeStatus('idle'); setMonetizeResult(null); setTimeout(() => handleMonetize(), 50); }}
                                                className="w-full py-2 bg-red-800/40 hover:bg-red-700/50 border border-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-all"
                                            >
                                                🔄 Try Again
                                            </button>
                                        </div>
                                    )}

                                    {/* Transition to Phase 3 */}
                                    {['review', 'finalizing', 'finalized'].includes(monetizeStatus) && generateData && (
                                        <div className="p-5 bg-emerald-900/20 border border-emerald-500/40 rounded-2xl space-y-3">
                                            <div className="flex items-center gap-3">
                                                <FiCheckCircle className="text-emerald-400 text-xl" />
                                                <div>
                                                    <div className="text-emerald-300 font-bold">Generation Complete!</div>
                                                    <div className="text-[var(--c-muted)] text-sm">{editedSections.length} sections, sales page & captions ready</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => goToPhase(3)}
                                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                            >
                                                ✏️ Review & Polish Content → REFINE
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Niche Validation Report */}
                                {nicheValidation.status === 'done' && nicheValidation.data?.status === 'success' && (() => {
                                    const v = nicheValidation.data;
                                    const recStyle = {
                                        GO: { wrap: 'border-emerald-500/30 bg-emerald-900/10', label: 'text-emerald-400', score: 'text-emerald-300', text: '✅ GO — Market Viable' },
                                        CAUTION: { wrap: 'border-amber-500/30 bg-amber-900/10', label: 'text-amber-400', score: 'text-amber-300', text: '⚠️ CAUTION — Needs Improvement' },
                                        STOP: { wrap: 'border-red-500/30 bg-red-900/10', label: 'text-red-400', score: 'text-red-300', text: '🛑 STOP — Low Market Demand' },
                                    }[v.recommendation] || { wrap: 'border-[var(--c-border)] bg-[var(--c-raised)]', label: 'text-[var(--c-muted)]', score: 'text-[var(--c-text)]', text: v.recommendation };
                                    return (
                                        <div ref={nicheResultRef} className={`border ${recStyle.wrap} rounded-2xl p-6 space-y-4`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className={`text-lg font-black ${recStyle.label}`}>{recStyle.text}</div>
                                                    <div className="text-[var(--c-muted)] text-sm mt-0.5">総合スコア: <span className={`${recStyle.score} font-bold text-xl`}>{v.overall_score}</span>/100</div>
                                                </div>
                                                <button onClick={() => { setNicheValidation({ status: 'idle', data: null }); if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0; }} className="text-xs text-[var(--c-subtle)] hover:text-[var(--c-text)] px-2 py-1 rounded-lg hover:bg-[var(--c-raised)]">✕</button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-xs">
                                                <div className="bg-[var(--c-raised)] rounded-xl p-3">
                                                    <div className="text-[var(--c-muted)] mb-1 uppercase tracking-widest font-bold">Demand</div>
                                                    <div className="text-[var(--c-text)] font-bold text-base">{v.demand?.score}/100</div>
                                                    <div className="text-[var(--c-subtle)]">{v.demand?.trend} · Search: {v.demand?.search_volume}</div>
                                                    <div className="text-[var(--c-muted)] mt-1 leading-relaxed">{v.demand?.reason}</div>
                                                </div>
                                                <div className="bg-[var(--c-raised)] rounded-xl p-3">
                                                    <div className="text-[var(--c-muted)] mb-1 uppercase tracking-widest font-bold">Competition</div>
                                                    <div className="text-[var(--c-text)] font-bold text-base">{v.competition?.level}</div>
                                                    <div className="text-[var(--c-subtle)]">Avg ¥{(v.competition?.avg_price_jpy || 0).toLocaleString()}</div>
                                                    {(v.competition?.gaps || []).length > 0 && (
                                                        <div className="mt-1 text-indigo-300">Gap: {v.competition.gaps[0]}</div>
                                                    )}
                                                </div>
                                                <div className="bg-[var(--c-raised)] rounded-xl p-3">
                                                    <div className="text-[var(--c-muted)] mb-1 uppercase tracking-widest font-bold">Audience</div>
                                                    <div className="text-[var(--c-text)] font-bold text-base">{v.audience?.clarity_score}/100</div>
                                                    <div className="text-[var(--c-subtle)]">{v.audience?.persona?.age_range} · {v.audience?.persona?.occupation}</div>
                                                    <div className="text-[var(--c-muted)] mt-1 leading-relaxed">{v.audience?.persona?.pain_point}</div>
                                                </div>
                                            </div>
                                            {v.pricing && (
                                                <div className="flex gap-3 text-xs">
                                                    <div className="bg-[var(--c-raised)] rounded-xl px-4 py-2 flex-1 text-center">
                                                        <div className="text-[var(--c-muted)]">Basic</div>
                                                        <div className="text-[var(--c-text)] font-bold">¥{(v.pricing.japan?.basic || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-2 flex-1 text-center">
                                                        <div className="text-purple-300">Standard ★</div>
                                                        <div className="text-[var(--c-text)] font-bold">¥{(v.pricing.japan?.standard || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div className="bg-[var(--c-raised)] rounded-xl px-4 py-2 flex-1 text-center">
                                                        <div className="text-[var(--c-muted)]">Premium</div>
                                                        <div className="text-[var(--c-text)] font-bold">¥{(v.pricing.japan?.premium || 0).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {(v.improvements || []).length > 0 && (
                                                <div className="bg-[var(--c-raised)] rounded-xl p-3 text-xs space-y-1">
                                                    <div className="text-[var(--c-muted)] uppercase tracking-widest font-bold mb-2">Suggestions</div>
                                                    {v.improvements.map((imp, i) => (
                                                        <div key={i} className="text-[var(--c-text)] flex gap-2"><span className="text-indigo-400">→</span>{imp}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {nicheValidation.status === 'error' && (
                                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-2xl text-sm text-red-400 flex items-center gap-2">
                                        <FiXCircle /> Niche validation failed. Please check that Flask is running.
                                    </div>
                                )}
                            </Motion.div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            Phase 3: REFINE (2-column layout)
                        ════════════════════════════════════════════════════ */}
                        {currentPhase === 3 && (
                            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto py-8 px-8">
                                {!generateData ? (
                                    <div className="text-center py-20">
                                        <div className="text-[var(--c-muted)] mb-4">Content not yet generated.</div>
                                        <button onClick={() => goToPhase(2)} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all">
                                            ← Generate in Phase 2
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-6 items-start">
                                        {/* Left column (60%): Sections */}
                                        <div className="flex-1 space-y-4 min-w-0">
                                            {/* Demo banner */}
                                            {isDemo && (
                                                <div className="p-4 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-4">
                                                    <div>
                                                        <div className="text-sm font-bold text-amber-300 flex items-center gap-2">⚡ Demo Preview — Sample Output</div>
                                                        <p className="text-xs text-[var(--c-muted)] mt-0.5">This is pre-built demo content. Upgrade to generate real AI output for your topic.</p>
                                                    </div>
                                                    <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                        className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold text-xs transition-all whitespace-nowrap">
                                                        💎 Upgrade on Whop
                                                    </a>
                                                </div>
                                            )}

                                            {/* Header bar */}
                                            <div className="flex items-center justify-between p-4 bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${generateData.qa_status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                            QA {generateData.qa_status || 'WARN'}
                                                        </span>
                                                        <span className="text-[var(--c-text)] font-bold truncate max-w-xs">{isDemo ? 'Demo: AI Passive Income Guide' : monetizeTopic}</span>
                                                    </div>
                                                    {generateData.research_source && (
                                                        <div className="text-xs text-[var(--c-subtle)] mt-1">D1: {generateData.research_source}</div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => { setIsDemo(false); setMonetizeStatus('idle'); setGenerateData(null); goToPhase(2); }}
                                                    className="text-xs text-[var(--c-subtle)] hover:text-[var(--c-text)] px-3 py-1.5 rounded-lg hover:bg-[var(--c-raised)] transition-all"
                                                >
                                                    ← Start Over
                                                </button>
                                            </div>

                                            {/* Blog sections list */}
                                            <div className="space-y-3">
                                                {editedSections.map((section, idx) => (
                                                    <div key={idx} className="bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl overflow-hidden">
                                                        <button
                                                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--c-raised)] transition-all"
                                                            onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                                                        >
                                                            <div className="flex items-center gap-3 text-left flex-wrap">
                                                                <span className="text-xs text-[var(--c-subtle)] font-mono w-5">{idx + 1}</span>
                                                                <span className="text-sm font-semibold text-[var(--c-text)]">{section.title}</span>
                                                                <span className="text-xs text-[var(--c-subtle)]">{section.content?.length || 0} chars</span>
                                                                {(() => {
                                                                    const q = analyzeContentQuality(section.content);
                                                                    const scoreColor = q.score >= 75 ? 'text-emerald-400' : q.score >= 50 ? 'text-amber-400' : 'text-red-400';
                                                                    const met = new Set(q.badges.map(b => b.label));
                                                                    const criteria = [['Numbers','N'],['Action','A'],['Mistakes','M'],['Specific','S']];
                                                                    return (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className={`text-xs font-bold ${scoreColor}`}>Q{q.score}</span>
                                                                            {criteria.map(([key, lbl]) => (
                                                                                <span key={key} className={`text-[9px] font-bold px-1 py-0.5 rounded ${met.has(key) ? 'bg-emerald-900/50 text-emerald-400' : 'bg-[var(--c-raised)] text-[var(--c-subtle)]'}`}>{lbl}</span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <span className="text-[var(--c-subtle)] text-xs">{expandedSection === idx ? '▲' : '▼'}</span>
                                                        </button>
                                                        {expandedSection === idx && (
                                                            <div className="px-5 pb-5 space-y-3 border-t border-[var(--c-border)]">
                                                                <input
                                                                    type="text"
                                                                    value={section.title}
                                                                    onChange={e => setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                                                                    className="w-full mt-3 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] font-semibold text-sm focus:outline-none focus:border-blue-400"
                                                                    placeholder="セクションタイトル"
                                                                />
                                                                <textarea
                                                                    value={section.content}
                                                                    onChange={e => setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, content: e.target.value } : s))}
                                                                    rows={10}
                                                                    className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] text-sm leading-relaxed focus:outline-none focus:border-blue-400 resize-y font-mono"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={sectionInstructions[idx] || ''}
                                                                        onChange={e => setSectionInstructions(prev => ({ ...prev, [idx]: e.target.value }))}
                                                                        onKeyDown={e => e.key === 'Enter' && handleRewriteSection(idx)}
                                                                        placeholder="Rewrite this section only (e.g. add more specific numbers)"
                                                                        className={`flex-1 bg-[var(--c-surface)] border rounded-lg px-3 py-2 text-[var(--c-text)] text-xs focus:outline-none focus:border-blue-400 placeholder:text-[var(--c-subtle)] transition-all ${rewriteEmptyIdx === idx ? 'border-red-500 animate-pulse' : 'border-[var(--c-border)]'}`}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleRewriteSection(idx)}
                                                                        disabled={!sectionInstructions[idx]?.trim() || rewritingIdx === idx}
                                                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all whitespace-nowrap"
                                                                    >
                                                                        {rewritingIdx === idx
                                                                            ? <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                                                                            : <FiPlay />}
                                                                        Rewrite
                                                                    </button>
                                                                </div>
                                                                {analyzeContentQuality(section.content).score < 75 && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const isJa = lang === 'ja' || !!monetizeTopic.match(/[\u3000-\u9fff]/);
                                                                            handleRewriteSection(idx, getAutoImproveInstruction(section.content, isJa));
                                                                        }}
                                                                        disabled={rewritingIdx === idx}
                                                                        className="w-full px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 disabled:opacity-40 text-amber-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                                                    >
                                                                        {rewritingIdx === idx
                                                                            ? <div className="w-3 h-3 rounded-full border border-amber-300 border-t-transparent animate-spin" />
                                                                            : '🔧'}
                                                                        Auto-improve (Q&lt;75)
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right column (40%): Controls + Preview */}
                                        <div className="space-y-4 shrink-0" style={{ width: '380px' }}>
                                            {/* Rewrite error banner */}
                                            {rewriteError && (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-500/40 rounded-xl text-red-300 text-sm">
                                                    <FiAlertTriangle className="shrink-0" />
                                                    <span>{rewriteError}</span>
                                                    <button onClick={() => setRewriteError(null)} className="ml-auto text-red-400 hover:text-red-200"><FiXCircle /></button>
                                                </div>
                                            )}

                                            {/* Rewrite presets */}
                                            {isDemo ? (
                                                <div className="p-4 bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl flex items-center justify-between gap-4">
                                                    <div className="text-xs text-[var(--c-subtle)]">🔒 Rewrite & editing locked in demo mode</div>
                                                    <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                        className="text-xs px-3 py-1.5 bg-purple-600/50 hover:bg-purple-600 text-white rounded-lg font-bold transition-all whitespace-nowrap">
                                                        Upgrade →
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl space-y-3">
                                                    <div className="text-xs font-bold text-purple-300 uppercase tracking-widest">
                                                        Rewrite All — Tone &amp; Style
                                                    </div>
                                                    {/* 2×4 preset grid — per-button loading/done/error */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {PRESETS.map(preset => {
                                                            const isThis = rewritingPreset === preset.id;
                                                            const result = presetResults[preset.id];
                                                            return (
                                                                <button
                                                                    key={preset.id}
                                                                    onClick={() => applyPreset(preset)}
                                                                    disabled={!!(rewritingPreset || globalRewriting)}
                                                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium border text-left
                                                                        ${result === 'success' ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300'
                                                                        : result === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400'
                                                                        : isThis ? 'bg-purple-600/30 border-purple-400/40 text-white'
                                                                        : 'bg-[var(--c-raised)] hover:bg-purple-600/30 hover:text-[var(--c-text)] disabled:opacity-40 text-[var(--c-text)] border-[var(--c-border)] hover:border-purple-400/40'}`}
                                                                >
                                                                    {isThis
                                                                        ? <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-transparent animate-spin shrink-0" />
                                                                        : <span className="text-base shrink-0">{result === 'success' ? '✅' : result === 'error' ? '❌' : preset.icon}</span>
                                                                    }
                                                                    <span className="text-xs">{isThis ? 'Rewriting...' : result === 'success' ? 'Done!' : result === 'error' ? 'Failed — Retry' : preset.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {/* Custom instruction */}
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={globalInstruction}
                                                            onChange={e => setGlobalInstruction(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleRewriteAll()}
                                                            placeholder="Custom instruction (e.g. make it more casual / translate to English)"
                                                            className="flex-1 bg-[var(--c-surface)] border border-purple-500/30 rounded-xl px-3 py-2 text-[var(--c-text)] text-sm focus:outline-none focus:border-purple-400 placeholder:text-[var(--c-subtle)]"
                                                        />
                                                        <button
                                                            onClick={() => handleRewriteAll()}
                                                            disabled={!globalInstruction.trim() || globalRewriting}
                                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap"
                                                        >
                                                            {globalRewriting
                                                                ? <><div className="w-4 h-4 rounded-full border border-white border-t-transparent animate-spin" /> Rewriting...</>
                                                                : <><FiPlay /> Apply</>}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Image Regen */}
                                            <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl space-y-2">
                                                <div className="text-xs font-bold text-blue-300 uppercase tracking-widest">Regenerate Images</div>
                                                {isDemo ? (
                                                    <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                        className="w-full px-4 py-2.5 bg-purple-600/50 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-purple-600">
                                                        🔒 Upgrade to Regenerate Images
                                                    </a>
                                                ) : (
                                                    <button
                                                        onClick={handleRegenImages}
                                                        disabled={imageRegenStatus === 'running'}
                                                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        {imageRegenStatus === 'running'
                                                            ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating...</>
                                                            : imageRegenStatus === 'done'
                                                                ? <>✅ Done!</>
                                                                : imageRegenStatus === 'error'
                                                                    ? <>❌ Failed — Retry</>
                                                                    : <>🔄 Regenerate Images</>}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Product Value Stack */}
                                            {generateData && (generateData.bonus_stack || generateData.product_hook || generateData.launch_checklist) && (
                                                <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl space-y-3">
                                                    <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest">🎁 商品一式 Product Stack</div>

                                                    {/* Product Hook */}
                                                    {generateData.product_hook && (
                                                        <div className="space-y-1">
                                                            <div className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider">Product Hook</div>
                                                            <div className="text-xs text-[var(--c-text)]/90 bg-[var(--c-raised)] rounded-xl px-3 py-2 leading-relaxed">
                                                                "{generateData.product_hook}"
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Bonus Stack */}
                                                    {generateData.bonus_stack && generateData.bonus_stack.length > 0 && (
                                                        <div className="space-y-1.5">
                                                            <div className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider">Bonus Stack (3 bonuses)</div>
                                                            {generateData.bonus_stack.map((bonus, i) => (
                                                                <div key={i} className="flex items-start gap-2 text-xs bg-[var(--c-raised)] rounded-lg px-3 py-2">
                                                                    <span className="text-emerald-400 font-bold shrink-0">B{i + 1}</span>
                                                                    <div>
                                                                        <div className="text-[var(--c-text)] font-semibold">{bonus.title}</div>
                                                                        {bonus.description && <div className="text-[var(--c-muted)] text-[11px] mt-0.5">{bonus.description}</div>}
                                                                        {bonus.value && <div className="text-emerald-400 text-[10px] mt-0.5">Value: {bonus.value}</div>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Launch Checklist */}
                                                    {generateData.launch_checklist && generateData.launch_checklist.length > 0 && (
                                                        <div className="space-y-1.5">
                                                            <div className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider">Launch Checklist</div>
                                                            <div className="space-y-1">
                                                                {generateData.launch_checklist.map((item, i) => (
                                                                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--c-text)]">
                                                                        <div className="w-4 h-4 rounded border border-emerald-500/40 flex items-center justify-center shrink-0 text-[10px] text-emerald-400">{i + 1}</div>
                                                                        <span>{item}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Preview tabs */}
                                            <div className="bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl overflow-hidden">
                                                <div className="flex gap-0.5 p-1 bg-[var(--c-raised)] border-b border-[var(--c-border)]">
                                                    {[['blog', '📝 Blog'], ['captions', '📱 Cap'], ['sales', '💰 Sales'], ['images', '🖼 Img']].map(([id, icon]) => (
                                                        <button key={id} onClick={() => setContentTab(id)}
                                                            className={`flex-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${contentTab === id ? 'bg-purple-600 text-white' : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-raised)]'}`}>
                                                            {icon}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="p-3 max-h-56 overflow-y-auto no-scrollbar">
                                                    {contentTab === 'blog' && (
                                                        <div className="space-y-2">
                                                            {editedSections.map((s, i) => (
                                                                <div key={i} className="text-xs">
                                                                    <div className="font-bold text-[var(--c-text)] mb-1">{s.title}</div>
                                                                    <div className="text-[var(--c-muted)] leading-relaxed line-clamp-2">{s.content}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {contentTab === 'captions' && (
                                                        <div className="space-y-2">
                                                            {editedCaptions.map((c, i) => (
                                                                <div key={i} className="p-2 bg-[var(--c-raised)] rounded-lg text-xs text-[var(--c-text)]">{c}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {contentTab === 'sales' && (
                                                        <div className="text-xs text-[var(--c-text)] leading-relaxed whitespace-pre-line">
                                                            {editedSalesPage || (
                                                                <div className="flex flex-col items-center gap-3 py-8 text-center">
                                                                    <span className="text-2xl">📄</span>
                                                                    <div className="text-[var(--c-muted)] text-xs">Sales page not generated yet.</div>
                                                                    <div className="text-[var(--c-subtle)] text-xs">Re-run the pipeline — LLM may have been rate-limited during generation.</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {contentTab === 'images' && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {generateData.images && Object.entries(generateData.images).map(([title, data]) => (
                                                                <div key={title} className="rounded-lg overflow-hidden border border-[var(--c-border)]">
                                                                    {data.type === 'generated' && data.url ? (
                                                                        <img src={data.url} alt={title} className="w-full h-16 object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                                                    ) : (
                                                                        <div className="w-full h-16 flex items-center justify-center bg-[var(--c-raised)]/60 text-[9px] text-[var(--c-subtle)]">Prompt Only</div>
                                                                    )}
                                                                    <div className="p-1"><p className="text-[9px] text-[var(--c-muted)] truncate">{title}</p></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Advance to Phase 4 */}
                                            <button
                                                onClick={() => goToPhase(4)}
                                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                                            >
                                                🚀 Go to Publish Phase → PUBLISH
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Motion.div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            Phase 4: PUBLISH
                        ════════════════════════════════════════════════════ */}
                        {currentPhase === 4 && (
                            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto py-8 px-8 space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-4xl font-black mb-2" style={{ color: '#1A56DB' }}>🚀 Publish</h2>
                                    <p className="text-[var(--c-muted)]">Let's get your content out into the world.</p>
                                </div>

                                {!generateData ? (
                                    <div className="text-center py-16">
                                        <div className="text-[var(--c-muted)] mb-4">No content to publish yet.</div>
                                        <button onClick={() => goToPhase(2)} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all">
                                            ← Generate in Phase 2
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Demo banner */}
                                        {isDemo && (
                                            <div className="p-4 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="text-sm font-bold text-amber-300 flex items-center gap-2">⚡ Demo Preview</div>
                                                    <p className="text-xs text-[var(--c-muted)] mt-0.5">Upgrade to publish real AI-generated content.</p>
                                                </div>
                                                <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold text-xs transition-all whitespace-nowrap">
                                                    💎 Upgrade on Whop
                                                </a>
                                            </div>
                                        )}

                                        {/* Publish checklist */}
                                        <div className="p-5 bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl space-y-3">
                                            <div className="text-sm font-bold text-[var(--c-text)] mb-3 flex items-center gap-2">📋 Publish Checklist</div>
                                            {isDemo ? (
                                                <div className="space-y-2">
                                                    {['🚀 Post to Bluesky', '📸 Post to Instagram'].map(label => (
                                                        <a key={label} href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--c-raised)] border border-[var(--c-border)] text-[var(--c-subtle)] cursor-pointer hover:bg-[var(--c-raised)] transition-all">
                                                            <span>🔒</span><span>{label}</span><span className="ml-auto text-xs text-purple-400">Upgrade →</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {[
                                                        {
                                                            key: 'bluesky', icon: '🚀', label: 'Post to Bluesky', action: handlePublishBluesky,
                                                            fallbackUrl: 'https://bsky.app', fallbackLabel: 'Open Bluesky',
                                                        },
                                                        {
                                                            key: 'instagram', icon: '📸', label: 'Post to Instagram', action: handlePublishInstagram,
                                                            fallbackUrl: 'https://www.instagram.com', fallbackLabel: 'Open Instagram',
                                                            errorHint: 'Instagram requires a public image URL. Copy your caption and post manually.',
                                                        },
                                                    ].map(({ key, icon, label, action, fallbackUrl, fallbackLabel, errorHint }) => (
                                                        <div key={key} className="space-y-1">
                                                            <button onClick={action}
                                                                disabled={publishChecklist[key] === 'running' || publishChecklist[key] === 'done'}
                                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${publishChecklist[key] === 'done' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : publishChecklist[key] === 'running' ? 'bg-[var(--c-raised)] border-[var(--c-border)] text-[var(--c-muted)]' : publishChecklist[key] === 'error' ? 'bg-red-900/10 border-red-500/20 text-red-300' : 'bg-[var(--c-raised)] hover:bg-[var(--c-raised)] border-[var(--c-border)] hover:border-[var(--c-border-hv)] text-[var(--c-text)]'}`}>
                                                                <span>{publishChecklist[key] === 'done' ? '✅' : publishChecklist[key] === 'running' ? '⏳' : publishChecklist[key] === 'error' ? '❌' : icon}</span>
                                                                <span>{label}</span>
                                                                {publishChecklist[key] === 'done' && <span className="ml-auto text-xs text-emerald-400">Done!</span>}
                                                                {publishChecklist[key] === 'error' && <span className="ml-auto text-xs text-red-400">Failed — Retry?</span>}
                                                            </button>
                                                            {/* Fallback actions shown on failure */}
                                                            {publishChecklist[key] === 'error' && (
                                                                <div className="space-y-1.5 pl-2">
                                                                    {errorHint && (
                                                                        <div className="text-[10px] text-amber-400/80 px-1">⚠️ {errorHint}</div>
                                                                    )}
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={async () => {
                                                                                const caption = editedCaptions[0] || editedSections.map(s => s.title).join(' ');
                                                                                try {
                                                                                    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(caption);
                                                                                    else { const el = document.createElement('textarea'); el.value = caption; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
                                                                                } catch {}
                                                                            }}
                                                                            className="flex-1 py-1.5 px-3 bg-[var(--c-raised)]/60 hover:bg-[var(--c-raised)]/60 border border-[var(--c-border)] rounded-lg text-[11px] text-[var(--c-text)] transition-all flex items-center justify-center gap-1.5"
                                                                        >
                                                                            📋 Copy Caption
                                                                        </button>
                                                                        <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
                                                                            className="flex-1 py-1.5 px-3 bg-[var(--c-raised)]/60 hover:bg-[var(--c-raised)]/60 border border-[var(--c-border)] rounded-lg text-[11px] text-[var(--c-text)] transition-all flex items-center justify-center gap-1.5">
                                                                            🔗 {fallbackLabel}
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button onClick={handleCopyBlogPost}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                                                            copyStatus === 'success' ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-200 scale-[1.01]'
                                                            : copyStatus === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-300'
                                                            : 'bg-[var(--c-raised)] hover:bg-[var(--c-raised)] border-[var(--c-border)] hover:border-[var(--c-border-hv)] text-[var(--c-text)]'}`}>
                                                        <span className="text-base">{copyStatus === 'success' ? '✅' : copyStatus === 'error' ? '❌' : '📝'}</span>
                                                        <span>{copyStatus === 'success' ? 'Copied!' : copyStatus === 'error' ? 'Copy Failed' : 'Copy Blog Post'}</span>
                                                        {copyStatus === 'success' && <span className="ml-auto text-xs font-bold text-emerald-300 animate-pulse">Done!</span>}
                                                        {copyStatus === 'error' && <span className="ml-auto text-xs text-red-400">Retry?</span>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Finalize */}
                                        {monetizeStatus !== 'finalized' ? (
                                            <div className="flex gap-3">
                                                {isDemo ? (
                                                    <a href="https://whop.com/segeai/" target="_blank" rel="noopener noreferrer"
                                                        className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(147,51,234,0.3)]">
                                                        💎 Upgrade to Save & Publish Real Output
                                                    </a>
                                                ) : (
                                                    <button
                                                        onClick={handleFinalize}
                                                        disabled={monetizeStatus === 'finalizing'}
                                                        className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                                    >
                                                        {monetizeStatus === 'finalizing'
                                                            ? <><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving...</>
                                                            : <><FiCheckCircle /> Confirm &amp; Save to Obsidian</>}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-5 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl space-y-3">
                                                <div className="text-emerald-400 font-bold text-lg flex items-center gap-2"><FiCheck /> Final version saved!</div>
                                                <div className="text-[var(--c-muted)] font-mono text-xs break-all">{monetizeResult}</div>
                                                {/* Whop sales URL — shown when pipeline actually published */}
                                                {generateData?.whop?.checkout_url && generateData.whop.status !== 'error' && (
                                                    <div className="pt-2 border-t border-emerald-500/20 space-y-2">
                                                        <div className="text-xs text-[var(--c-muted)] font-semibold uppercase tracking-wide">
                                                            {generateData.whop.status === 'dry_run' ? '🧪 Dry-run URL (WHOP_DRY_RUN=1)' : '🛒 Live Sales Page'}
                                                        </div>
                                                        <a
                                                            href={generateData.whop.checkout_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-xl text-indigo-300 font-bold text-sm transition-all truncate"
                                                        >
                                                            🚀 {generateData.whop.checkout_url}
                                                        </a>
                                                        <button
                                                            onClick={() => navigator.clipboard?.writeText(generateData.whop.checkout_url).catch(() => {})}
                                                            className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                                                        >
                                                            📋 Copy URL
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Start new */}
                                        <button
                                            onClick={() => { handleStartNew(); goToPhase(1); }}
                                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[var(--c-raised)] hover:bg-[var(--c-raised)] border border-[var(--c-border)] rounded-xl text-sm font-medium text-[var(--c-muted)] hover:text-[var(--c-text)] transition-all"
                                        >
                                            ↺ Create New Content
                                        </button>
                                    </>
                                )}
                            </Motion.div>
                        )}
                    </>
                )}
            </div>

            {/* ── SageMiniChat FAB (phases 2-4) ─────────────────────────────── */}
            {currentPhase >= 2 && !showAutomations && !showSelfTest && (
                <SageMiniChat phase={currentPhase} topic={activeTopic} />
            )}

            {/* ── Self-Test FAB ──────────────────────────────────────────────── */}
            <button
                onClick={() => setShowSelfTest(true)}
                className="fixed bottom-6 left-6 z-50 flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 border border-white/10 hover:border-emerald-500/40 text-slate-500 hover:text-emerald-400 rounded-xl text-xs font-mono transition-all backdrop-blur-sm"
                title="System Self-Test"
            >
                🔬 <span className="hidden sm:inline">Self-Test</span>
            </button>

            {/* ── Self-Test Modal ─────────────────────────────────────────────── */}
            {showSelfTest && (() => {
                const ST_STATUS_COLOR = { PASS: 'text-emerald-400', FAIL: 'text-red-400', SKIP: 'text-yellow-400' };
                const ST_STATUS_ICON  = { PASS: '✅', FAIL: '❌', SKIP: '⚠️' };
                const ST_TIER_LABEL   = { 1: 'Tier 1 — API Health', 2: 'Tier 2 — Integration (services)' };

                const allTiers = [selfTestResults.tier1, selfTestResults.tier2].filter(Boolean);
                const hasResults = allTiers.length > 0;
                const overallStatus = hasResults
                    ? allTiers.some(t => t.overall_status === 'FAIL') ? 'FAIL'
                    : allTiers.some(t => t.overall_status === 'DEGRADE') ? 'DEGRADE'
                    : 'PASS'
                    : null;
                const degradeReasons = allTiers
                    .filter(t => t.overall_status === 'DEGRADE' && t.degrade_reason)
                    .map(t => t.degrade_reason)
                    .join(' / ') || 'rate-limit SKIPs detected, fallback active';
                const overallBanner = {
                    PASS:   { bg: 'bg-emerald-900/30 border-emerald-500/30', text: 'text-emerald-400', icon: '✅', label: 'All Systems Go', sub: null },
                    DEGRADE:{ bg: 'bg-yellow-900/30 border-yellow-500/30',   text: 'text-yellow-400', icon: '⚠️', label: 'Degraded', sub: degradeReasons },
                    FAIL:   { bg: 'bg-red-900/30 border-red-500/30',         text: 'text-red-400',    icon: '❌', label: 'System Failure — action required', sub: null },
                };

                return (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={e => { if (e.target === e.currentTarget) setShowSelfTest(false); }}
                    >
                        <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-black/40 shrink-0">
                                <span className="font-bold text-sm text-white">🔬 System Self-Test</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={runAllSelfTests}
                                        disabled={!!selfTestRunning.all}
                                        className="text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all disabled:opacity-40"
                                    >
                                        {selfTestRunning.all ? '⏳ Running…' : '▶ Run All'}
                                    </button>
                                    <button
                                        onClick={() => setShowSelfTest(false)}
                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all text-lg leading-none"
                                    >×</button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto p-4 space-y-3">
                                {selfTestError && (
                                    <div className="flex items-start gap-2 px-4 py-3 bg-red-900/30 border border-red-500/30 rounded-xl">
                                        <span className="text-base shrink-0">❌</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-red-400">Connection Error</p>
                                            <p className="text-xs text-red-400/75 font-mono mt-0.5 break-all">{selfTestError}</p>
                                        </div>
                                        <button onClick={() => setSelfTestError(null)} className="text-red-500 hover:text-red-300 text-xs shrink-0">×</button>
                                    </div>
                                )}
                                {overallStatus && (() => {
                                    const b = overallBanner[overallStatus];
                                    return (
                                        <div className={`px-4 py-2.5 rounded-xl border ${b.bg}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{b.icon}</span>
                                                <span className={`text-xs font-bold ${b.text}`}>{b.label}</span>
                                                {allTiers[0]?.ran_at && (
                                                    <span className="ml-auto text-[10px] text-slate-600 font-mono">
                                                        {new Date(allTiers[0].ran_at).toLocaleTimeString('ja-JP')}
                                                    </span>
                                                )}
                                            </div>
                                            {b.sub && (
                                                <p className={`mt-1 text-[10px] ${b.text} opacity-75 font-mono leading-tight`}>
                                                    {b.sub}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                                {[1, 2].map(tier => {
                                    const tierData = selfTestResults[`tier${tier}`];
                                    const tests    = tierData?.tests || [];
                                    const isRunAll = !!selfTestRunning[`t${tier}`];
                                    return (
                                        <div key={tier} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 border-b border-white/8">
                                                <span className="text-xs font-bold text-slate-300">{ST_TIER_LABEL[tier]}</span>
                                                <div className="flex items-center gap-2">
                                                    {tierData && (
                                                        <span className="text-xs text-slate-600 font-mono">
                                                            P:{tierData.summary.pass} F:{tierData.summary.fail} S:{tierData.summary.skip}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => runSelfTestItem(tier)}
                                                        disabled={isRunAll}
                                                        className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-lg transition-all disabled:opacity-40"
                                                    >
                                                        {isRunAll ? '⏳' : '▶ Run'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="divide-y divide-white/5">
                                                {tests.length === 0 ? (
                                                    <div className="px-4 py-3 text-xs text-slate-600 italic">
                                                        "▶ Run" でこの Tier を実行
                                                    </div>
                                                ) : tests.map(t => (
                                                    <div key={t.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors">
                                                        <span className="text-sm shrink-0">{ST_STATUS_ICON[t.status] || '○'}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-mono text-slate-300 truncate">{t.name}</p>
                                                            {t.reason && <p className="text-xs text-slate-600 truncate">{t.reason}</p>}
                                                        </div>
                                                        <span className={`text-xs font-bold shrink-0 ${ST_STATUS_COLOR[t.status] || 'text-slate-500'}`}>
                                                            {t.status}
                                                        </span>
                                                        <button
                                                            onClick={() => runSelfTestItem(tier, t.name)}
                                                            disabled={!!selfTestRunning[t.name]}
                                                            className="w-6 h-6 shrink-0 flex items-center justify-center bg-white/5 hover:bg-white/15 text-slate-500 hover:text-white rounded transition-all disabled:opacity-30 text-xs"
                                                            title={`Re-run ${t.name}`}
                                                        >
                                                            {selfTestRunning[t.name] ? '⏳' : '▶'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                <p className="text-center text-xs text-slate-700 pb-1">
                                    毎日 JST 07:00 自動実行 / Tier 1: 30 分ごと
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

// ── Identity Panel ──────────────────────────────────────────────────────────
const IdentityPanel = () => {
    const [identity, setIdentity] = React.useState({
        role: '', niche: '', tone: '', visual_style: '', language: 'ja'
    });
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const [resetting, setResetting] = React.useState(false);

    React.useEffect(() => {
        api.get('/api/identity')
            .then(res => setIdentity(res.data))
            .catch(() => { });
    }, []);

    const handleReset = async () => {
        setResetting(true);
        try {
            const res = await api.post('/api/identity/reset');
            setIdentity(res.data.identity);
        } catch (err) {
            console.error('[Identity] Reset failed:', err);
        } finally {
            setResetting(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await api.post('/api/identity', identity);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[Identity] Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        { key: 'role', label: 'Role / Persona', placeholder: 'e.g. オカルト研究家、猫好き投資家' },
        { key: 'niche', label: 'Niche / Topic', placeholder: 'e.g. 霊的覚醒・神秘体験、猫と資産形成' },
        { key: 'tone', label: 'Tone / Voice', placeholder: 'e.g. mysterious and profound, friendly and warm' },
        { key: 'visual_style', label: 'Visual Style', placeholder: 'e.g. dark mystical aesthetic, cute pastel colors' },
    ];

    return (
        <div className="p-5 bg-[var(--c-raised)] border border-[var(--c-border)] rounded-2xl space-y-4">
            <div className="text-sm font-bold text-[var(--c-text)] flex items-center gap-2">🎭 Your AI Clone Identity</div>
            <div className="grid grid-cols-2 gap-3">
                {fields.map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-1">
                        <label className="text-xs text-[var(--c-subtle)] uppercase tracking-widest">{label}</label>
                        <input
                            value={identity[key] || ''}
                            onChange={e => setIdentity(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full bg-[var(--c-raised)] border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm text-[var(--c-text)] placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <button onClick={handleReset} disabled={resetting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all bg-[var(--c-raised)] hover:bg-[var(--c-raised)] text-[var(--c-muted)] border border-[var(--c-border)] disabled:opacity-50">
                    {resetting ? '↩ Resetting...' : '↩ Reset to Default'}
                </button>
                <button onClick={handleSave} disabled={saving}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'}`}>
                    {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Identity'}
                </button>
            </div>
        </div>
    );
};

// ── ContentManager ───────────────────────────────────────────────────────────
const ContentManager = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        setLoading(true);
        setError(null);
        const params = filter !== 'all' ? `?type=${filter}` : '';
        api.get(`/api/content/list${params}`)
            .then(res => setItems(res.data.items || []))
            .catch(e => setError(e?.response?.data?.error || e?.response?.data?.message || 'Content Manager offline'))
            .finally(() => setLoading(false));
    }, [filter]);

    const FILTERS = [
        { value: 'all', label: 'All' },
        { value: 'blog', label: 'Blog' },
        { value: 'general', label: 'General' },
    ];

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FiFolder className="text-blue-500 text-xl" />
                    <h2 className="text-xl font-bold text-[var(--c-text)]">Content Library</h2>
                </div>
                <div className="flex gap-2">
                    {FILTERS.map(f => (
                        <button key={f.value} onClick={() => setFilter(f.value)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filter === f.value ? 'bg-blue-600 text-white' : 'bg-[var(--c-raised)] text-[var(--c-muted)] hover:text-[var(--c-text)] border border-[var(--c-border)]'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-16">
                    <div className="flex gap-1">
                        {[0, 150, 300].map(d => (
                            <div key={d} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-[var(--c-raised)] border border-[var(--c-border)] rounded-xl p-6 text-center text-[var(--c-muted)] text-sm">
                    <FiAlertTriangle className="mx-auto mb-2 text-amber-500 text-2xl" />
                    {error}
                </div>
            )}

            {!loading && !error && items.length === 0 && (
                <div className="bg-[var(--c-raised)] border border-[var(--c-border)] rounded-xl p-10 text-center text-[var(--c-muted)] text-sm">
                    <FiFolder className="mx-auto mb-3 text-3xl opacity-30" />
                    <p>No content yet. Run the pipeline to generate content.</p>
                </div>
            )}

            {!loading && !error && items.length > 0 && (
                <div className="space-y-3">
                    {items.map((item, i) => (
                        <div key={i} className="bg-[var(--c-raised)] border border-[var(--c-border)] rounded-xl p-4 hover:border-blue-500/40 transition-all">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[var(--c-text)] text-sm truncate">{item.title || 'Untitled'}</p>
                                    {item.topic && <p className="text-xs text-[var(--c-muted)] mt-0.5">{item.topic}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {item.type && (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600/20 text-blue-400 font-mono">{item.type}</span>
                                    )}
                                    {item.created_at && (
                                        <span className="text-xs text-[var(--c-subtle)]">{new Date(item.created_at).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                            {item.path && (
                                <p className="text-xs text-[var(--c-subtle)] font-mono mt-2 truncate">{item.path}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SageOS;
