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
import Admin from "./pages/Admin";
import AccessDenied from "./components/AccessDenied";
import { useCurrentUser } from "./hooks/useCurrentUser";

export default function App() {
  const user = useCurrentUser();

  const isSystemAdmin = user.role === "SystemAdmin";
  const isGlobalViewer = user.role === "GlobalViewer";
  const isAgencyAdmin = user.role === "AgencyAdmin";
  const isAgencyUser = user.role === "AgencyUser";
  const isAgencyReporter = user.role === "AgencyReporter";

  // AgencyUser now mirrors AgencyAdmin
  const isAgencyScopedEditor = isAgencyAdmin || isAgencyUser;

  const canViewDashboard =
    isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;

  const canViewInventory =
    isSystemAdmin || isGlobalViewer || isAgencyScopedEditor;

  const canViewEquipmentDetail =
    canViewInventory;

  const canViewReports =
    isSystemAdmin ||
    isGlobalViewer ||
    isAgencyScopedEditor ||
    isAgencyReporter;

  const canAddEquipment =
    isSystemAdmin || isAgencyScopedEditor;

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
            isSystemAdmin ? <Admin /> : <AccessDenied />
          }
        />

        <Route
          path="*"
          element={<RouterNavigate to="/" replace />}
        />
      </Route>
    </RouterRoutes>
  );
}
