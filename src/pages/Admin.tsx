import { useMemo, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import AccessDenied from "../components/AccessDenied";

type SettingsRole = "SystemAdmin" | "AgencyAdmin";

type SettingsItem = {
  title: string;
  description: string;
  to: string;
  allowedRoles: SettingsRole[];
  group: string;
};

type AgencyUserRole = "AgencyAdmin" | "AgencyUser" | "AgencyReporter";

type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: AgencyUserRole;
  active: boolean;
  agency: string;
};

type AgencyRecord = {
  id: number;
  name: string;
  code: string;
  active: boolean;
  primaryContact: string;
};

type AuditEvent = {
  id: number;
  when: string;
  actor: string;
  action: string;
  target: string;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    title: "System Configuration",
    description:
      "Manage global application defaults, feature flags, and shared configuration.",
    to: "/admin/system-config",
    allowedRoles: ["SystemAdmin"],
    group: "System Settings",
  },
  {
    title: "Reference Data",
    description:
      "Manage categories, statuses, lookup values, and other shared lists.",
    to: "/admin/reference-data",
    allowedRoles: ["SystemAdmin"],
    group: "System Settings",
  },
  {
    title: "Agencies",
    description: "Create, edit, and manage agencies / business units.",
    to: "/admin/agencies",
    allowedRoles: ["SystemAdmin"],
    group: "Organization Management",
  },
  {
    title: "Global Users",
    description: "Create and manage users across all agencies.",
    to: "/admin/global-users",
    allowedRoles: ["SystemAdmin"],
    group: "Organization Management",
  },
  {
    title: "Roles & Permissions",
    description:
      "Review and maintain role definitions and access patterns.",
    to: "/admin/roles-permissions",
    allowedRoles: ["SystemAdmin"],
    group: "Governance",
  },
  {
    title: "Audit & Diagnostics",
    description:
      "Review administrative activity, diagnostics, and environment support information.",
    to: "/admin/audit-diagnostics",
    allowedRoles: ["SystemAdmin"],
    group: "Governance",
  },
  {
    title: "Agency Profile",
    description:
      "Update agency display information, contacts, and agency-level defaults.",
    to: "/admin/agency-profile",
    allowedRoles: ["AgencyAdmin"],
    group: "Agency Settings",
  },
  {
    title: "Notifications",
    description:
      "Configure reminders, overdue notices, and report delivery preferences for your agency.",
    to: "/admin/notifications",
    allowedRoles: ["AgencyAdmin"],
    group: "Agency Settings",
  },
  {
    title: "Agency Users",
    description: "Add and manage users for your agency only.",
    to: "/admin/agency-users",
    allowedRoles: ["AgencyAdmin"],
    group: "Agency User Management",
  },
  {
    title: "Agency Roles",
    description:
      "Assign supported roles to users within your agency.",
    to: "/admin/agency-roles",
    allowedRoles: ["AgencyAdmin"],
    group: "Agency User Management",
  },
  {
    title: "Default Equipment Values",
    description:
      "Maintain agency-specific defaults used during equipment creation and maintenance workflows.",
    to: "/admin/default-equipment-values",
    allowedRoles: ["AgencyAdmin"],
    group: "Agency Operations",
  },
  {
    title: "Reporting Preferences",
    description:
      "Configure export defaults and agency-specific reporting behavior.",
    to: "/admin/reporting-preferences",
    allowedRoles: ["AgencyAdmin"],
    group: "Agency Operations",
  },
];

const SYSTEM_ROLE_SUMMARY = [
  {
    role: "SystemAdmin",
    scope: "All agencies",
    notes: "Full administrative authority including system settings.",
  },
  {
    role: "GlobalViewer",
    scope: "All agencies",
    notes: "Read-only cross-agency access.",
  },
  {
    role: "AgencyAdmin",
    scope: "Own agency",
    notes: "Agency settings and agency user management.",
  },
  {
    role: "AgencyUser",
    scope: "Own agency",
    notes: "Operational access only; no settings authority.",
  },
  {
    role: "AgencyReporter",
    scope: "Own agency",
    notes: "Reports-only access with export.",
  },
];

const INITIAL_CATEGORIES = [
  "Rescue",
  "Electronics",
  "Medical",
  "Communications",
];
const INITIAL_STATUSES = ["Active", "Maintenance", "Decommissioned"];
const INITIAL_INSPECTION_TYPES = ["Annual", "Quarterly", "Monthly"];

const INITIAL_AGENCIES: AgencyRecord[] = [
  {
    id: 1,
    name: "Fire Department",
    code: "FIRE",
    active: true,
    primaryContact: "Leah Watkins",
  },
  {
    id: 2,
    name: "Police",
    code: "PD",
    active: true,
    primaryContact: "John Geis",
  },
  {
    id: 3,
    name: "EMS",
    code: "EMS",
    active: true,
    primaryContact: "Anna Carter",
  },
];

const INITIAL_GLOBAL_USERS = [
  {
    id: 1,
    name: "Alice Admin",
    email: "alice.admin@example.com",
    role: "SystemAdmin",
    agency: "Statewide",
    active: true,
  },
  {
    id: 2,
    name: "Gary Global",
    email: "gary.global@example.com",
    role: "GlobalViewer",
    agency: "Statewide",
    active: true,
  },
  {
    id: 3,
    name: "Amy Agency",
    email: "amy.agency@example.com",
    role: "AgencyAdmin",
    agency: "Fire Department",
    active: true,
  },
];

const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 1,
    when: "2026-03-28 09:10",
    actor: "Alice Admin",
    action: "Updated application settings",
    target: "System Configuration",
  },
  {
    id: 2,
    when: "2026-03-29 13:42",
    actor: "Amy Agency",
    action: "Added agency user",
    target: "Fire Department",
  },
  {
    id: 3,
    when: "2026-03-30 16:05",
    actor: "Gary Global",
    action: "Viewed reports",
    target: "Global Reports",
  },
];

const INITIAL_AGENCY_USERS: ManagedUser[] = [
  {
    id: 101,
    name: "Amy Agency",
    email: "amy.agency@example.com",
    role: "AgencyAdmin",
    active: true,
    agency: "Fire Department",
  },
  {
    id: 102,
    name: "Ulysses User",
    email: "ulysses.user@example.com",
    role: "AgencyUser",
    active: true,
    agency: "Fire Department",
  },
  {
    id: 103,
    name: "Rita Reporter",
    email: "rita.reporter@example.com",
    role: "AgencyReporter",
    active: true,
    agency: "Fire Department",
  },
];

function canAccessSettings(role: string): role is SettingsRole {
  return role === "SystemAdmin" || role === "AgencyAdmin";
}

function canAccessSettingsItem(role: string, item: SettingsItem) {
  return item.allowedRoles.includes(role as SettingsRole);
}

function getVisibleSettingsItems(role: string) {
  return SETTINGS_ITEMS.filter((item) => canAccessSettingsItem(role, item));
}

function getGroupedSettingsItems(role: string) {
  const visible = getVisibleSettingsItems(role);
  const groups = new Map<string, SettingsItem[]>();

  visible.forEach((item) => {
    const current = groups.get(item.group) ?? [];
    current.push(item);
    groups.set(item.group, current);
  });

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items,
  }));
}

export default function Admin() {
  const user = useCurrentUser();

  if (!canAccessSettings(user.role)) {
    return <AccessDenied />;
  }

  const groupedItems = getGroupedSettingsItems(user.role);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}>
      <aside
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#fff",
          padding: 16,
          alignSelf: "start",
          position: "sticky",
          top: 24,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
            SETTINGS
          </div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {user.role === "SystemAdmin"
              ? "System Settings"
              : `${user.agency} Settings`}
          </div>
        </div>

        <NavLinkListItem to="/admin" end>
          Overview
        </NavLinkListItem>

        {groupedItems.map((group) => (
          <div key={group.group} style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: "#6b7280",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {group.group}
            </div>

            {group.items.map((item) => (
              <NavLinkListItem key={item.to} to={item.to}>
                {item.title}
              </NavLinkListItem>
            ))}
          </div>
        ))}
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function AdminHome() {
  const user = useCurrentUser();

  if (!canAccessSettings(user.role)) {
    return <AccessDenied />;
  }

  const groupedItems = getGroupedSettingsItems(user.role);

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Settings</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        {user.role === "SystemAdmin"
          ? "Manage system-wide configuration, agencies, global users, and governance settings."
          : `Manage settings for ${user.agency}.`}
      </p>

      {groupedItems.map((group) => (
        <section key={group.group} style={{ marginBottom: 28 }}>
          <h2 style={{ marginBottom: 12 }}>{group.group}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {group.items.map((item) => (
              <SettingsCard
                key={item.to}
                title={item.title}
                description={item.description}
                to={item.to}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SystemConfigSettings() {
  const [form, setForm] = useState({
    applicationName: "Equipment Management",
    maintenanceMode: false,
    defaultPageSize: 25,
    enableExports: true,
  });

  return (
    <SettingsPageFrame
      title="System Configuration"
      description="Manage global application defaults and shared configuration."
      allowedRoles={["SystemAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Application settings</h2>
        <FormGrid>
          <LabeledField label="Application name">
            <input
              value={form.applicationName}
              onChange={(e) =>
                setForm({ ...form, applicationName: e.target.value })
              }
            />
          </LabeledField>

          <LabeledField label="Default page size">
            <input
              type="number"
              min={5}
              value={form.defaultPageSize}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultPageSize: Number(e.target.value),
                })
              }
            />
          </LabeledField>
        </FormGrid>

        <ToggleRow
          label="Maintenance mode"
          checked={form.maintenanceMode}
          onChange={(checked) =>
            setForm({ ...form, maintenanceMode: checked })
          }
        />
        <ToggleRow
          label="Enable exports"
          checked={form.enableExports}
          onChange={(checked) =>
            setForm({ ...form, enableExports: checked })
          }
        />

        <PrimaryButton>Save System Settings</PrimaryButton>
      </Card>
    </SettingsPageFrame>
  );
}

export function ReferenceDataSettings() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [statuses, setStatuses] = useState(INITIAL_STATUSES);
  const [inspectionTypes, setInspectionTypes] = useState(INITIAL_INSPECTION_TYPES);
  const [newCategory, setNewCategory] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newInspectionType, setNewInspectionType] = useState("");

  return (
    <SettingsPageFrame
      title="Reference Data"
      description="Manage shared lookup values used throughout the application."
      allowedRoles={["SystemAdmin"]}
    >
      <div style={twoColumnLayoutStyle}>
        <EditableListCard
          title="Equipment categories"
          items={categories}
          newValue={newCategory}
          onNewValueChange={setNewCategory}
          onAdd={() => addValue(newCategory, categories, setCategories, setNewCategory)}
          onRemove={(value) => setCategories(categories.filter((item) => item !== value))}
        />

        <EditableListCard
          title="Status values"
          items={statuses}
          newValue={newStatus}
          onNewValueChange={setNewStatus}
          onAdd={() => addValue(newStatus, statuses, setStatuses, setNewStatus)}
          onRemove={(value) => setStatuses(statuses.filter((item) => item !== value))}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <EditableListCard
          title="Inspection classifications"
          items={inspectionTypes}
          newValue={newInspectionType}
          onNewValueChange={setNewInspectionType}
          onAdd={() =>
            addValue(
              newInspectionType,
              inspectionTypes,
              setInspectionTypes,
              setNewInspectionType
            )
          }
          onRemove={(value) =>
            setInspectionTypes(inspectionTypes.filter((item) => item !== value))
          }
        />
      </div>
    </SettingsPageFrame>
  );
}

export function AgenciesSettings() {
  const [agencies, setAgencies] = useState(INITIAL_AGENCIES);
  const [draft, setDraft] = useState({
    name: "",
    code: "",
    primaryContact: "",
  });

  const addAgency = () => {
    if (!draft.name.trim() || !draft.code.trim()) return;

    setAgencies([
      ...agencies,
      {
        id: Date.now(),
        name: draft.name.trim(),
        code: draft.code.trim(),
        primaryContact: draft.primaryContact.trim() || "Unassigned",
        active: true,
      },
    ]);
    setDraft({ name: "", code: "", primaryContact: "" });
  };

  return (
    <SettingsPageFrame
      title="Agencies"
      description="Create, review, and manage agencies / business units."
      allowedRoles={["SystemAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Registered agencies</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th align="left">Agency</th>
              <th align="left">Code</th>
              <th align="left">Primary contact</th>
              <th align="left">Status</th>
              <th align="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agencies.map((agency) => (
              <tr key={agency.id}>
                <td>{agency.name}</td>
                <td>{agency.code}</td>
                <td>{agency.primaryContact}</td>
                <td>{agency.active ? "Active" : "Inactive"}</td>
                <td align="right">
                  <SecondaryButton
                    onClick={() =>
                      setAgencies(
                        agencies.map((item) =>
                          item.id === agency.id
                            ? { ...item, active: !item.active }
                            : item
                        )
                      )
                    }
                  >
                    {agency.active ? "Deactivate" : "Activate"}
                  </SecondaryButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h2 style={sectionTitleStyle}>Add agency</h2>
        <FormGrid>
          <LabeledField label="Agency name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Agency code">
            <input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Primary contact">
            <input
              value={draft.primaryContact}
              onChange={(e) =>
                setDraft({ ...draft, primaryContact: e.target.value })
              }
            />
          </LabeledField>
        </FormGrid>

        <PrimaryButton onClick={addAgency}>Add Agency</PrimaryButton>
      </Card>
    </SettingsPageFrame>
  );
}

export function GlobalUsersSettings() {
  const [users, setUsers] = useState(INITIAL_GLOBAL_USERS);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    role: "GlobalViewer",
    agency: "Statewide",
  });

  const addUser = () => {
    if (!draft.name.trim() || !draft.email.trim()) return;

    setUsers([
      ...users,
      {
        id: Date.now(),
        ...draft,
        active: true,
      },
    ]);
    setDraft({ name: "", email: "", role: "GlobalViewer", agency: "Statewide" });
  };

  return (
    <SettingsPageFrame
      title="Global Users"
      description="Manage cross-agency users and assign high-level roles."
      allowedRoles={["SystemAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Global user roster</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Email</th>
              <th align="left">Role</th>
              <th align="left">Agency</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.agency}</td>
                <td>{user.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h2 style={sectionTitleStyle}>Add global user</h2>
        <FormGrid>
          <LabeledField label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Email">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Role">
            <select
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            >
              <option value="SystemAdmin">SystemAdmin</option>
              <option value="GlobalViewer">GlobalViewer</option>
              <option value="AgencyAdmin">AgencyAdmin</option>
              <option value="AgencyUser">AgencyUser</option>
              <option value="AgencyReporter">AgencyReporter</option>
            </select>
          </LabeledField>
          <LabeledField label="Agency">
            <input
              value={draft.agency}
              onChange={(e) => setDraft({ ...draft, agency: e.target.value })}
            />
          </LabeledField>
        </FormGrid>

        <PrimaryButton onClick={addUser}>Add Global User</PrimaryButton>
      </Card>
    </SettingsPageFrame>
  );
}

export function RolesPermissionsSettings() {
  return (
    <SettingsPageFrame
      title="Roles & Permissions"
      description="Review the supported role model and intended scope."
      allowedRoles={["SystemAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Supported roles</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th align="left">Role</th>
              <th align="left">Scope</th>
              <th align="left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_ROLE_SUMMARY.map((row) => (
              <tr key={row.role}>
                <td>{row.role}</td>
                <td>{row.scope}</td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SettingsPageFrame>
  );
}

export function AuditDiagnosticsSettings() {
  const [events] = useState(INITIAL_AUDIT_EVENTS);

  return (
    <SettingsPageFrame
      title="Audit & Diagnostics"
      description="Review administrative activity and operational diagnostics."
      allowedRoles={["SystemAdmin"]}
    >
      <div style={twoColumnLayoutStyle}>
        <Card>
          <h2 style={sectionTitleStyle}>Recent activity</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th align="left">When</th>
                <th align="left">Actor</th>
                <th align="left">Action</th>
                <th align="left">Target</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.when}</td>
                  <td>{event.actor}</td>
                  <td>{event.action}</td>
                  <td>{event.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 style={sectionTitleStyle}>Diagnostics snapshot</h2>
          <StatList
            items={[
              ["Environment", "Development"],
              ["Data provider", "Mock (Dataverse-ready UI)"],
              ["User model", "Local dev_current_user"],
              ["Settings routing", "Nested /admin routes"],
            ]}
          />
        </Card>
      </div>
    </SettingsPageFrame>
  );
}

export function AgencyProfileSettings() {
  const user = useCurrentUser();
  const [form, setForm] = useState({
    displayName: user.agency,
    primaryContact: "Leah Watkins",
    email: "agency@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St",
  });

  return (
    <SettingsPageFrame
      title="Agency Profile"
      description={`Manage display information and defaults for ${user.agency}.`}
      allowedRoles={["AgencyAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Agency details</h2>
        <FormGrid>
          <LabeledField label="Display name">
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Primary contact">
            <input
              value={form.primaryContact}
              onChange={(e) => setForm({ ...form, primaryContact: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Phone">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Address">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </LabeledField>
        </FormGrid>
        <PrimaryButton>Save Agency Profile</PrimaryButton>
      </Card>
    </SettingsPageFrame>
  );
}

export function NotificationsSettings() {
  const [settings, setSettings] = useState({
    sendInspectionReminders: true,
    sendOverdueNotices: true,
    weeklySummary: false,
    reminderDays: 14,
  });

  return (
    <SettingsPageFrame
      title="Notifications"
      description="Configure reminder and reporting notifications for your agency."
      allowedRoles={["AgencyAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Notification preferences</h2>
        <ToggleRow
          label="Send inspection reminders"
          checked={settings.sendInspectionReminders}
          onChange={(checked) =>
            setSettings({ ...settings, sendInspectionReminders: checked })
          }
        />
        <ToggleRow
          label="Send overdue notices"
          checked={settings.sendOverdueNotices}
          onChange={(checked) =>
            setSettings({ ...settings, sendOverdueNotices: checked })
          }
        />
        <ToggleRow
          label="Send weekly summary email"
          checked={settings.weeklySummary}
          onChange={(checked) =>
            setSettings({ ...settings, weeklySummary: checked })
          }
        />

        <LabeledField label="Reminder lead time (days)">
          <input
            type="number"
            min={1}
            value={settings.reminderDays}
            onChange={(e) =>
              setSettings({ ...settings, reminderDays: Number(e.target.value) })
            }
          />
        </LabeledField>

        <PrimaryButton>Save Notification Settings</PrimaryButton>
      </Card>
    </SettingsPageFrame>
  );
}

export function AgencyUsersSettings() {
  const user = useCurrentUser();
  const [users, setUsers] = useState(
    INITIAL_AGENCY_USERS.filter((item) => item.agency === user.agency)
  );
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    role: "AgencyUser" as AgencyUserRole,
  });

  const activeCount = useMemo(
    () => users.filter((item) => item.active).length,
    [users]
  );

  const addUser = () => {
    if (!draft.name.trim() || !draft.email.trim()) return;

    setUsers([
      ...users,
      {
        id: Date.now(),
        name: draft.name.trim(),
        email: draft.email.trim(),
        role: draft.role,
        active: true,
        agency: user.agency,
      },
    ]);
    setDraft({ name: "", email: "", role: "AgencyUser" });
  };

  return (
    <SettingsPageFrame
      title="Agency Users"
      description={`Add and manage users for ${user.agency} only.`}
      allowedRoles={["AgencyAdmin"]}
    >
      <div style={twoColumnLayoutStyle}>
        <Card>
          <h2 style={sectionTitleStyle}>Agency user roster</h2>
          <div style={{ color: "#6b7280", marginBottom: 12 }}>
            {activeCount} active user{activeCount === 1 ? "" : "s"}
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th align="left">Name</th>
                <th align="left">Email</th>
                <th align="left">Role</th>
                <th align="left">Status</th>
                <th align="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((managedUser) => (
                <tr key={managedUser.id}>
                  <td>{managedUser.name}</td>
                  <td>{managedUser.email}</td>
                  <td>
                    <select
                      value={managedUser.role}
                      onChange={(e) =>
                        setUsers(
                          users.map((item) =>
                            item.id === managedUser.id
                              ? {
                                  ...item,
                                  role: e.target.value as AgencyUserRole,
                                }
                              : item
                          )
                        )
                      }
                    >
                      <option value="AgencyAdmin">AgencyAdmin</option>
                      <option value="AgencyUser">AgencyUser</option>
                      <option value="AgencyReporter">AgencyReporter</option>
                    </select>
                  </td>
                  <td>{managedUser.active ? "Active" : "Inactive"}</td>
                  <td align="right">
                    <SecondaryButton
                      onClick={() =>
                        setUsers(
                          users.map((item) =>
                            item.id === managedUser.id
                              ? { ...item, active: !item.active }
                              : item
                          )
                        )
                      }
                    >
                      {managedUser.active ? "Deactivate" : "Activate"}
                    </SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 style={sectionTitleStyle}>Add agency user</h2>
          <p style={{ color: "#6b7280", marginTop: 0 }}>
            Agency admins can create only AgencyAdmin, AgencyUser, and AgencyReporter accounts for their own agency.
          </p>
          <LabeledField label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Email">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="Role">
            <select
              value={draft.role}
              onChange={(e) =>
                setDraft({ ...draft, role: e.target.value as AgencyUserRole })
              }
            >
              <option value="AgencyAdmin">AgencyAdmin</option>
              <option value="AgencyUser">AgencyUser</option>
              <option value="AgencyReporter">AgencyReporter</option>
            </select>
          </LabeledField>

          <PrimaryButton onClick={addUser}>Add Agency User</PrimaryButton>
        </Card>
      </div>
    </SettingsPageFrame>
  );
}

export function AgencyRolesSettings() {
  return (
    <SettingsPageFrame
      title="Agency Roles"
      description="Review which agency-scoped roles can be assigned by agency administrators."
      allowedRoles={["AgencyAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Assignable agency roles</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th align="left">Role</th>
              <th align="left">Typical use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>AgencyAdmin</td>
              <td>Agency-level administration and settings management.</td>
            </tr>
            <tr>
              <td>AgencyUser</td>
              <td>Operational equipment management within the agency.</td>
            </tr>
            <tr>
              <td>AgencyReporter</td>
              <td>Reports access and export within the agency.</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </SettingsPageFrame>
  );
}

export function DefaultEquipmentValuesSettings() {
  const [defaults, setDefaults] = useState({
    defaultCategory: "Rescue",
    defaultLocation: "Station 1",
    inspectionIntervalMonths: 12,
    defaultStatus: "Active",
  });

  return (
    <SettingsPageFrame
      title="Default Equipment Values"
      description="Maintain agency-level defaults for equipment creation and maintenance workflows."
      allowedRoles={["AgencyAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Default values</h2>
        <FormGrid>
          <LabeledField label="Default category">
            <select
              value={defaults.defaultCategory}
              onChange={(e) =>
                setDefaults({ ...defaults, defaultCategory: e.target.value })
              }
            >
              {INITIAL_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="Default location">
            <input
              value={defaults.defaultLocation}
              onChange={(e) =>
                setDefaults({ ...defaults, defaultLocation: e.target.value })
              }
            />
          </LabeledField>
          <LabeledField label="Inspection interval (months)">
            <input
              type="number"
              min={1}
              value={defaults.inspectionIntervalMonths}
              onChange={(e) =>
                setDefaults({
                  ...defaults,
                  inspectionIntervalMonths: Number(e.target.value),
                })
              }
            />
          </LabeledField>
          <LabeledField label="Default status">
            <select
              value={defaults.defaultStatus}
              onChange={(e) =>
                setDefaults({ ...defaults, defaultStatus: e.target.value })
              }
            >
              {INITIAL_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </LabeledField>
        </FormGrid>

        <PrimaryButton>Save Equipment Defaults</PrimaryButton>
      </Card>
    </SettingsPageFrame>
  );
}

export function ReportingPreferencesSettings() {
  const [prefs, setPrefs] = useState({
    defaultFormat: "CSV",
    includeOverdueSummary: true,
    weeklyDigest: false,
    reportOwnerEmail: "reports@example.com",
  });

  return (
    <SettingsPageFrame
      title="Reporting Preferences"
      description="Configure export defaults and agency-specific reporting behavior."
      allowedRoles={["AgencyAdmin"]}
    >
      <Card>
        <h2 style={sectionTitleStyle}>Reporting defaults</h2>
        <LabeledField label="Default export format">
          <select
            value={prefs.defaultFormat}
            onChange={(e) =>
              setPrefs({ ...prefs, defaultFormat: e.target.value })
            }
          >
            <option value="CSV">CSV</option>
            <option value="Excel">Excel</option>
            <option value="PDF">PDF</option>
          </select>
        </LabeledField>

        <LabeledField label="Report owner email">
          <input
            type="email"
            value={prefs.reportOwnerEmail}
            onChange={(e) =>
              setPrefs({ ...prefs, reportOwnerEmail: e.target.value })
            }
          />
        </LabeledField>

        <ToggleRow
          label="Include overdue summary in exports"
          checked={prefs.includeOverdueSummary}
          onChange={(checked) =>
            setPrefs({ ...prefs, includeOverdueSummary: checked })
          }
        />
        <ToggleRow
          label="Send weekly digest"
          checked={prefs.weeklyDigest}
          onChange={(checked) =>
            setPrefs({ ...prefs, weeklyDigest: checked })
          }
        />

        <PrimaryButton>Save Reporting Preferences</PrimaryButton>
      </Card>
    </SettingsPageFrame>
  );
}

function SettingsPageFrame({
  title,
  description,
  allowedRoles,
  children,
}: {
  title: string;
  description: string;
  allowedRoles: SettingsRole[];
  children: React.ReactNode;
}) {
  const user = useCurrentUser();

  if (!allowedRoles.includes(user.role as SettingsRole)) {
    return <AccessDenied />;
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/admin"
          style={{
            fontSize: 14,
            textDecoration: "none",
            color: "#2563eb",
          }}
        >
          ← Back to Settings
        </Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>{title}</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>{description}</p>

      {children}
    </div>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
      }}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function EditableListCard({
  title,
  items,
  newValue,
  onNewValueChange,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}) {
  return (
    <Card>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <PrimaryButton onClick={onAdd}>Add</PrimaryButton>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((item) => (
          <li key={item} style={{ marginBottom: 8 }}>
            <span>{item}</span>
            <button
              onClick={() => onRemove(item)}
              style={{ marginLeft: 10, color: "#b91c1c", background: "none", border: 0, cursor: "pointer" }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SettingsCard({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#fff",
          padding: 16,
          height: "100%",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 14 }}>
          {description}
        </div>
        <div style={{ fontSize: 14, color: "#2563eb", fontWeight: 600 }}>
          Open →
        </div>
      </div>
    </Link>
  );
}

function NavLinkListItem({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
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

function StatList({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            paddingBottom: 8,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <span style={{ color: "#6b7280" }}>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 6,
        border: "1px solid #2563eb",
        background: "#2563eb",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid #d1d5db",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function addValue(
  rawValue: string,
  current: string[],
  setCurrent: (values: string[]) => void,
  clear: (value: string) => void
) {
  const value = rawValue.trim();
  if (!value || current.includes(value)) return;
  setCurrent([...current, value]);
  clear("");
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const sectionTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};

const twoColumnLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};
