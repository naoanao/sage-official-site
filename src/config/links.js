/**
 * src/config/links.js
 * ──────────────────────────────────────────────────────────────
 * 外部リンク（購入URL）の一元管理
 *
 * 以前は Landing.jsx / SalesPage.jsx / BlogPost.jsx / Shop.jsx に
 * 同じ URL が重複してハードコードされていた。ここで一元管理する。
 *
 * URL を変更する場合はこのファイルだけ編集すれば全ページに反映される。
 *
 * 使い方:
 *   import { LINKS } from '../config/links'
 *   <a href={LINKS.stripe.pro}>...</a>
 */

export const LINKS = {
  /** Stripe サブスクリプション購入リンク */
  stripe: {
    pro:        'https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03',  // $20/月
    enterprise: 'https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04', // $99/月
  },

  /** Gumroad — デジタル商品（買い切り） */
  gumroad: {
    monetization: 'https://naofumi3.gumroad.com/l/yvzrfjd', // $29.99 AI Influencer Monetization Express
  },

  /** Whop — メンバーシップ */
  whop: {
    membership: 'https://whop.com/segeai/',
  },

  /** PayPal — 直接支払い */
  paypal: {
    direct: 'https://paypal.me/japanletgo/29.99',
  },

  /** SNS */
  sns: {
    bluesky:   'https://bsky.app/profile/naofumi.bsky.social',
    instagram: 'https://www.instagram.com/sege.ai/',
  },
};

// ──────────────────────────────────────────────────────────────
// 後方互換: SalesPage.jsx が STATIC_LINKS という名前で使っていた
// ──────────────────────────────────────────────────────────────
export const STATIC_LINKS = {
  whop:       LINKS.whop.membership,
  gumroad:    LINKS.gumroad.monetization,
  paypal:     LINKS.paypal.direct,
  proMonthly: LINKS.stripe.pro,
  enterprise: LINKS.stripe.enterprise,
};
