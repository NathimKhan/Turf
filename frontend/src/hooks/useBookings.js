import { useQuery } from "@tanstack/react-query";
import { mockApi } from "../services/mockApi.js";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: mockApi.getBookings,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: mockApi.getNotifications,
  });
}
