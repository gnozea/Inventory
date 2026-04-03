// src/auth/msalConfig.ts
import type { Configuration } from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_TENANT_ID as string;
const clientId = import.meta.env.VITE_CLIENT_ID as string;
const dataverseUrl = import.meta.env.VITE_DATAVERSE_URL as string;

export const msalConfig: Configuration = {
  auth: {
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientId,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const dataverseScopes = [`${dataverseUrl}/.default`];
