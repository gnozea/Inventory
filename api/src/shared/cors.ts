/**
 * shared/cors.ts
 *
 * CORS headers for Azure Functions responses.
 *
 * With the Vite proxy in dev, CORS is bypassed entirely (same-origin).
 * These headers are a fallback for:
 *   - Direct API testing (Postman, curl, browser devtools)
 *   - Production deployments where frontend/API are on different origins
 */

// ── Dev: wildcard origin (fine behind Vite proxy) ───────────────────────
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

// ── Production: origin-aware (swap to this when you deploy) ─────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'https://super-acorn-pjvpxqgqx4rp26r5p-5174.app.github.dev',
  // Add your production frontend origin here when you deploy, e.g.:
  // 'https://your-app.azurewebsites.net',
];

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// ── Response wrapper ────────────────────────────────────────────────────
export function withCors(body: any, status: number = 200) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: status === 204 ? undefined : JSON.stringify(body),
  };
}