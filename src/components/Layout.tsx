import { NavLink, Outlet } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

const SIDEBAR_WIDTH = 180;

export default function Layout() {
  const user = useCurrentUser();

  const isSystemAdmin = user.role === "SystemAdmin";
  const isGlobalViewer = user.role === "GlobalViewer";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
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
        {/* Top section */}
        <div>
          {/* Agency name */}
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
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/equipment">My equipment</NavItem>
            <NavItem to="/locations">Locations</NavItem>
            <NavItem to="/reports">Reports</NavItem>
            <NavItem to="/status-updates">Status updates</NavItem>
          </NavGroup>
        </div>

        {/* Bottom section */}
        <div>
          {(isGlobalViewer || isSystemAdmin) && (
            <NavGroup>
              <NavItem to="/search">Global search</NavItem>
            </NavGroup>
          )}

          {isSystemAdmin && (
            <NavGroup>
              <NavItem to="/admin">Settings</NavItem>
            </NavGroup>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
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
