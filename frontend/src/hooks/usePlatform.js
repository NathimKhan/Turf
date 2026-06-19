import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { responseData } from "../services/api/client.js";
import {
  createDemoTurf,
  normalizeEvent,
  normalizePayment,
  normalizeTournament,
  normalizeTurf,
} from "../services/api/normalize.js";
import {
  adminApi,
  eventsApi,
  favoritesApi,
  notificationsApi,
  ownerApi,
  paymentsApi,
  reviewsApi,
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
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => (responseData(await eventsApi.list()).events || []).map(normalizeEvent),
  });
}

export function useEvent(id) {
  return useQuery({
    queryKey: ["events", id],
    enabled: Boolean(id),
    queryFn: async () => normalizeEvent(responseData(await eventsApi.detail(id)).event),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => eventsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => eventsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useTournaments(params = {}) {
  return useQuery({
    queryKey: ["tournaments", params],
    queryFn: async () =>
      (responseData(await tournamentsApi.list(params)).tournaments || []).map(normalizeTournament),
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => tournamentsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
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

export function useOwnerReviews() {
  return useQuery({
    queryKey: ["owner", "reviews"],
    queryFn: async () => responseData(await ownerApi.reviews()).reviews || [],
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

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => responseData(await adminApi.settings()).settings || [],
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

export function useMyReviews(enabled = true) {
  return useQuery({
    queryKey: ["reviews", "mine"],
    enabled,
    queryFn: async () => responseData(await reviewsApi.mine()).reviews || [],
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => reviewsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => reviewsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => reviewsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
    },
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

export function useSaveSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, payload }) => adminApi.saveSetting(key, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}
