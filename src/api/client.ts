import { apiScopes } from "../auth/msalConfig";
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
        scopes: apiScopes,
      });
    } catch {
      tokenResponse = await instance.acquireTokenPopup({
        scopes: apiScopes,
      });
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'X-MSAL-Token': `Bearer ${tokenResponse.accessToken}`,
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

export function useTransferApi() {
  const { apiFetch } = useApiClient();
  return {
    async getTransfers(filters?: { status?: string; type?: string }) {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.type) params.set("type", filters.type);
      const res = await apiFetch<{ value: any[] }>(`/transfers?${params}`);
      return res.value;
    },

    async getTransferById(id: string) {
      return apiFetch<any>(`/transfers/${id}`);
    },

    async createTransfer(body: {
      equipment_id: string;
      request_type: "transfer" | "borrow";
      to_agency_id: string;
      notes?: string;
      expected_return_date?: string;
    }) {
      return apiFetch<any>("/transfers", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    async approveTransfer(id: string) {
      return apiFetch<any>(`/transfers/${id}/approve`, { method: "PATCH", body: "{}" });
    },

    async denyTransfer(id: string, reason?: string) {
      return apiFetch<any>(`/transfers/${id}/deny`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
    },

    async updateTransferStatus(id: string, status: string) {
      return apiFetch<any>(`/transfers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
  };
}

export function useLibraryApi() {
  const { apiFetch } = useApiClient();
  return {
    async getCategories() {
      const res = await apiFetch<{ value: any[] }>("/library-categories");
      return res.value;
    },

    async createCategory(name: string, description?: string) {
      return apiFetch<any>("/library-categories", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
    },

    async getResources(filters?: { categoryId?: string; search?: string }) {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.set("categoryId", filters.categoryId);
      if (filters?.search) params.set("search", filters.search);
      const res = await apiFetch<{ value: any[] }>(`/library?${params}`);
      return res.value;
    },

    async getResourceById(id: string) {
      return apiFetch<any>(`/library/${id}`);
    },

    async createResource(body: {
      category_id: string;
      title: string;
      description?: string;
      file_url?: string;
      file_type?: string;
      tags?: string;
      agency_id?: string | null;
    }) {
      return apiFetch<any>("/library", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    async updateResource(id: string, body: Partial<{
      title: string;
      description: string;
      category_id: string;
      file_url: string;
      file_type: string;
      tags: string;
    }>) {
      return apiFetch<any>(`/library/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },

    async deleteResource(id: string) {
      return apiFetch<void>(`/library/${id}`, { method: "DELETE" });
    },
  };
}