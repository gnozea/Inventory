import {
  Routes as RouterRoutes,
  Route,
  Navigate as RouterNavigate,
} from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import EquipmentList from "./pages/EquipmentList";
import EquipmentDetail from "./pages/EquipmentDetail";
import AddEquipment from "./pages/AddEquipment";
import GlobalSearch from "./pages/GlobalSearch";
import Reports from "./pages/Reports";
import Admin, {
  AdminHome,
  SystemConfigSettings,
  ReferenceDataSettings,
  AgenciesSettings,
  GlobalUsersSettings,
  RolesPermissionsSettings,
  AuditDiagnosticsSettings,
  AgencyProfileSettings,
  NotificationsSettings,
  AgencyUsersSettings,
  AgencyRolesSettings,
  DefaultEquipmentValuesSettings,
  ReportingPreferencesSettings,
} from "./pages/Admin";
import AccessDenied from "./components/AccessDenied";
import { useCurrentUser } from "./hooks/useCurrentUser";

export default function App() {
  const user = useCurrentUser();

  const isSystemAdmin = user.role === "SystemAdmin";
  const isGlobalViewer = user.role === "GlobalViewer";
  const isAgencyAdmin = user.role === "AgencyAdmin";
  const isAgencyUser = user.role === "AgencyUser";
  const isAgencyReporter = user.role === "AgencyReporter";

  // AgencyUser mirrors AgencyAdmin operationally
  const isAgencyScopedEditor = isAgencyAdmin || isAgencyUser;

  const canViewDashboard =
    isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;

  const canViewInventory =
    isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;

  const canViewEquipmentDetail = canViewInventory;

  const canViewReports =
    isSystemAdmin ||
    isGlobalViewer ||
    isAgencyScopedEditor ||
    isAgencyReporter;

  const canAddEquipment =
    isSystemAdmin || isAgencyScopedEditor;

  const canViewSettings =
    isSystemAdmin || isAgencyAdmin;

  return (
    <RouterRoutes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            canViewDashboard ? <Dashboard /> : <AccessDenied />
          }
        />

        <Route
          path="/equipment"
          element={
            canViewInventory ? <EquipmentList /> : <AccessDenied />
          }
        />

        <Route
          path="/equipment/:id"
          element={
            canViewEquipmentDetail
              ? <EquipmentDetail />
              : <AccessDenied />
          }
        />

        <Route
          path="/equipment/new"
          element={
            canAddEquipment ? <AddEquipment /> : <AccessDenied />
          }
        />

        <Route
          path="/locations"
          element={
            canViewInventory ? <EquipmentList /> : <AccessDenied />
          }
        />

        <Route
          path="/search"
          element={
            isSystemAdmin || isGlobalViewer
              ? <GlobalSearch />
              : <AccessDenied />
          }
        />

        <Route
          path="/reports"
          element={
            canViewReports ? <Reports /> : <AccessDenied />
          }
        />

        <Route
          path="/admin"
          element={
            canViewSettings ? <Admin /> : <AccessDenied />
          }
        >
          <Route index element={<AdminHome />} />

          {/* SystemAdmin */}
          <Route
            path="system-config"
            element={<SystemConfigSettings />}
          />
          <Route
            path="reference-data"
            element={<ReferenceDataSettings />}
          />
          <Route
            path="agencies"
            element={<AgenciesSettings />}
          />
          <Route
            path="global-users"
            element={<GlobalUsersSettings />}
          />
          <Route
            path="roles-permissions"
            element={<RolesPermissionsSettings />}
          />
          <Route
            path="audit-diagnostics"
            element={<AuditDiagnosticsSettings />}
          />

          {/* AgencyAdmin */}
          <Route
            path="agency-profile"
            element={<AgencyProfileSettings />}
          />
          <Route
            path="notifications"
            element={<NotificationsSettings />}
          />
          <Route
            path="agency-users"
            element={<AgencyUsersSettings />}
          />
          <Route
            path="agency-roles"
            element={<AgencyRolesSettings />}
          />
          <Route
            path="default-equipment-values"
            element={<DefaultEquipmentValuesSettings />}
          />
          <Route
            path="reporting-preferences"
            element={<ReportingPreferencesSettings />}
          />
        </Route>

        <Route
          path="*"
          element={<RouterNavigate to="/" replace />}
        />
      </Route>
    </RouterRoutes>
  );
}