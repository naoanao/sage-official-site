/**
 * Lightweight event-based toast system — no Context or external libs required.
 * Usage anywhere (components, async functions, etc.):
 *   import { toast } from '../utils/toast'
 *   toast.success('Saved!')
 *   toast.error('Failed to connect to backend')
 *   toast.info('Copying...')
 */

const TOAST_EVENT = 'sage:toast';

export const toast = {
    success: (message) => _emit(message, 'success'),
    error:   (message) => _emit(message, 'error'),
    info:    (message) => _emit(message, 'info'),
    warn:    (message) => _emit(message, 'warn'),
};

function _emit(message, type) {
    document.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
            detail: { message, type, id: Date.now() + Math.random() },
        })
    );
}

export { TOAST_EVENT };
