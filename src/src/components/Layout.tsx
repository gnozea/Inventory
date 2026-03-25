import { NavLink, Outlet } from "react-router-dom";

const sidebarWidth = 180;

export default function Layout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          backgroundColor: "#1f2933",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          padding: "16px",
        }}
      >
        {/* Agency name */}
        <div style={{ fontWeight: "bold", marginBottom: "24px" }}>
          Agency Name
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li>
              <NavLink to="/" style={navLinkStyle}>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/equipment" style={navLinkStyle}>
                My Equipment
              </NavLink>
            </li>
            <li>
              <NavLink to="/search" style={navLinkStyle}>
                Global Search
              </NavLink>
            </li>
            <li>
              <NavLink to="/reports" style={navLinkStyle}>
                Reports
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin" style={navLinkStyle}>
                Admin
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* User info */}
        <div style={{ fontSize: "12px", opacity: 0.8 }}>
          <div>User Name</div>
          <div>Role</div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "24px" }}>
        <Outlet />
      </main>
    </div>
  );
}

function navLinkStyle({ isActive }: { isActive: boolean }) {
  return {
    display: "block",
    padding: "8px 0",
    color: isActive ? "#60a5fa" : "#ffffff",
    textDecoration: "none",
    fontWeight: isActive ? "bold" : "normal",
  };
}
