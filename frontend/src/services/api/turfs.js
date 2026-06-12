import { apiClient } from "./client.js";

export const turfsApi = {
  list: (params) => apiClient.get("/turfs", { params }),
  detail: (id) => apiClient.get(`/turfs/${id}`),
  create: (payload) => apiClient.post("/turfs", payload),
  updateSlots: (id, payload) => apiClient.put(`/turfs/${id}/slots`, payload),
};
