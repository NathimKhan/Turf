import { apiClient } from "./client.js";

export const notificationsApi = {
  list: (params = {}) => apiClient.get("/notifications", { params }),
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
};

export const adminApi = {
  conflictLogs: (params) => apiClient.get("/admin/conflict-logs", { params }),
  dashboard: () => apiClient.get("/admin/dashboard"),
  owners: (params) => apiClient.get("/admin/owners", { params }),
  updateOwnerStatus: (id, status, reason = "") =>
    apiClient.patch(`/admin/owners/${id}/status`, { status, reason }),
  updateTurfStatus: (id, status, reason = "") =>
    apiClient.patch(`/admin/turfs/${id}/status`, { status, reason }),
  venueSchedules: () => apiClient.get("/admin/venue-schedules"),
};

export const usersApi = {
  list: (params) => apiClient.get("/users", { params }),
  update: (id, payload) => apiClient.put(`/users/${id}`, payload),
  remove: (id) => apiClient.delete(`/users/${id}`),
};

export const tournamentsApi = {
  list: (params) => apiClient.get("/tournaments", { params }),
  detail: (id) => apiClient.get(`/tournaments/${id}`),
  create: (payload) => apiClient.post("/tournaments", payload),
  createRegistration: (id, payload) => apiClient.post(`/tournaments/${id}/register`, payload),
  myRegistrations: () => apiClient.get("/tournaments/mine/registrations"),
  ownerList: () => apiClient.get("/tournaments/owner/mine"),
  ownerRegistrations: () => apiClient.get("/tournaments/owner/registrations"),
  update: (id, payload) => apiClient.put(`/tournaments/${id}`, payload),
  updateRegistrationStatus: (id, payload) => apiClient.patch(`/tournaments/registrations/${id}/status`, payload),
  remove: (id) => apiClient.delete(`/tournaments/${id}`),
};

export const coachingApi = {
  coaches: () => apiClient.get("/coaching/coaches"),
  createRequest: (payload) => apiClient.post("/coaching/requests", payload),
  mine: () => apiClient.get("/coaching/mine"),
  ownerRequests: () => apiClient.get("/coaching/owner/requests"),
  updateStatus: (id, payload) => apiClient.patch(`/coaching/requests/${id}/status`, payload),
};
