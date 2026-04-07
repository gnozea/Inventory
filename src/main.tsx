import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  PublicClientApplication,
  EventType,
  type EventMessage,
  type AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./auth/msalConfig";
import App from "./App";
import "./index.css";

// ── MSAL instance ───────────────────────────────────────────────────────

const pca = new PublicClientApplication(msalConfig);

pca.addEventCallback((event: EventMessage) => {
  if (
    (event.eventType === EventType.LOGIN_SUCCESS ||
      event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) &&
    event.payload
  ) {
    const result = event.payload as AuthenticationResult;
    if (result.account) {
      pca.setActiveAccount(result.account);
    }
  }
});

// ── React Query ─────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 0,
    },
  },
});

// ── Router ──────────────────────────────────────────────────────────────

const router = createBrowserRouter(
  [{ path: "*", element: <App /> }],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    } as any,
  }
);

// ── Bootstrap ───────────────────────────────────────────────────────────

async function bootstrap() {
  // 1. Initialize MSAL
  await pca.initialize();

  // 2. Handle redirect response (returns null if not coming back from a redirect)
  const response = await pca.handleRedirectPromise();
  if (response?.account) {
    pca.setActiveAccount(response.account);
    console.log("[bootstrap] Redirect login success:", response.account.username);
  }

  // 3. If no active account, try to pick one from cache
  if (!pca.getActiveAccount()) {
    const accounts = pca.getAllAccounts();
    if (accounts.length > 0) {
      pca.setActiveAccount(accounts[0]);
      console.log("[bootstrap] Restored cached account:", accounts[0].username);
    }
  }

  // 4. Render
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <MsalProvider instance={pca}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider
            router={router}
            future={{ v7_startTransition: true } as any}
          />
        </QueryClientProvider>
      </MsalProvider>
    </React.StrictMode>
  );
}

bootstrap().catch((err) => {
  console.error("[bootstrap] Fatal error:", err);
  document.getElementById("root")!.innerHTML =
    '<div style="padding:2rem;font-family:monospace">' +
    '<h2 style="color:#dc2626">App failed to start</h2>' +
    `<pre style="white-space:pre-wrap">${err.message}\n\n${err.stack || ""}</pre>` +
    "</div>";
});