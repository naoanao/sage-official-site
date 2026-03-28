/**
 * src/utils/tracking.js
 * ──────────────────────────────────────────────────────────────
 * ファネルトラッキング ユーティリティ
 *
 * 以前は Landing.jsx / SageOS.jsx / SubscriberGate.jsx それぞれで
 * ほぼ同一の track() / trackEvent() 関数が重複定義されていた。
 * ここに一元化。
 *
 * 使い方:
 *   import { trackEvent } from '../utils/tracking'
 *   trackEvent('dashboard_visit')
 *   trackEvent('generate_done', { topic: 'AI tools' })
 */

import { isLocalhost } from './env';

/** セッションIDを localStorage から取得 or 生成 */
function getSessionId() {
  let sid = localStorage.getItem('sage_session_id');
  if (!sid) {
    sid = Math.random().toString(36).slice(2);
    localStorage.setItem('sage_session_id', sid);
  }
  return sid;
}

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

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, email, session_id: sid, metadata: extra }),
  }).catch(() => {}); // サイレント失敗（トラッキングでUXを壊さない）
}
