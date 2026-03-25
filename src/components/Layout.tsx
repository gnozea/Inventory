import { NavLink, Outlet } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import DevToolbar from "./DevToolbar";

export default function Layout() {
  const user = useCurrentUser();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 180,
          background: "#1f2933",
          color: "#fff",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <strong style={{ marginBottom: 24 }}>{user.agency}</strong>

        <nav style={{ flex: 1 }}>
          <NavLink to="/">Dashboard</NavLink>
          <br />
          <NavLink to="/equipment">My Equipment</NavLink>
          <br />

          {(user.role === "SystemAdmin" ||
            user.role === "GlobalViewer") && (
            <>
              <NavLink to="/search">Global Search</NavLink>
              <br />
            </>
          )}

          <NavLink to="/reports">Reports</NavLink>
          <br />

          {user.role === "SystemAdmin" && (
            <>
              <NavLink to="/admin">Admin</NavLink>
              <br />
            </>
          )}
        </nav>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {user.name}
          <br />
          {user.role}
        </div>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>

      <DevToolbar />
    </div>
  );
}
