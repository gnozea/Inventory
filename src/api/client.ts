import { useMsal } from "@azure/msal-react";

const API_URL = import.meta.env.VITE_API_URL as string;

export function useApiClient() {
  const { accounts, instance } = useMsal();
  const account = accounts[0];

  async function apiFetch<T = any>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    let tokenResponse;
    try {
      tokenResponse = await instance.acquireTokenSilent({
        account,
        scopes: ["User.Read"],
      });
    } catch {
      tokenResponse = await instance.acquireTokenPopup({
        scopes: ["User.Read"],
      });
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return { apiFetch };
}

export function useEquipmentApi() {
  const { apiFetch } = useApiClient();

  return {
    async getEquipment(filters?: {
      status?: number;
      category?: string;
      search?: string;
    }) {
      const params = new URLSearchParams();
      if (filters?.status !== undefined)
        params.set("status", String(filters.status));
      if (filters?.category) params.set("category", filters.category);
      if (filters?.search) params.set("search", filters.search);
      const res = await apiFetch<{ value: any[] }>(`/equipment?${params}`);
      return res.value;
    },

    async getEquipmentById(id: string) {
      return apiFetch<any>(`/equipment/${id}`);
    },

    async updateEquipmentStatus(
      id: string,
      newStatus: number,
      notes: string,
      oldStatus: number
    ) {
      return apiFetch(`/equipment/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ newStatus, notes, oldStatus }),
      });
    },
  };
}

export function useAgencyApi() {
  const { apiFetch } = useApiClient();
  return {
    async getAgencies() {
      const res = await apiFetch<{ value: any[] }>("/agencies");
      return res.value;
    },
  };
}

export function useStatusLogApi() {
  const { apiFetch } = useApiClient();
  return {
    async getStatusLog(equipmentId: string) {
      const res = await apiFetch<{ value: any[] }>(
        `/statuslog/${equipmentId}`
      );
      return res.value;
    },
  };
}

export function useReportApi() {
  const { apiFetch } = useApiClient();
  return {
    async getReports() {
      return apiFetch<{ byStatus: any[]; byCategory: any[] }>("/reports");
    },
  };
}

export function useSearchApi() {
  const { apiFetch } = useApiClient();
  return {
    async searchEquipment(
      q: string,
      filters?: {
        agencyId?: string;
        status?: number;
        category?: string;
      }
    ) {
      const params = new URLSearchParams({ q });
      if (filters?.agencyId) params.set("agencyId", filters.agencyId);
      if (filters?.status !== undefined)
        params.set("status", String(filters.status));
      if (filters?.category) params.set("category", filters.category);
      const res = await apiFetch<{ value: any[] }>(`/search?${params}`);
      return res.value;
    },
  };
}