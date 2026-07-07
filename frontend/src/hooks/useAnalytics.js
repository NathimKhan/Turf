import { useQuery } from "@tanstack/react-query";
import { responseData } from "../services/api/client.js";
import { adminApi, ownerApi } from "../services/api/platform.js";

export function useAnalytics() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => responseData(await adminApi.dashboard()),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useOwnerDashboard() {
  return useQuery({
    queryKey: ["owner", "dashboard"],
    queryFn: async () => responseData(await ownerApi.dashboard()),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}
