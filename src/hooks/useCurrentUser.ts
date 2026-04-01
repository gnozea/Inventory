export type UserRole =
  | "SystemAdmin"
  | "GlobalViewer"
  | "AgencyAdmin"
  | "AgencyUser"
  | "AgencyReporter";

export type CurrentUser = {
  id: number;
  name: string;
  role: UserRole;
  agency: string;
};

const STORAGE_KEY = "dev_current_user";

export function useCurrentUser(): CurrentUser {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      id: 0,
      name: "Unknown",
      role: "AgencyUser", // ✅ must be a valid UserRole
      agency: "Unknown",
    };
  }

  return JSON.parse(raw) as CurrentUser;
}