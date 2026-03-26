/**
 * CF Pages Function: /api/analytics
 * Owner-only funnel metrics dashboard
 *
 * GET /api/analytics?secret=ADMIN_KEY
 *
 * Returns the 5 activation metrics:
 *   1. modal_view_count          — LP → モーダル到達数
 *   2. payment_click_count       — モーダル → 支払いクリック数
 *   3. modal_to_payment_rate     — rate %
 *   4. activated_24h_count       — 支払い後24h以内に Generate した人数
 *   5. activated_24h_rate        — rate % of all subscribers
 *   6. publish_after_generate    — Generate → Publish 到達数
 *   7. publish_rate              — rate %
 *   8. return_day7_count         — 7日後再訪数
 *   9. return_day7_rate          — rate %
 *  10. total_subscribers         — 総サブスクライバー数
 *  11. recent_events             — 直近50件のイベントログ
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  // ── Auth: require ?secret= or X-Admin-Key header ─────────────────────────
  const url    = new URL(request.url);
  const secret = url.searchParams.get('secret') || request.headers.get('X-Admin-Key') || '';
  const adminKey = env.ADMIN_KEY || 'sage-admin-2026';
  if (secret !== adminKey) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (!env.DB) return json({ error: 'DB not bound' }, 500);

  try {
    const [
      modals,
      paymentClicks,
      subscribers,
      usageLogs,
      publishDone,
      day7Returns,
      recentEvents,
    ] = await Promise.all([
      // 1. Total modal views
      env.DB.prepare(`SELECT COUNT(*) as n FROM funnel_events WHERE event='modal_view'`).first(),

      // 2. Total payment clicks
      env.DB.prepare(`SELECT COUNT(*) as n FROM funnel_events WHERE event='payment_click'`).first(),

      // 3. All subscribers with created_at
      env.DB.prepare(`SELECT email, created_at, plan FROM subscribers WHERE status='active' ORDER BY created_at DESC`).all(),

      // 4. First generate per user (to compute 24h activation)
      env.DB.prepare(`
        SELECT email, MIN(date) as first_date, MIN(updated_at) as first_ts
        FROM usage_logs
        WHERE generate_count > 0
        GROUP BY email
      `).all(),

      // 5. publish_done events per unique user
      env.DB.prepare(`
        SELECT COUNT(DISTINCT COALESCE(email, session_id)) as n
        FROM funnel_events WHERE event='publish_done'
      `).first(),

      // 6. 7-day return: users who visited on day 1 AND again on day 7+
      env.DB.prepare(`
        SELECT COUNT(DISTINCT v1.email) as n
        FROM funnel_events v1
        JOIN funnel_events v7
          ON v1.email = v7.email
          AND v7.event = 'dashboard_visit'
          AND julianday(v7.created_at) - julianday(v1.created_at) >= 7
        WHERE v1.event = 'dashboard_visit'
          AND v1.email IS NOT NULL
      `).first(),

      // 7. Recent 50 events
      env.DB.prepare(`
        SELECT event, email, session_id, metadata, created_at
        FROM funnel_events
        ORDER BY created_at DESC
        LIMIT 50
      `).all(),
    ]);

    const subList    = subscribers.results  || [];
    const usageList  = usageLogs.results    || [];
    const eventList  = recentEvents.results || [];

    const totalSubs  = subList.length;
    const modalCount = modals?.n       ?? 0;
    const clickCount = paymentClicks?.n ?? 0;
    const pubCount   = publishDone?.n   ?? 0;
    const day7Count  = day7Returns?.n   ?? 0;

    // 24h activation: subscriber created_at vs first usage_log date
    const usageMap = new Map();
    for (const u of usageList) usageMap.set(u.email, u.first_ts || u.first_date);

    let activated24h = 0;
    for (const sub of subList) {
      const firstGen = usageMap.get(sub.email);
      if (!firstGen) continue;
      const subMs  = new Date(sub.created_at).getTime();
      const genMs  = new Date(firstGen).getTime();
      if (!isNaN(subMs) && !isNaN(genMs) && genMs - subMs <= 86_400_000) activated24h++;
    }

    // Generate → Publish: users who generated AND published
    const generatedEmails = new Set(usageList.map(u => u.email));
    const publishedEmails = new Set(
      eventList.filter(e => e.event === 'publish_done' && e.email).map(e => e.email)
    );
    // Also count from full publish query (not just last 50)
    const genCount = generatedEmails.size;

    const rate = (n, d) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

    // Daily generate trend (last 14 days from usage_logs)
    const trendRaw = await env.DB.prepare(`
      SELECT date, SUM(generate_count) as generates, COUNT(DISTINCT email) as users
      FROM usage_logs
      WHERE date >= date('now', '-14 days')
      GROUP BY date
      ORDER BY date ASC
    `).all();

    return json({
      generated_at: new Date().toISOString(),
      funnel: {
        modal_view_count:       modalCount,
        payment_click_count:    clickCount,
        modal_to_payment_rate:  rate(clickCount, modalCount),
        total_subscribers:      totalSubs,
        activated_24h_count:    activated24h,
        activated_24h_rate:     rate(activated24h, totalSubs),
        generate_unique_users:  genCount,
        publish_done_count:     pubCount,
        publish_rate:           rate(pubCount, genCount),
        return_day7_count:      day7Count,
        return_day7_rate:       rate(day7Count, totalSubs),
      },
      trend: trendRaw.results || [],
      recent_events: eventList,
    });

  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
