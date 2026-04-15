/**
 * shared/cors.ts
 *
 * CORS headers for Azure Functions responses.
 * Production allows only the SWA origin. Development additionally permits
 * localhost and Codespaces, gated by AZURE_FUNCTIONS_ENVIRONMENT.
 */

const PRODUCTION_ORIGIN = 'https://black-rock-09f33ef0f.7.azurestaticapps.net';

const DEV_ORIGINS = [
  'http://localhost:5174',
  'https://super-acorn-pjvpxqgqx4rp26r5p-5174.app.github.dev',
];

const ALLOWED_ORIGINS: string[] =
  process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development'
    ? [PRODUCTION_ORIGIN, ...DEV_ORIGINS]
    : [PRODUCTION_ORIGIN];

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'X-MSAL-Token, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  // Only emit Access-Control-Allow-Origin when the request origin is explicitly allowed.
  // Unrecognised origins receive no ACAO header — browsers will block the response.
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    base['Access-Control-Allow-Origin'] = requestOrigin;
  }

  return base;
}

// For backward compatibility - use specific origin
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://black-rock-09f33ef0f.7.azurestaticapps.net',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'X-MSAL-Token, Content-Type',
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