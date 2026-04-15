/**
 * shared/cors.ts
 *
 * CORS headers for Azure Functions responses.
 */

const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'https://black-rock-09f33ef0f.7.azurestaticapps.net',
  'https://super-acorn-pjvpxqgqx4rp26r5p-5174.app.github.dev',
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

// For backward compatibility - use specific origin
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://black-rock-09f33ef0f.7.azurestaticapps.net',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

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