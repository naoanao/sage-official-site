// Event-based toast — no Context needed, works from any file
export const TOAST_EVENT = 'sage-toast';

function dispatch(type, message, duration = 4000) {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
        detail: { type, message, duration, id: Date.now() + Math.random() },
    }));
}

const toast = {
    success: (msg, dur) => dispatch('success', msg, dur),
    error:   (msg, dur) => dispatch('error',   msg, dur),
    warn:    (msg, dur) => dispatch('warn',     msg, dur),
    info:    (msg, dur) => dispatch('info',     msg, dur),
};

export default toast;
