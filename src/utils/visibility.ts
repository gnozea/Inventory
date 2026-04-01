import type { CurrentUser } from "../hooks/useCurrentUser";
import type { EquipmentRow } from "../components/EquipmentTable";

/**
 * Roles that can see all agencies.
 */
export function canSeeAllAgencies(user: CurrentUser) {
  return (
    user.role === "SystemAdmin" ||
    user.role === "GlobalViewer"
  );
}

/**
 * Metadata edit permission (name/category/location/etc.).
 * Status updates are handled separately.
 */
export function canEditEquipment(
  user: CurrentUser,
  equipmentAgency: string
) {
  if (user.role === "SystemAdmin") return true;

  if (user.role === "AgencyAdmin") {
    return user.agency === equipmentAgency;
  }

  return false;
}

/**
 * Visibility filter for equipment lists.
 */
export function filterVisibleEquipment(
  user: CurrentUser,
  equipment: EquipmentRow[]
) {
  if (canSeeAllAgencies(user)) return equipment;
  return equipment.filter(
    (e) => e.agency === user.agency
  );
}