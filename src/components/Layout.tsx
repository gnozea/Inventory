import { NavLink, Outlet } from "react-router-dom";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import DevToolbar from "./DevToolbar";
import TopBar from "./TopBar";
import { loginRequest } from "../auth/msalConfig";

const SIDEBAR_WIDTH = 220;

export default function Layout() {
  const { inProgress, instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { user } = useCurrentUser();

  if (inProgress === "startup" || inProgress === "handleRedirect") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#f9fafb", color: "#6b7280", fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  if (!isAuthenticated && inProgress === "none") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", gap: 16, background: "#f9fafb",
      }}>
        <div style={{
          width: 56, height: 56, background: "#0f172a", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: "#fff",
        }}>ER</div>
        <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>
          Emergency Response Equipment Portal
        </h2>
        <p style={{ color: "#6b7280", margin: 0, fontSize: 14 }}>
          East-West Gateway Council of Governments
        </p>
        <button
          onClick={() => instance.loginRedirect(loginRequest)}
          style={{
            marginTop: 8, padding: "10px 32px", fontSize: 14,
            cursor: "pointer", borderRadius: 8, border: "none",
            background: "#0f172a", color: "#fff", fontWeight: 600,
          }}
        >
          Sign in with Microsoft
        </button>
      </div>
    );
  }

  // user may be null briefly while loading — App.tsx gates this,
  // but guard here too for safety
  if (!user) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#f9fafb", color: "#6b7280", fontSize: 14,
      }}>
        Loading profile…
      </div>
    );
  }

  const isSystemAdmin    = user.role === "SystemAdmin";
  const isGlobalViewer   = user.role === "GlobalViewer";
  const isAgencyAdmin    = user.role === "AgencyAdmin";
  const isAgencyUser     = user.role === "AgencyUser";
  const isAgencyReporter = user.role === "AgencyReporter";
  const isAgencyScopedEditor = isAgencyAdmin || isAgencyUser;

  const canViewDashboard = isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;
  const canViewInventory = isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;
  const canViewReports   = isSystemAdmin || isGlobalViewer || isAgencyScopedEditor || isAgencyReporter;
  const canViewSettings  = isSystemAdmin || isAgencyAdmin;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{
          width: SIDEBAR_WIDTH, background: "#1e293b",
          display: "flex", flexDirection: "column",
          flexShrink: 0, borderRight: "1px solid #0f172a",
        }}>
          <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #334155" }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1,
              color: "#64748b", marginBottom: 4, textTransform: "uppercase",
            }}>Agency</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3 }}>
              {user.agency}
            </div>
          </div>

          <nav style={{ flex: 1, padding: "12px 8px" }}>
            <NavSection label="Main">
              {canViewDashboard && <SidebarItem to="/" icon="⊞">Dashboard</SidebarItem>}
              {canViewInventory && <SidebarItem to="/equipment" icon="◫">My equipment</SidebarItem>}
              {canViewInventory && <SidebarItem to="/locations" icon="◎">Locations</SidebarItem>}
              {canViewReports   && <SidebarItem to="/reports"   icon="▤">Reports</SidebarItem>}
            </NavSection>

            {(isGlobalViewer || isSystemAdmin) && (
              <NavSection label="Cross-agency">
                <SidebarItem to="/search" icon="⌕">Global search</SidebarItem>
              </NavSection>
            )}

            {canViewSettings && (
              <NavSection label="Admin">
                <SidebarItem to="/admin" icon="⚙">Settings</SidebarItem>
              </NavSection>
            )}
          </nav>

          <div style={{
            padding: "12px 16px", borderTop: "1px solid #334155",
            fontSize: 11, color: "#64748b",
          }}>
            Signed in as {user.role}
          </div>
        </aside>

        <main style={{ flex: 1, padding: "28px 32px", background: "#f8fafc", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
      <DevToolbar />
    </div>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1,
        color: "#475569", textTransform: "uppercase",
        padding: "0 8px", marginBottom: 4,
      }}>{label}</div>
      {children}
    </div>
  );
}

function SidebarItem({ to, icon, children }: { to: string; icon: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 6, marginBottom: 2,
        fontSize: 13, textDecoration: "none",
        color: isActive ? "#fff" : "#94a3b8",
        background: isActive ? "#3b82f6" : "transparent",
        fontWeight: isActive ? 600 : 400,
      })}
    >
      <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>{icon}</span>
      {children}
    </NavLink>
  );
}