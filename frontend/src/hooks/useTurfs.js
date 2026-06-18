import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { responseData } from "../services/api/client.js";
import { normalizeTurf } from "../services/api/normalize.js";
import { turfsApi } from "../services/api/turfs.js";

export function useTurfs(params = {}) {
  return useQuery({
    queryKey: ["turfs", params],
    queryFn: async () => {
      const data = responseData(await turfsApi.list(params));
      return {
        pagination: data.pagination,
        turfs: (data.turfs || []).map(normalizeTurf),
      };
    },
  });
}

export function useTurf(id) {
  return useQuery({
    queryKey: ["turfs", id],
    enabled: Boolean(id),
    queryFn: async () => normalizeTurf(responseData(await turfsApi.detail(id)).turf),
  });
}

export function useTurfMetadata() {
  return useQuery({
    queryKey: ["turfs", "metadata"],
    queryFn: async () => responseData(await turfsApi.metadata()),
  });
}

export function useMyTurfs() {
  return useQuery({
    queryKey: ["turfs", "mine"],
    queryFn: async () => (responseData(await turfsApi.mine()).turfs || []).map(normalizeTurf),
  });
}

export function useTurfAvailability(id, date) {
  return useQuery({
    queryKey: ["turfs", id, "availability", date],
    enabled: Boolean(id && date),
    queryFn: async () => responseData(await turfsApi.availability(id, date)),
  });
}

export function useCreateTurf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => turfsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["turfs"] }),
  });
}

export function useUpdateTurf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => turfsApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
      queryClient.invalidateQueries({ queryKey: ["turfs", variables.id] });
    },
  });
}

export function useDeleteTurf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => turfsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["turfs"] }),
  });
}

export function useUpdateTurfSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => turfsApi.updateSlots(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["turfs", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["turfs", "mine"] });
    },
  });
}
