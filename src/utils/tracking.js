/**
 * src/utils/tracking.js
 * ──────────────────────────────────────────────────────────────
 * ファネルトラッキング ユーティリティ
 *
 * 使い方:
 *   import { trackEvent, addUTM, initUTMCapture } from '../utils/tracking'
 *
 *   // イベント送信
 *   trackEvent('payment_click', { source: 'blog', product: 'developer_blueprint' })
 *
 *   // UTM付きURLを生成
 *   const url = addUTM('https://naofumi3.gumroad.com/l/apvbzh', {
 *     source: 'bluesky', medium: 'social', campaign: 'ai_automation'
 *   })
 *
 *   // ページロード時にURLのUTMパラメータを自動取得・保存
 *   initUTMCapture()  // App.jsx の useEffect で一度だけ呼ぶ
 */

import { isLocalhost } from './env';

// ── セッションID ───────────────────────────────────────────────
function getSessionId() {
  let sid = localStorage.getItem('sage_session_id');
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem('sage_session_id', sid);
  }
  return sid;
}

// ── UTMパラメータ管理 ──────────────────────────────────────────
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

/**
 * 現在のURLのUTMパラメータをlocalStorageに保存する。
 * App.jsx の useEffect で一度だけ呼ぶこと。
 */
export function initUTMCapture() {
  try {
    const params = new URLSearchParams(window.location.search);
    const captured = {};
    UTM_KEYS.forEach(key => {
      const val = params.get(key);
      if (val) {
        localStorage.setItem(`sage_${key}`, val);
        captured[key] = val;
      }
    });
    // referrerも保存（初回のみ）
    if (document.referrer && !localStorage.getItem('sage_referrer')) {
      localStorage.setItem('sage_referrer', document.referrer);
    }
    if (Object.keys(captured).length > 0) {
      trackEvent('utm_captured', captured);
    }
  } catch {
    // ブラウザ制限でも無視
  }
}

/**
 * 保存されているUTMパラメータを取得する。
 * @returns {{ utm_source, utm_medium, utm_campaign, ... }}
 */
export function getSavedUTM() {
  const utm = {};
  try {
    UTM_KEYS.forEach(key => {
      const val = localStorage.getItem(`sage_${key}`);
      if (val) utm[key] = val;
    });
    const ref = localStorage.getItem('sage_referrer');
    if (ref) utm.referrer = ref;
  } catch { /* ignore */ }
  return utm;
}

/**
 * URLにUTMパラメータを付与して返す。
 * @param {string} baseUrl  ベースURL (例: 'https://naofumi3.gumroad.com/l/apvbzh')
 * @param {object} utmParams  { source, medium, campaign, content?, term? }
 * @returns {string}  UTM付きURL
 *
 * @example
 *   addUTM('https://naofumi3.gumroad.com/l/apvbzh', {
 *     source: 'blog', medium: 'article_cta', campaign: 'developer_blueprint'
 *   })
 *   // → 'https://naofumi3.gumroad.com/l/apvbzh?utm_source=blog&utm_medium=article_cta&...'
 */
export function addUTM(baseUrl, { source, medium, campaign, content, term } = {}) {
  try {
    const url = new URL(baseUrl);
    if (source)   url.searchParams.set('utm_source',   source);
    if (medium)   url.searchParams.set('utm_medium',   medium);
    if (campaign) url.searchParams.set('utm_campaign', campaign);
    if (content)  url.searchParams.set('utm_content',  content);
    if (term)     url.searchParams.set('utm_term',     term);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// ── よく使うUTM付きGumroad URL を一元管理 ────────────────────────
export const GUMROAD_BASE = 'https://naofumi3.gumroad.com/l/apvbzh';

export function gumroadURL(source, medium = 'cta', campaign = 'developer_blueprint') {
  return addUTM(GUMROAD_BASE, { source, medium, campaign });
}

// ── トラッキングイベント送信 ──────────────────────────────────────
/**
 * トラッキングイベントを /api/track へ送信
 * @param {string} event   イベント名
 * @param {object} extra   追加メタデータ（任意）
 */
export function trackEvent(event, extra = {}) {
  // ローカル環境ではトラッキングしない（オーナーのデータを汚染しない）
  if (isLocalhost()) return;

  const email = localStorage.getItem('sage_subscriber_email') || null;
  const sid   = getSessionId();
  const utm   = getSavedUTM();

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      email,
      session_id: sid,
      metadata: { ...utm, ...extra },
    }),
  }).catch(() => {}); // サイレント失敗
}

// ── ページビュートラッキング（App.jsx から呼ぶ） ────────────────────
export function trackPageView(path) {
  trackEvent('page_view', { path: path || window.location.pathname });
}
