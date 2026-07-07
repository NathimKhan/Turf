import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "../services/api/bookings.js";
import { responseData } from "../services/api/client.js";
import { normalizeBooking, normalizeNotification } from "../services/api/normalize.js";
import { notificationsApi } from "../services/api/platform.js";
import { useAuth } from "../store/authContext.js";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => (responseData(await bookingsApi.list()).bookings || []).map(normalizeBooking),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useBooking(id) {
  return useQuery({
    queryKey: ["bookings", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const data = responseData(await bookingsApi.detail(id));
      return normalizeBooking({
        ...(data.booking || {}),
        payment: data.payment || data.booking?.payment || null,
      });
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications(options = {}) {
  const { user } = useAuth();
  const normalizedOptions = typeof options === "boolean" ? { enabled: options } : options;
  const userKey = user?._id || user?.id || user?.email || "signed-out";
  const scope = normalizedOptions.scope || "mine";

  return useQuery({
    queryKey: ["notifications", userKey, scope],
    enabled: Boolean(user) && (normalizedOptions.enabled ?? true),
    queryFn: async () =>
      (responseData(await notificationsApi.list(scope === "all" ? { scope } : {})).notifications || []).map(normalizeNotification),
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
