// src/api/dataverseClient.ts
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { dataverseScopes } from "../auth/msalConfig";

const dataverseUrl = import.meta.env.VITE_DATAVERSE_URL as string;

export function useDataverseClient() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  async function acquireToken(): Promise<string> {
    if (!account) {
      throw new Error("No active account");
    }

    try {
      const result = await instance.acquireTokenSilent({
        account,
        scopes: dataverseScopes,
      });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        const result = await instance.acquireTokenPopup({
          scopes: dataverseScopes,
        });
        return result.accessToken;
      }
      throw err;
    }
  }

  // ✅ GENERIC dvFetch
  async function dvFetch<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await acquireToken();

    const res = await fetch(
      `${dataverseUrl}/api/data/v9.2/${path}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "OData-Version": "4.0",
          "OData-MaxVersion": "4.0",
          ...(options.headers ?? {}),
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }

    return (res.status === 204 ? null : await res.json()) as T;
  }

  return { dvFetch };
}