import { useEffect, useState } from "react";

type DevUser = {
  id: number;
  name: string;
  role: "SystemAdmin" | "GlobalViewer" | "AgencyAdmin" | "Editor" | "Reporter";
  agency: string;
};

const USERS: DevUser[] = [
  { id: 1, name: "Alice Admin", role: "SystemAdmin", agency: "Statewide" },
  { id: 2, name: "Gary Global", role: "GlobalViewer", agency: "Statewide" },
  { id: 3, name: "Amy Agency", role: "AgencyAdmin", agency: "Fire Dept" },
  { id: 4, name: "Evan Editor", role: "Editor", agency: "Fire Dept" },
  { id: 5, name: "Rita Reporter", role: "Reporter", agency: "Fire Dept" },
];

const STORAGE_KEY = "dev_current_user";

export default function DevToolbar() {
  const [current, setCurrent] = useState<DevUser>(USERS[0]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCurrent(JSON.parse(stored));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(USERS[0]));
    }
  }, []);

  function changeUser(id: number) {
    const user = USERS.find((u) => u.id === id);
    if (!user) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.location.reload();
  }

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