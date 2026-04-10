import type { Configuration } from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_TENANT_ID as string;
const clientId = import.meta.env.VITE_CLIENT_ID as string;

if (!tenantId || !clientId) {
  console.error(
    "[msalConfig] VITE_TENANT_ID or VITE_CLIENT_ID is missing from .env. " +
    "Create .env in project root:\n" +
    "  VITE_TENANT_ID=your-tenant-id\n" +
    "  VITE_CLIENT_ID=your-client-id"
  );
}

export const msalConfig: Configuration = {
  auth: {
    authority: `https://login.microsoftonline.com/common`,
    clientId,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    // Use localStorage so the session survives page reloads during redirect flow
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      logLevel: 3, // Error only; set to 0 for verbose debug
    },
  },
};

/**
 * Scopes for login.
 * "User.Read" is fine for the initial login — it gets basic profile info.
 */
export const loginRequest = {
  scopes: ["User.Read"],
};

/**
 * Scopes for calling YOUR backend API (/api/me, /api/equipment, etc.)
 *
 * The backend validates: audience === AZURE_AD_CLIENT_ID
 * So the token must be scoped to YOUR app, not Microsoft Graph.
 *
 * Option A (recommended): If you've set up "Expose an API" in Azure AD:
 *   export const apiScopes = [`api://${clientId}/access_as_user`];
 *
 * Option B: Use .default to get a token scoped to your app:
 *   export const apiScopes = [`${clientId}/.default`];
 *
 * Option C (BROKEN — current issue): Graph token has wrong audience:
 *   export const apiScopes = ["User.Read"];
 */
export const apiScopes = [`api://${clientId}/access_as_user`];