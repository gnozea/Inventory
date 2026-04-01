import type { UserRole } from "../hooks/useCurrentUser";

type DevUser = {
  id: number;
  name: string;
  role: UserRole;
  agency: string;
};

const STORAGE_KEY = "dev_current_user";

const USERS: DevUser[] = [
  { id: 1, name: "Alice Admin", role: "SystemAdmin", agency: "Statewide" },
  { id: 2, name: "Gary Global", role: "GlobalViewer", agency: "Statewide" },
  { id: 3, name: "Amy Agency", role: "AgencyAdmin", agency: "Fire Department" },
  { id: 4, name: "Ulysses User", role: "AgencyUser", agency: "Fire Department" },
  { id: 5, name: "Rita Reporter", role: "AgencyReporter", agency: "Fire Department" },
];

function isUserRole(role: unknown): role is UserRole {
  return (
    role === "SystemAdmin" ||
    role === "GlobalViewer" ||
    role === "AgencyAdmin" ||
    role === "AgencyUser" ||
    role === "AgencyReporter"
  );
}

function normalizeStoredUser(raw: string | null): DevUser | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      id?: unknown;
      name?: unknown;
      role?: unknown;
      agency?: unknown;
    };

    const legacyRole =
      parsed.role === "Editor"
        ? "AgencyUser"
        : parsed.role === "Reporter"
        ? "AgencyReporter"
        : parsed.role;

    if (
      typeof parsed.id !== "number" ||
      typeof parsed.name !== "string" ||
      typeof parsed.agency !== "string" ||
      !isUserRole(legacyRole)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      role: legacyRole,
      agency: parsed.agency,
    };
  } catch {
    return null;
  }
}

export default function DevToolbar() {
  const stored = normalizeStoredUser(localStorage.getItem(STORAGE_KEY));
  const current = stored ?? USERS[0];

  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

  const changeUser = (id: number) => {
    const user = USERS.find((u) => u.id === id);
    if (!user) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#111827",
        color: "#fff",
        padding: "8px 12px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        fontSize: "12px",
        zIndex: 1000,
      }}
    >
      <strong>Dev Mode</strong>
      <span>Current role:</span>

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
