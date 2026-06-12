import { apiClient } from "./client.js";

export const bookingsApi = {
  list: () => apiClient.get("/bookings"),
  detail: (id) => apiClient.get(`/bookings/${id}`),
  reserve: (payload) => apiClient.post("/bookings", payload),
  checkout: (payload) => apiClient.post("/payments/checkout", payload),
};
