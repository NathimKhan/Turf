import { apiClient } from "./client.js";

export const turfsApi = {
  list: (params) => apiClient.get("/turfs", { params }),
  detail: (id, params) => apiClient.get(`/turfs/${id}`, { params }),
  geocode: (params) => apiClient.get("/turfs/geocode", { params }),
  metadata: () => apiClient.get("/turfs/meta"),
  mine: () => apiClient.get("/turfs/mine"),
  nearby: (params) => apiClient.get("/turfs/nearby", { params }),
  availability: (id, date, params = {}) => apiClient.get(`/turfs/${id}/availability`, { params: { date, ...params } }),
  create: (payload) => apiClient.post("/turfs", payload),
  update: (id, payload) => apiClient.put(`/turfs/${id}`, payload),
  resubmit: (id) => apiClient.post(`/turfs/${id}/resubmit`),
  updateSlots: (id, payload) => apiClient.put(`/turfs/${id}/slots`, payload),
  remove: (id) => apiClient.delete(`/turfs/${id}`),
};
