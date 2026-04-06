import { useIsAuthenticated } from "@azure/msal-react";
import { useMsal } from "@azure/msal-react";
import type { UserRole } from "../hooks/useCurrentUser";

type DevUser = {
  id: number;
  name: string;
  role: UserRole;
  agency: string;
};

const STORAGE_KEY = "dev_current_user";

const USERS: DevUser[] = [
  { id: 1, name: "Alice Admin",   role: "SystemAdmin",    agency: "Statewide" },
  { id: 2, name: "Gary Global",   role: "GlobalViewer",   agency: "Statewide" },
  { id: 3, name: "Amy Agency",    role: "AgencyAdmin",    agency: "Fire Department" },
  { id: 4, name: "Ulysses User",  role: "AgencyUser",     agency: "Fire Department" },
  { id: 5, name: "Rita Reporter", role: "AgencyReporter", agency: "Fire Department" },
];

export default function DevToolbar() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();

  // Hide if authenticated OR if MSAL has accounts loaded (still initializing)
  // Critical: accounts.length > 0 catches the brief window where
  // isAuthenticated is false but a real user is about to be set
  if (isAuthenticated || accounts.length > 0) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  // Only reach here if genuinely not authenticated — safe to use mock
  const raw = localStorage.getItem(STORAGE_KEY);
  let current: DevUser = USERS[0];
  try {
    if (raw) current = JSON.parse(raw) as DevUser;
  } catch { /* ignore */ }

  // NOTE: we intentionally do NOT auto-write to localStorage here
  // Only write when user explicitly switches role via the dropdown

  const changeUser = (id: number) => {
    const u = USERS.find((u) => u.id === id);
    if (!u) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    window.location.reload();
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#111827", color: "#fff",
      padding: "8px 12px", display: "flex",
      gap: "12px", alignItems: "center",
      fontSize: "12px", zIndex: 1000,
    }}>
      <strong>Dev Mode</strong>
      <span style={{ color: "#fbbf24" }}>⚠ Not signed in — using mock user</span>
      <select
        value={current.id}
        onChange={(e) => changeUser(Number(e.target.value))}
      >
        {USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} — {u.role}
          </option>
        ))}
      </select>
      <span style={{ opacity: 0.7 }}>
        {current.name} | {current.role} | {current.agency}
      </span>
    </div>
  );
}