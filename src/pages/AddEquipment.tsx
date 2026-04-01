import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import AccessDenied from "../components/AccessDenied";

export default function AddEquipment() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  /**
   * Equipment creation is a privileged action.
   * Only SystemAdmin and AgencyAdmin are allowed.
   */
  const canAdd =
    user.role === "SystemAdmin" ||
    user.role === "AgencyAdmin";

  if (!canAdd) return <AccessDenied />;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Add Equipment</h1>

      <button
        onClick={() => navigate("/equipment")}
        style={{ marginTop: 16 }}
      >
        Save (mock)
      </button>
    </div>
  );
}