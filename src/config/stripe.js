// Stripe Payment Links Configuration
// src/config/links.js が正規の一元管理ファイル。
// こちらは Blog.jsx が参照しているため後方互換として残す。

export const STRIPE_LINKS = {
    // Subscription Products — Stripe
    bluesky:   'https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03', // Pro $20/mo
    instagram: 'https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03', // Pro $20/mo
    bundle:    'https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04', // Enterprise $99/mo

    // ブログCTA → Proプランへ誘導
    fortress:  'https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03', // Pro $20/mo
    developer: 'https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04', // Enterprise $99/mo
};

// UTM Parameters for tracking
export const addUTM = (url, source = 'website', medium = 'cta') => {
    const utm = `?utm_source=${source}&utm_medium=${medium}&utm_campaign=sage_direct`;
    return url.includes('?') ? `${url}&${utm.slice(1)}` : `${url}${utm}`;
};
