import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "../services/api/bookings.js";
import { responseData } from "../services/api/client.js";
import { normalizeBooking, normalizeNotification } from "../services/api/normalize.js";
import { notificationsApi } from "../services/api/platform.js";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => (responseData(await bookingsApi.list()).bookings || []).map(normalizeBooking),
  });
}

export function useBooking(id) {
  return useQuery({
    queryKey: ["bookings", id],
    enabled: Boolean(id),
    queryFn: async () => normalizeBooking(responseData(await bookingsApi.detail(id)).booking),
  });
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications"],
    enabled,
    queryFn: async () =>
      (responseData(await notificationsApi.list()).notifications || []).map(normalizeNotification),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => bookingsApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings", id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => bookingsApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
    },
  });
}
