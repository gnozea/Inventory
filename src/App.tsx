import {
  Routes as RouterRoutes,
  Route,
  Navigate as RouterNavigate,
} from "react-router-dom";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import EquipmentList from "./pages/EquipmentList";
import EquipmentDetail from "./pages/EquipmentDetail";
import AddEquipment from "./pages/AddEquipment";
import GlobalSearch from "./pages/GlobalSearch";
import Reports from "./pages/Reports";
import Admin, {
  AdminHome,
  SystemConfigSettings,
  ReferenceDataSettings,
  AgenciesSettings,
  GlobalUsersSettings,
  RolesPermissionsSettings,
  AuditDiagnosticsSettings,
  AgencyProfileSettings,
  NotificationsSettings,
  AgencyUsersSettings,
  AgencyRolesSettings,
  DefaultEquipmentValuesSettings,
  ReportingPreferencesSettings,
} from "./pages/Admin";
import AccessDenied from "./components/AccessDenied";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { loginRequest } from "./auth/msalConfig";

// ── Loading screen ──────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#6b7280" }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Login prompt (uses REDIRECT, not popup) ─────────────────────────────

function LoginPrompt() {
  const { instance } = useMsal();

  const handleLogin = () => {
    // loginRedirect works in Codespaces; loginPopup does NOT
    // (Codespaces sets Cross-Origin-Opener-Policy headers that block popups)
    instance.loginRedirect(loginRequest);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
        Emergency Response Equipment System
      </h1>
      <p style={{ color: "#6b7280" }}>
        Sign in with your organization account to continue.
      </p>
      <button
        onClick={handleLogin}
        style={{
          padding: "0.75rem 2rem",
          fontSize: "1rem",
          fontWeight: 500,
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Sign In
      </button>
    </div>
  );
}

// ── Error screen ────────────────────────────────────────────────────────

function ErrorScreen({ error }: { error: Error }) {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#fef2f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
        }}
      >
        ⚠
      </div>
      <h2 style={{ color: "#dc2626", margin: 0 }}>
        Unable to load your profile
      </h2>
      <p
        style={{
          color: "#6b7280",
          maxWidth: 500,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {error.message}
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.5rem 1.5rem",
            background: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.5rem 1.5rem",
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();
  const { user, isLoading, error } = useCurrentUser();

  // ── Gate 1: MSAL still processing (login/logout/token acquisition) ──
  if (inProgress !== InteractionStatus.None) {
    return <LoadingScreen message="Authenticating..." />;
  }

  // ── Gate 2: Not logged in ──
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  // ── Gate 3: Profile loading from /api/me ──
  if (isLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  // ── Gate 4: Error or user not in DB ──
  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (!user) {
    return (
      <ErrorScreen
        error={
          new Error(
            "Your account was not found in the system. " +
              "Contact your administrator to get access."
          )
        }
      />
    );
  }

  // ── Gate 5: User loaded — compute permissions ──

  const isSystemAdmin = user.role === "SystemAdmin";
  const isGlobalViewer = user.role === "GlobalViewer";
  const isAgencyAdmin = user.role === "AgencyAdmin";
  const isAgencyUser = user.role === "AgencyUser";
  const isAgencyReporter = user.role === "AgencyReporter";

  const isAgencyScopedEditor = isAgencyAdmin || isAgencyUser;

  const canViewDashboard =
    isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;
  const canViewInventory =
    isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;
  const canViewEquipmentDetail = canViewInventory;
  const canViewReports =
    isSystemAdmin ||
    isGlobalViewer ||
    isAgencyScopedEditor ||
    isAgencyReporter;
  const canAddEquipment = isSystemAdmin || isAgencyScopedEditor;
  const canViewSettings = isSystemAdmin || isAgencyAdmin;

  return (
    <RouterRoutes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={canViewDashboard ? <Dashboard /> : <AccessDenied />}
        />
        <Route
          path="/equipment"
          element={canViewInventory ? <EquipmentList /> : <AccessDenied />}
        />
        <Route
          path="/equipment/:id"
          element={
            canViewEquipmentDetail ? <EquipmentDetail /> : <AccessDenied />
          }
        />
        <Route
          path="/equipment/new"
          element={canAddEquipment ? <AddEquipment /> : <AccessDenied />}
        />
        <Route
          path="/locations"
          element={canViewInventory ? <EquipmentList /> : <AccessDenied />}
        />
        <Route
          path="/search"
          element={
            isSystemAdmin || isGlobalViewer ? (
              <GlobalSearch />
            ) : (
              <AccessDenied />
            )
          }
        />
        <Route
          path="/reports"
          element={canViewReports ? <Reports /> : <AccessDenied />}
        />
        <Route
          path="/admin"
          element={canViewSettings ? <Admin /> : <AccessDenied />}
        >
          <Route index element={<AdminHome />} />
          <Route path="system-config" element={<SystemConfigSettings />} />
          <Route path="reference-data" element={<ReferenceDataSettings />} />
          <Route path="agencies" element={<AgenciesSettings />} />
          <Route path="global-users" element={<GlobalUsersSettings />} />
          <Route
            path="roles-permissions"
            element={<RolesPermissionsSettings />}
          />
          <Route
            path="audit-diagnostics"
            element={<AuditDiagnosticsSettings />}
          />
          <Route path="agency-profile" element={<AgencyProfileSettings />} />
          <Route path="notifications" element={<NotificationsSettings />} />
          <Route path="agency-users" element={<AgencyUsersSettings />} />
          <Route path="agency-roles" element={<AgencyRolesSettings />} />
          <Route
            path="default-equipment-values"
            element={<DefaultEquipmentValuesSettings />}
          />
          <Route
            path="reporting-preferences"
            element={<ReportingPreferencesSettings />}
          />
        </Route>
        <Route path="*" element={<RouterNavigate to="/" replace />} />
      </Route>
    </RouterRoutes>
  );
}