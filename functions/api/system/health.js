/**
 * CF Pages Function: /api/system/health  (legacy alias)
 * ─────────────────────────────────────────────────────
 * ⚠️  DEPRECATED: The canonical health endpoint is now /api/health
 *     This file is kept for backward compatibility only.
 *     Update any callers to use /api/health instead.
 */
export async function onRequestGet(context) {
  const { env } = context;

  const checks = {
    groq_api: !!env.GROQ_API_KEY,
    stripe: !!env.STRIPE_SECRET_KEY,
    d1_database: !!env.SUBSCRIBERS_DB,
    make_webhook: !!env.MAKE_WEBHOOK_URL,
    telegram: !!env.TELEGRAM_BOT_TOKEN,
  };

  const allOk = Object.values(checks).every(Boolean);

  return new Response(JSON.stringify({
    status: allOk ? 'healthy' : 'degraded',
    mode: 'cloudflare_edge',
    checks,
    timestamp: new Date().toISOString(),
    workers: {
      sns_worker: 'sage-sns-worker.naofumi0930.workers.dev',
      replenisher: 'sage-content-replenisher.naofumi0930.workers.dev',
    },
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
