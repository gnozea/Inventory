import { NavLink, Outlet } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import DevToolbar from "./DevToolbar";
import TopBar from "./TopBar";

const SIDEBAR_WIDTH = 180;

export default function Layout() {
  const user = useCurrentUser();

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

  const canViewReports =
    isSystemAdmin ||
    isGlobalViewer ||
    isAgencyScopedEditor ||
    isAgencyReporter;

  const canViewSettings =
    isSystemAdmin || isAgencyAdmin;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar />

      <div style={{ display: "flex", flex: 1 }}>
        <aside
          style={{
            width: SIDEBAR_WIDTH,
            background: "#f7f7f3",
            borderRight: "1px solid #e5e7eb",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 0.5,
                marginBottom: 16,
              }}
            >
              {user.agency.toUpperCase()}
            </div>

            <NavGroup>
              {canViewDashboard && (
                <NavItem to="/">Dashboard</NavItem>
              )}

              {canViewInventory && (
                <>
                  <NavItem to="/equipment">My equipment</NavItem>
                  <NavItem to="/locations">Locations</NavItem>
                </>
              )}

              {canViewReports && (
                <NavItem to="/reports">Reports</NavItem>
              )}
            </NavGroup>
          </div>

          <div>
            {(isGlobalViewer || isSystemAdmin) && (
              <NavGroup>
                <NavItem to="/search">Global search</NavItem>
              </NavGroup>
            )}

            {canViewSettings && (
              <NavGroup>
                <NavItem to="/admin">Settings</NavItem>
              </NavGroup>
            )}
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            padding: 24,
            background: "#f9fafb",
          }}
        >
          <Outlet />
        </main>
      </div>

      <DevToolbar />
    </div>
  );
}

/* ---------- helpers ---------- */

function NavGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}>{children}</div>;
}

function NavItem({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        display: "block",
        padding: "8px 10px",
        borderRadius: 6,
        marginBottom: 4,
        fontSize: 14,
        textDecoration: "none",
        color: "#111827",
        background: isActive ? "#e5f0ff" : "transparent",
        fontWeight: isActive ? 600 : 400,
      })}
    >
      {children}
    </NavLink>
  );
}
