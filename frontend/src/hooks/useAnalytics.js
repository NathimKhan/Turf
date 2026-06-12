import { useQuery } from "@tanstack/react-query";
import { mockApi } from "../services/mockApi.js";

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: mockApi.getAnalytics,
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: mockApi.getMembers,
  });
}
