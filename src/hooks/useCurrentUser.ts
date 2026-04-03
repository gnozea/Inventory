// Bridge file — maps Dataverse + MSAL identity to the shape
// the rest of the app was built with (useCurrentUser)

import { useMsal } from "@azure/msal-react";
import { useQuery } from "@tanstack/react-query";
import { useDataverseClient } from "../api/dataverseClient";

/* ======================
   App roles
====================== */

export type UserRole =
  | "AgencyUser"
  | "AgencyAdmin"
  | "AgencyReporter"
  | "GlobalViewer"
  | "SystemAdmin";

/* ======================
   App user shape (MUST match existing app expectations)
====================== */

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  agency: string;
  agencyId: string;
  businessUnitId: string;
}

/* ======================
   Dataverse types
====================== */

interface SystemUser {
  systemuserid: string;
  fullname: string;
  _businessunitid_value: string;

  systemuserroles_association: {
    name: string;
  }[];

  cr865_contact?: {
    contactid: string;
    fullname: string;
    accountid?: {
      accountid: string;
      name: string;
    };
  };
}

interface DataverseCollection<T> {
  value: T[];
}

/* ======================
   Role mapping
====================== */

function deriveRole(roleNames: string[]): UserRole {
  const roles = roleNames.map(r => r.toLowerCase().trim());

  if (roles.includes("system administrator")) return "SystemAdmin";
  if (roles.includes("global viewer")) return "GlobalViewer";
  if (roles.includes("agency admin")) return "AgencyAdmin";
  if (roles.includes("agency reporter")) return "AgencyReporter";

  return "AgencyUser";
}

/* ======================
   Hook — RETURNS CurrentUser DIRECTLY
====================== */

export function useCurrentUser(): CurrentUser {
  const { accounts } = useMsal();
  const { dvFetch } = useDataverseClient();
  const account = accounts[0];

  const { data } = useQuery({
    queryKey: ["currentUser", account?.homeAccountId],
    enabled: !!account?.homeAccountId,
    staleTime: 5 * 60 * 1000,

    queryFn: async (): Promise<CurrentUser> => {
      const aadObjectId = account!.homeAccountId;

      const res = await dvFetch<DataverseCollection<SystemUser>>(
        `systemusers?$filter=azureactivedirectoryobjectid eq '${aadObjectId}'` +
          `&$select=systemuserid,fullname,_businessunitid_value` +
          `&$expand=` +
            `systemuserroles_association($select=name),` +
            `cr865_contact(` +
              `$select=contactid,fullname,accountid;` +
              `$expand=accountid($select=accountid,name)` +
            `)`
      );

      const user = res.value[0];
      if (!user) {
        throw new Error("User not found in Dataverse");
      }

      const role = deriveRole(
        user.systemuserroles_association.map(r => r.name)
      );

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

  // Always return a CurrentUser
  return (
    data ?? {
      id: "loading",
      name: "Loading…",
      role: "AgencyUser",
      agency: "Unknown",
      agencyId: "",
      businessUnitId: "",
    }
  );
}