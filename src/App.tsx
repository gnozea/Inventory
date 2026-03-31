import { Routes, Route, Navigate } from "react-router-dom";

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

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Equipment */}
        <Route path="/equipment" element={<EquipmentList />} />
        <Route path="/equipment/:id" element={<EquipmentDetail />} />
        <Route path="/equipment/new" element={<AddEquipment />} />

        {/* ✅ Locations — SAME TABLE AS MY EQUIPMENT */}
        {/* ✅ Sidebar + inline click now behave identically */}
        <Route path="/locations" element={<EquipmentList />} />

        {/* Search */}
        <Route
  path="/search"
  element={
    user.role === "GlobalViewer" || user.role === "SystemAdmin" ? (
      <GlobalSearch />
    ) : (
      <AccessDenied />
    )
  }
/>

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            user.role === "SystemAdmin" ? <Admin /> : <AccessDenied />
          }
        />

        {/* Catch‑all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}