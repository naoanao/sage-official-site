import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiAlertTriangle, FiInfo, FiXCircle } from 'react-icons/fi';
import { TOAST_EVENT } from '../utils/toast';

const STYLES = {
    success: { bg: 'bg-emerald-950/95 border-emerald-500/40', icon: <FiCheck />,         text: 'text-emerald-400' },
    error:   { bg: 'bg-red-950/95 border-red-500/40',         icon: <FiXCircle />,       text: 'text-red-400' },
    warn:    { bg: 'bg-yellow-950/95 border-yellow-500/40',   icon: <FiAlertTriangle />, text: 'text-yellow-400' },
    info:    { bg: 'bg-blue-950/95 border-blue-500/40',       icon: <FiInfo />,          text: 'text-blue-400' },
};

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (e) => {
            const t = e.detail;
            setToasts(prev => [...prev, t]);
            setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration);
        };
        window.addEventListener(TOAST_EVENT, handler);
        return () => window.removeEventListener(TOAST_EVENT, handler);
    }, []);

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(t => {
                    const s = STYLES[t.type] || STYLES.info;
                    return (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 80, scale: 0.92 }}
                            animate={{ opacity: 1, x: 0,  scale: 1 }}
                            exit={{    opacity: 0, x: 80, scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm backdrop-blur-sm shadow-2xl w-80 ${s.bg}`}
                        >
                            <span className={`mt-0.5 shrink-0 ${s.text}`}>{s.icon}</span>
                            <span className="flex-1 text-white/90 leading-snug">{t.message}</span>
                            <button
                                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                                className="mt-0.5 shrink-0 text-white/30 hover:text-white/70 transition-colors"
                            >
                                <FiX size={13} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
