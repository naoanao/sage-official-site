// Production (Cloudflare Pages): use same-origin
//   — /api/** is handled by Pages Functions (functions/api/[[path]].js)
//   — no cross-origin, no CORS issues
// Development: call Flask backend directly on localhost:8080
export const BACKEND_URL = import.meta.env.PROD ? "" : "http://localhost:8080";
