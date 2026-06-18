import { apiClient } from "./client.js";

export const bookingsApi = {
  list: () => apiClient.get("/bookings"),
  detail: (id) => apiClient.get(`/bookings/${id}`),
  reserve: (payload) => apiClient.post("/bookings", payload),
  cancel: (id) => apiClient.put(`/bookings/cancel/${id}`),
  updateStatus: (id, status) => apiClient.patch(`/bookings/${id}/status`, { status }),
  checkout: (payload) => apiClient.post("/payments/checkout", payload),
};
