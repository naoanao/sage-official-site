/**
 * CF Pages Functions — SPA fallback handler
 *
 * Serves index.html for all non-API, non-static-asset routes so that
 * React Router can handle client-side routing on direct URL navigation.
 *
 * Priority in CF Pages:
 *   functions/api/[[path]].js  (more specific) handles /api/**
 *   functions/[[path]].js      (this file)     handles everything else
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // 1. Let /api/** be handled by functions/api/[[path]].js
  if (pathname.startsWith('/api/')) {
    return context.next();
  }

  // 2. Let static assets (JS/CSS/images/fonts) be served directly
  if (pathname.includes('.')) {
    return context.next();
  }

  // 3. Let explicit redirects in _redirects (e.g. /offer → Gumroad) pass through
  if (pathname === '/offer') {
    return context.next();
  }

  // 4. All SPA routes → serve index.html (React Router handles the rest)
  return context.env.ASSETS.fetch(new URL('/index.html', context.request.url));
}
