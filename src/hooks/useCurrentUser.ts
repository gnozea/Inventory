import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useQuery } from "@tanstack/react-query";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiScopes } from "../auth/msalConfig";

// ── Types ───────────────────────────────────────────────────────────────

export type UserRole =
  | "AgencyUser"
  | "AgencyAdmin"
  | "AgencyReporter"
  | "GlobalViewer"
  | "SystemAdmin";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  agency: string;
  agencyId: string;
  businessUnitId: string;
}

export interface UseCurrentUserResult {
  user: CurrentUser | null;
  isLoading: boolean;
  error: Error | null;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useCurrentUser(): UseCurrentUserResult {
  const { accounts, instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts[0];

  const { data, isLoading, error } = useQuery<CurrentUser>({
    queryKey: ["currentUser", account?.localAccountId],
    enabled: isAuthenticated && !!account,
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
    retry: 1,

    queryFn: async (): Promise<CurrentUser> => {
      // ── Step 1: Acquire access token with correct audience ──
      //
      // apiScopes must be scoped to YOUR app registration, not Graph.
      // See msalConfig.ts for the scope options.
      //
      let tokenResponse;
      try {
        tokenResponse = await instance.acquireTokenSilent({
          account,
          scopes: apiScopes,
        });
      } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
          // In Codespaces, popups are blocked by COOP headers.
          // Use redirect instead — the page will reload after consent.
          console.warn(
            "[useCurrentUser] Silent token failed, redirecting for consent"
          );
          await instance.acquireTokenRedirect({
            scopes: apiScopes,
            account,
          });
          // acquireTokenRedirect navigates away — this code won't continue.
          // Return a placeholder; the page will reload with the token.
          throw new Error("Redirecting for authentication...");
        }
        throw err;
      }

      if (!tokenResponse?.accessToken) {
        throw new Error("No access token received from MSAL");
      }

      // ── Step 2: Call /api/me ──
      //
      // RELATIVE URL: goes through Vite proxy → localhost:7071
      // Do NOT use an absolute API_URL — that bypasses the proxy and hits CORS.
      //
      console.log("[useCurrentUser] Calling /api/me");

      // CORRECT - use environment variable
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/me`, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[useCurrentUser] /api/me failed (${res.status}):`,
          body
        );

        if (res.status === 401) {
          throw new Error(
            "Authentication failed — your token may have the wrong audience. " +
            "Check that apiScopes in msalConfig.ts matches your Azure AD 'Expose an API' scope."
          );
        }
        if (res.status === 502) {
          throw new Error(
            "API is not running. Start Azure Functions with: func start"
          );
        }
        throw new Error(`/api/me returned HTTP ${res.status}`);
      }

      const user = await res.json();
      console.log(
        "[useCurrentUser] Profile loaded:",
        user.name,
        user.role
      );

      return {
        id: user.azureAdObjectId,
        name: user.name,
        role: user.role as UserRole,
        agency: user.agencyName ?? user.agency_name ?? "Unknown",
        agencyId: user.agencyId,
        businessUnitId: user.agencyId,
      };
    },
  });

  return {
    user: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}