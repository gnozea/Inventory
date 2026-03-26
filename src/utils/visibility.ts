import type { CurrentUser } from "../hooks/useCurrentUser";
import type { EquipmentRow } from "../components/EquipmentTable";

export function canSeeAllAgencies(user: CurrentUser) {
  return user.role === "SystemAdmin" || user.role === "GlobalViewer";
}

export function canEditEquipment(
  user: CurrentUser,
  equipmentAgency: string
) {
  if (user.role === "SystemAdmin") return true;
  if (user.role === "GlobalViewer") {
    return user.agency === equipmentAgency;
  }
  return user.agency === equipmentAgency &&
    (user.role === "Editor" || user.role === "AgencyAdmin");
}

export function filterVisibleEquipment(
  user: CurrentUser,
  equipment: EquipmentRow[]
) {
  if (canSeeAllAgencies(user)) return equipment;
  return equipment.filter((e) => e.agency === user.agency);
}
