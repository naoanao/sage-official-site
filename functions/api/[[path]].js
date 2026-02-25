/**
 * CF Pages Functions — /api/** proxy
 *
 * Priority for backend URL:
 *   1. BACKEND_URL env var (set in CF Pages dashboard or via API)
 *   2. Compiled-in URL from ../_backend.js (auto-updated by run_sage.ps1 via git)
 *
 * This eliminates cross-origin calls: the browser always hits the same
 * pages.dev origin, and this function forwards to the Flask backend.
 */
import { BACKEND_URL as STATIC_URL } from "../_backend.js";

export async function onRequest(context) {
  const { request, env } = context;

  // ── CORS preflight ──────────────────────────────────────────────────────
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // ── Resolve backend URL ─────────────────────────────────────────────────
  const backendUrl = (env.BACKEND_URL || STATIC_URL || "").replace(/\/$/, "");
  if (!backendUrl) {
    return new Response(JSON.stringify({ error: "Backend URL not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Forward request ─────────────────────────────────────────────────────
  const url = new URL(request.url);
  const target = `${backendUrl}${url.pathname}${url.search}`;

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete("host");

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: forwardHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
    });

    const resHeaders = new Headers(upstream.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Backend unreachable", detail: String(err) }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
