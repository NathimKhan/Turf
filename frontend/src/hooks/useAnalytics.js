import { useQuery } from "@tanstack/react-query";
import { responseData } from "../services/api/client.js";
import { adminApi, ownerApi, usersApi } from "../services/api/platform.js";

export function useAnalytics() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => responseData(await adminApi.dashboard()),
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => responseData(await usersApi.list({ role: "user", limit: 100 })).users || [],
  });
}

export function useOwnerDashboard() {
  return useQuery({
    queryKey: ["owner", "dashboard"],
    queryFn: async () => responseData(await ownerApi.dashboard()),
  });
}
