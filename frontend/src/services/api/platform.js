import { apiClient } from "./client.js";

export const notificationsApi = {
  list: () => apiClient.get("/notifications"),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`),
  remove: (id) => apiClient.delete(`/notifications/${id}`),
  create: (payload) => apiClient.post("/notifications", payload),
};

export const favoritesApi = {
  list: () => apiClient.get("/favorites"),
  add: (turfId) => apiClient.post(`/favorites/${turfId}`),
  remove: (turfId) => apiClient.delete(`/favorites/${turfId}`),
};

export const paymentsApi = {
  history: () => apiClient.get("/payments/history"),
  refund: (id) => apiClient.patch(`/payments/${id}/refund`),
};

export const ownerApi = {
  dashboard: () => apiClient.get("/owner/dashboard"),
  reviews: () => apiClient.get("/owner/reviews"),
};

export const adminApi = {
  conflictLogs: (params) => apiClient.get("/admin/conflict-logs", { params }),
  dashboard: () => apiClient.get("/admin/dashboard"),
  owners: (params) => apiClient.get("/admin/owners", { params }),
  updateOwnerStatus: (id, status, reason = "") =>
    apiClient.patch(`/admin/owners/${id}/status`, { status, reason }),
  updateTurfStatus: (id, status, reason = "") =>
    apiClient.patch(`/admin/turfs/${id}/status`, { status, reason }),
  settings: () => apiClient.get("/admin/settings"),
  saveSetting: (key, payload) => apiClient.put(`/admin/settings/${key}`, payload),
  venueSchedules: () => apiClient.get("/admin/venue-schedules"),
};

export const usersApi = {
  list: (params) => apiClient.get("/users", { params }),
  update: (id, payload) => apiClient.put(`/users/${id}`, payload),
  remove: (id) => apiClient.delete(`/users/${id}`),
};

export const eventsApi = {
  list: () => apiClient.get("/events"),
  detail: (id) => apiClient.get(`/events/${id}`),
  create: (payload) => apiClient.post("/events", payload),
  update: (id, payload) => apiClient.put(`/events/${id}`, payload),
  remove: (id) => apiClient.delete(`/events/${id}`),
};

export const tournamentsApi = {
  list: (params) => apiClient.get("/tournaments", { params }),
  detail: (id) => apiClient.get(`/tournaments/${id}`),
  create: (payload) => apiClient.post("/tournaments", payload),
  update: (id, payload) => apiClient.put(`/tournaments/${id}`, payload),
  remove: (id) => apiClient.delete(`/tournaments/${id}`),
};

export const reviewsApi = {
  create: (payload) => apiClient.post("/reviews", payload),
  mine: () => apiClient.get("/reviews/mine"),
  byTurf: (turfId) => apiClient.get(`/reviews/turf/${turfId}`),
  update: (id, payload) => apiClient.put(`/reviews/${id}`, payload),
  remove: (id) => apiClient.delete(`/reviews/${id}`),
};
