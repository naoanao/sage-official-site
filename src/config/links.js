/**
 * src/config/links.js
 * ──────────────────────────────────────────────────────────────
 * External link (payment URL) central management.
 * Edit this file to update links across all pages.
 *
 * Usage:
 *   import { LINKS } from '../config/links'
 *   <a href={LINKS.stripe.pro}>...</a>
 *
 * NOTE: Replace all placeholder values (#) with your actual URLs
 * before deploying. Set them as VITE_* environment variables.
 */

export const LINKS = {
  /** Stripe subscription purchase links */
  stripe: {
    pro:        import.meta.env.VITE_STRIPE_PRO_URL || 'https://buy.stripe.com/dRmcN6eYM4V7fO785893y09',
    enterprise: import.meta.env.VITE_STRIPE_ENT_URL || 'https://buy.stripe.com/eVq4gA7wkafr9pJ85893y06',
  },

  /** Gumroad — primary product: Sage 3.0 Developer Blueprint ($49) */
  gumroad: {
    monetization: import.meta.env.VITE_GUMROAD_URL || 'https://naofumi3.gumroad.com/l/apvbzh',
  },

  /** Whop — membership */
  whop: {
    membership: import.meta.env.VITE_WHOP_URL || 'https://whop.com/segeai/',
  },

  /** PayPal — direct payment */
  paypal: {
    direct: import.meta.env.VITE_PAYPAL_URL || 'https://paypal.me/japanletgo',
  },

  /** Support contact */
  support: {
    email: import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app',
  },

  /** Social media */
  sns: {
    bluesky:   import.meta.env.VITE_BLUESKY_URL   || 'https://bsky.app/profile/kanagawajapan.bsky.social',
    instagram: import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/sege.ai/',
  },
};

// ──────────────────────────────────────────────────────────────
// Backward compat: SalesPage.jsx uses STATIC_LINKS
// ──────────────────────────────────────────────────────────────
export const STATIC_LINKS = {
  whop:       LINKS.whop.membership,
  gumroad:    LINKS.gumroad.monetization,
  paypal:     LINKS.paypal.direct,
  proMonthly: LINKS.stripe.pro,
  enterprise: LINKS.stripe.enterprise,
};
