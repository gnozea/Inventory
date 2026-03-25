import { useEffect, useState } from "react";

type MockUser = {
  id: number;
  name: string;
  role: string;
  agency: string;
};

const MOCK_USERS: MockUser[] = [
  { id: 1, name: "Alice Admin", role: "SystemAdmin", agency: "Statewide" },
  { id: 2, name: "Gary Global", role: "GlobalViewer", agency: "Statewide" },
  { id: 3, name: "Amy Agency", role: "AgencyAdmin", agency: "Fire Dept" },
  { id: 4, name: "Evan Editor", role: "Editor", agency: "Fire Dept" },
  { id: 5, name: "Rita Reporter", role: "Reporter", agency: "Fire Dept" },
];

const STORAGE_KEY = "dev_current_user";
const HIDDEN_KEY = "dev_toolbar_hidden";

export default function DevToolbar() {
  const [currentUser, setCurrentUser] = useState<MockUser>(MOCK_USERS[0]);
  const [hidden, setHidden] = useState(false);

  // Load saved state
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    const hiddenState = localStorage.getItem(HIDDEN_KEY);

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_USERS[0]));
    }

    if (hiddenState === "true") {
      setHidden(true);
    }
  }, []);

  function handleUserChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = MOCK_USERS.find(
      (u) => u.id === Number(e.target.value)
    );
    if (!selected) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    window.location.reload();
  }

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem(HIDDEN_KEY, String(next));
  }

  if (hidden) {
    return (
      <button
        onClick={toggleHidden}
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          padding: "6px 10px",
          fontSize: "12px",
        }}
      >
        Show Dev Toolbar
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#111827",
        color: "#ffffff",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "12px",
        zIndex: 1000,
      }}
    >
      <strong>Dev Mode</strong>

      <span>Current role:</span>

      <select
        value={currentUser.id}
        onChange={handleUserChange}
        style={{ padding: "4px" }}
      >
        {MOCK_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} — {user.role}
          </option>
        ))}
      </select>

      <span style={{ opacity: 0.8 }}>
        {currentUser.name} | {currentUser.role} | {currentUser.agency}
      </span>

      <div style={{ flex: 1 }} />

      <button onClick={toggleHidden} style={{ fontSize: "12px" }}>
        Hide
      </button>
    </div>
  );
}
