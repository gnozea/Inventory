import { useMsal } from "@azure/msal-react";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function TopBar() {
  const { instance } = useMsal();
  const user = useCurrentUser();

  return (
    <div style={{
      height: 56,
      background: "#0f172a",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: 16,
      width: "100%",
      boxSizing: "border-box",
      borderBottom: "1px solid #1e293b",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, background: "#3b82f6",
          borderRadius: 8, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 14, fontWeight: 700,
          color: "#fff", flexShrink: 0,
        }}>ER</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
            Emergency Response Equipment Portal
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.2 }}>
            East-West Gateway Council of Governments
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {user.id !== "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            background: "#7c3aed30", color: "#a78bfa",
          }}>
            {user.role}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#3b82f6", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.2 }}>{user.agency}</div>
            </div>
          </div>
          <button
            onClick={() => instance.logoutPopup()}
            style={{
              padding: "5px 12px", fontSize: 12, cursor: "pointer",
              borderRadius: 6, border: "1px solid #334155",
              background: "transparent", color: "#94a3b8",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
