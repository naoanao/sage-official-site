import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';
import { TOAST_EVENT } from '../utils/toast';

const DURATION = 4000; // ms before auto-dismiss

const STYLES = {
    success: {
        bg:     'rgba(5,150,105,0.12)',
        border: 'rgba(5,150,105,0.3)',
        color:  'var(--c-emerald)',
        Icon:   FiCheckCircle,
    },
    error: {
        bg:     'rgba(192,57,43,0.12)',
        border: 'rgba(192,57,43,0.3)',
        color:  'var(--c-red, #ef4444)',
        Icon:   FiXCircle,
    },
    warn: {
        bg:     'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.3)',
        color:  '#f59e0b',
        Icon:   FiAlertTriangle,
    },
    info: {
        bg:     'rgba(99,102,241,0.12)',
        border: 'rgba(99,102,241,0.3)',
        color:  'var(--c-blue, #6366f1)',
        Icon:   FiInfo,
    },
};

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const toast = { ...e.detail };
            setToasts(prev => [...prev.slice(-4), toast]); // keep max 5
            setTimeout(() => remove(toast.id), DURATION);
        };
        document.addEventListener(TOAST_EVENT, handler);
        return () => document.removeEventListener(TOAST_EVENT, handler);
    }, [remove]);

    return (
        <div
            style={{
                position: 'fixed',
                top: '1.25rem',
                right: '1.25rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                pointerEvents: 'none',
                maxWidth: '22rem',
                width: '100%',
            }}
        >
            <AnimatePresence initial={false}>
                {toasts.map(t => {
                    const s = STYLES[t.type] || STYLES.info;
                    const { Icon } = s;
                    return (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 60, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 60, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            style={{
                                pointerEvents: 'all',
                                background: s.bg,
                                border: `1px solid ${s.border}`,
                                borderRadius: '0.875rem',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.625rem',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                            }}
                        >
                            <Icon
                                size={16}
                                style={{ color: s.color, flexShrink: 0, marginTop: '0.1rem' }}
                            />
                            <span
                                style={{
                                    color: 'var(--c-text)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    flex: 1,
                                    lineHeight: 1.4,
                                }}
                            >
                                {t.message}
                            </span>
                            <button
                                onClick={() => remove(t.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    color: 'var(--c-subtle)',
                                    flexShrink: 0,
                                    marginTop: '0.05rem',
                                }}
                                aria-label="Dismiss"
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
