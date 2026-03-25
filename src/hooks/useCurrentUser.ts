import { useMemo } from "react";

export type UserRole =
  | "SystemAdmin"
  | "GlobalViewer"
  | "AgencyAdmin"
  | "Editor"
  | "Reporter";

export type CurrentUser = {
  id: number;
  name: string;
  role: UserRole;
  agency: string;
};

const STORAGE_KEY = "dev_current_user";

export function useCurrentUser(): CurrentUser {
  return useMemo(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        id: 0,
        name: "Unknown",
        role: "Reporter",
        agency: "Unknown",
      };
    }

    return JSON.parse(raw) as CurrentUser;
  }, []);
}