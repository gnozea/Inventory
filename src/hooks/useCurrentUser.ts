import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDataverseClient } from "../api/dataverseClient";

export type UserRole =
  | "AgencyUser"
  | "AgencyAdmin"
  | "AgencyReporter"
  | "GlobalViewer"
  | "SystemAdmin";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  agency: string;
  agencyId: string;
  businessUnitId: string;
}

interface SystemUser {
  systemuserid: string;
  fullname: string;
  _businessunitid_value: string;
  systemuserroles_association: { name: string }[];
  cr865_contact?: {
    contactid: string;
    fullname: string;
    accountid?: {
      accountid: string;
      name: string;
    };
  };
}

function deriveRole(roleNames: string[]): UserRole {
  const roles = roleNames.map((r) => r.toLowerCase().trim());
  if (roles.includes("system administrator")) return "SystemAdmin";
  if (roles.includes("global viewer")) return "GlobalViewer";
  if (roles.includes("agency admin")) return "AgencyAdmin";
  if (roles.includes("agency reporter")) return "AgencyReporter";
  return "AgencyUser";
}

export function useCurrentUser(): CurrentUser {
  const { accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { dvFetch } = useDataverseClient();
  const queryClient = useQueryClient();
  const account = accounts[0];

  // If cached user has a numeric id it's mock data — purge it immediately
  useEffect(() => {
    const cached = queryClient.getQueryData<CurrentUser>([
      "currentUser",
      account?.localAccountId,
    ]);
    if (cached && typeof (cached.id as unknown) === "number") {
      console.log("[useCurrentUser] purging stale mock cache");
      queryClient.removeQueries({ queryKey: ["currentUser"] });
    }
  }, [account?.localAccountId, queryClient]);

  const { data } = useQuery({
    queryKey: ["currentUser", account?.localAccountId],
    enabled: isAuthenticated && !!account?.localAccountId,
    staleTime: 0,       // always re-fetch — no stale cache
    gcTime: 0,          // don't keep in cache between sessions
    refetchOnMount: true,

    queryFn: async (): Promise<CurrentUser> => {
      // Belt and braces — clear mock data every time this runs
      localStorage.removeItem("dev_current_user");
      localStorage.removeItem("mockUser");

      const aadObjectId = account!.localAccountId;
      console.log("[useCurrentUser] querying Dataverse for:", aadObjectId);

      const res = await dvFetch<{ value: SystemUser[] }>(
        `/systemusers?$filter=azureactivedirectoryobjectid eq ${aadObjectId}` +
          `&$select=systemuserid,fullname,_businessunitid_value` +
          `&$expand=` +
          `systemuserroles_association($select=name),` +
          `cr865_contact(` +
          `$select=contactid,fullname,accountid;` +
          `$expand=accountid($select=accountid,name)` +
          `)`
      );

      console.log("[useCurrentUser] raw result:", JSON.stringify(res.value, null, 2));

      const user = res.value[0];
      if (!user) {
        throw new Error(
          `No Dataverse systemuser found for AAD object ID: ${aadObjectId}`
        );
      }

      const roleNames = user.systemuserroles_association.map((r) => r.name);
      const role = deriveRole(roleNames);

      console.log("[useCurrentUser] roles:", roleNames);
      console.log("[useCurrentUser] derived role:", role);
      console.log("[useCurrentUser] agency:", user.cr865_contact?.accountid?.name);

      return {
        id: user.systemuserid,
        name: user.fullname,
        role,
        agency: user.cr865_contact?.accountid?.name ?? "Unknown",
        agencyId: user.cr865_contact?.accountid?.accountid ?? "",
        businessUnitId: user._businessunitid_value,
      };
    },
  });

  // If Dataverse query hasn't resolved yet show loading state
  // Never fall back to localStorage — DevToolbar handles that separately
  return (
    data ?? {
      id: "loading",
      name: "Loading…",
      role: "AgencyUser",
      agency: "Loading…",
      agencyId: "",
      businessUnitId: "",
    }
  );
}