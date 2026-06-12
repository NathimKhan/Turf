import { useQuery } from "@tanstack/react-query";
import { mockApi } from "../services/mockApi.js";

export function useTurfs() {
  return useQuery({
    queryKey: ["turfs"],
    queryFn: mockApi.getTurfs,
  });
}

export function useTurf(id) {
  return useQuery({
    queryKey: ["turfs", id],
    queryFn: () => mockApi.getTurf(id),
  });
}
