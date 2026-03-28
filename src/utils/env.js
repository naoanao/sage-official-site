/**
 * src/utils/env.js
 * ──────────────────────────────────────────────────────────────
 * 環境判定ユーティリティ
 *
 * 以前は Landing.jsx / SageOS.jsx / SubscriberGate.jsx それぞれで
 * 同じ localhost チェックが重複定義されていた。ここに一元化。
 *
 * 使い方:
 *   import { isLocalhost, isOwner } from '../utils/env'
 */

/**
 * ブラウザが localhost / 127.0.0.1 で動いているか判定
 * → オーナー（naoさん）がローカル実行中 = true
 * → Cloudflare Pages 上のユーザー = false
 */
export const isLocalhost = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

/**
 * isLocalhost の別名（IS_OWNER という変数名で使っているコードとの互換）
 */
export const isOwner = isLocalhost;
