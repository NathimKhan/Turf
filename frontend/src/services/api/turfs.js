import { apiClient } from "./client.js";

export const turfsApi = {
  list: (params) => apiClient.get("/turfs", { params }),
  detail: (id) => apiClient.get(`/turfs/${id}`),
  metadata: () => apiClient.get("/turfs/meta"),
  mine: () => apiClient.get("/turfs/mine"),
  availability: (id, date, params = {}) => apiClient.get(`/turfs/${id}/availability`, { params: { date, ...params } }),
  create: (payload) => apiClient.post("/turfs", payload),
  update: (id, payload) => apiClient.put(`/turfs/${id}`, payload),
  updateSlots: (id, payload) => apiClient.put(`/turfs/${id}/slots`, payload),
  remove: (id) => apiClient.delete(`/turfs/${id}`),
};
