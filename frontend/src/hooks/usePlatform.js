import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { responseData } from "../services/api/client.js";
import {
  createDemoTurf,
  normalizeCoach,
  normalizeCoachRequest,
  normalizePayment,
  normalizeTournament,
  normalizeTournamentRegistration,
  normalizeTurf,
} from "../services/api/normalize.js";
import {
  adminApi,
  coachingApi,
  favoritesApi,
  notificationsApi,
  paymentsApi,
  tournamentsApi,
  usersApi,
} from "../services/api/platform.js";
import { turfsApi } from "../services/api/turfs.js";

export function useFavorites(enabled = true) {
  return useQuery({
    queryKey: ["favorites"],
    enabled,
    queryFn: async () => {
      try {
        const favorites = (responseData(await favoritesApi.list()).favorites || []).map(normalizeTurf);
        return favorites.length ? favorites : [createDemoTurf({ name: "Saved TURFX Demo Arena" })];
      } catch {
        return [createDemoTurf({ name: "Saved TURFX Demo Arena" })];
      }
    },
  });
}

export function useFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }) => favorite ? favoritesApi.add(id) : favoritesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => (responseData(await paymentsApi.history()).payments || []).map(normalizePayment),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useCoaches() {
  return useQuery({
    queryKey: ["coaching", "coaches"],
    queryFn: async () => (responseData(await coachingApi.coaches()).coaches || []).map(normalizeCoach),
  });
}

export function useMyCoachRequests(enabled = true) {
  return useQuery({
    queryKey: ["coaching", "mine"],
    enabled,
    queryFn: async () => (responseData(await coachingApi.mine()).coachRequests || []).map(normalizeCoachRequest),
  });
}

export function useCreateCoachRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => coachingApi.createRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useOwnerCoachRequests() {
  return useQuery({
    queryKey: ["coaching", "owner"],
    queryFn: async () => (responseData(await coachingApi.ownerRequests()).coachRequests || []).map(normalizeCoachRequest),
  });
}

export function useUpdateCoachRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason = "" }) => coachingApi.updateStatus(id, { reason, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useTournaments(params = {}) {
  return useQuery({
    queryKey: ["tournaments", params],
    queryFn: async () =>
      (responseData(await tournamentsApi.list(params)).tournaments || []).map(normalizeTournament),
  });
}

export function useOwnerTournaments() {
  return useQuery({
    queryKey: ["tournaments", "owner"],
    queryFn: async () =>
      (responseData(await tournamentsApi.ownerList()).tournaments || []).map(normalizeTournament),
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => tournamentsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => tournamentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
  });
}

export function useTournament(id) {
  return useQuery({
    queryKey: ["tournaments", id],
    enabled: Boolean(id),
    queryFn: async () => normalizeTournament(responseData(await tournamentsApi.detail(id)).tournament),
  });
}

export function useMyTournamentRegistrations(enabled = true) {
  return useQuery({
    queryKey: ["tournaments", "registrations", "mine"],
    enabled,
    queryFn: async () =>
      (responseData(await tournamentsApi.myRegistrations()).registrations || []).map(normalizeTournamentRegistration),
  });
}

export function useCreateTournamentRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => tournamentsApi.createRegistration(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useOwnerTournamentRegistrations() {
  return useQuery({
    queryKey: ["tournaments", "registrations", "owner"],
    queryFn: async () =>
      (responseData(await tournamentsApi.ownerRegistrations()).registrations || []).map(normalizeTournamentRegistration),
  });
}

export function useUpdateTournamentRegistrationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason = "", status }) => tournamentsApi.updateRegistrationStatus(id, { reason, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useAdminOwners(params = {}) {
  return useQuery({
    queryKey: ["admin", "owners", params],
    queryFn: async () => responseData(await adminApi.owners(params)),
  });
}

export function useAdminUsers(params = {}) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: async () => responseData(await usersApi.list(params)),
  });
}

export function useAdminTurfs() {
  return useQuery({
    queryKey: ["admin", "turfs"],
    queryFn: async () => {
      const data = responseData(await turfsApi.list({ includeUnapproved: true, limit: 100 }));
      return (data.turfs || []).map(normalizeTurf);
    },
  });
}

export function useAdminVenueSchedules() {
  return useQuery({
    queryKey: ["admin", "venue-schedules"],
    queryFn: async () => responseData(await adminApi.venueSchedules()).schedules || [],
  });
}

export function useBookingConflictLogs(params = {}) {
  return useQuery({
    queryKey: ["admin", "conflict-logs", params],
    queryFn: async () => responseData(await adminApi.conflictLogs(params)).logs || [],
  });
}

export function useOwnerStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }) => adminApi.updateOwnerStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "owners"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useTurfStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }) => adminApi.updateTurfStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "turfs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => notificationsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => paymentsApi.refund(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => usersApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
