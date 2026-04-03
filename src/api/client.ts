import { useDataverseClient } from "./dataverseClient";

export function useAgencyApi() {
  const { dvFetch } = useDataverseClient();

  return {
    async getAgencyUsers() {
      const res = await dvFetch(
        "cr865_agencyuserprofiles?$select=cr865_name,cr865_email,cr865_role"
      );
      return res.value;
    },
  };
}