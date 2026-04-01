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

const SETTINGS_ITEMS: SettingsItem[] = [
  // SystemAdmin-only
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
    description:
      "Create, edit, and manage agencies / business units.",
    to: "/admin/agencies",
    allowedRoles: ["SystemAdmin"],
    group: "Organization Management",
  },
  {
    title: "Global Users",
    description:
      "Create and manage users across all agencies.",
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

  // AgencyAdmin-only
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
    description:
      "Add and manage users for your agency only.",
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

function canAccessSettings(role: string): role is SettingsRole {
  return role === "SystemAdmin" || role === "AgencyAdmin";
}

function canAccessSettingsItem(
  role: string,
  item: SettingsItem
) {
  return item.allowedRoles.includes(role as SettingsRole);
}

function getVisibleSettingsItems(role: string) {
  return SETTINGS_ITEMS.filter((item) =>
    canAccessSettingsItem(role, item)
  );
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
  return <SettingsSectionPage title="System Configuration" allowedRoles={["SystemAdmin"]} />;
}

export function ReferenceDataSettings() {
  return <SettingsSectionPage title="Reference Data" allowedRoles={["SystemAdmin"]} />;
}

export function AgenciesSettings() {
  return <SettingsSectionPage title="Agencies" allowedRoles={["SystemAdmin"]} />;
}

export function GlobalUsersSettings() {
  return <SettingsSectionPage title="Global Users" allowedRoles={["SystemAdmin"]} />;
}

export function RolesPermissionsSettings() {
  return <SettingsSectionPage title="Roles & Permissions" allowedRoles={["SystemAdmin"]} />;
}

export function AuditDiagnosticsSettings() {
  return <SettingsSectionPage title="Audit & Diagnostics" allowedRoles={["SystemAdmin"]} />;
}

export function AgencyProfileSettings() {
  return <SettingsSectionPage title="Agency Profile" allowedRoles={["AgencyAdmin"]} />;
}

export function NotificationsSettings() {
  return <SettingsSectionPage title="Notifications" allowedRoles={["AgencyAdmin"]} />;
}

export function AgencyUsersSettings() {
  return <SettingsSectionPage title="Agency Users" allowedRoles={["AgencyAdmin"]} />;
}

export function AgencyRolesSettings() {
  return <SettingsSectionPage title="Agency Roles" allowedRoles={["AgencyAdmin"]} />;
}

export function DefaultEquipmentValuesSettings() {
  return <SettingsSectionPage title="Default Equipment Values" allowedRoles={["AgencyAdmin"]} />;
}

export function ReportingPreferencesSettings() {
  return <SettingsSectionPage title="Reporting Preferences" allowedRoles={["AgencyAdmin"]} />;
}

function SettingsSectionPage({
  title,
  allowedRoles,
}: {
  title: string;
  allowedRoles: SettingsRole[];
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

      <h1>{title}</h1>
      <p style={{ color: "#6b7280" }}>
        Placeholder content for {title}.
      </p>
    </div>
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