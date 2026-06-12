import { apiClient } from "./client.js";

export const authApi = {
  login: (payload) => apiClient.post("/auth/login", payload),
  register: (payload) => apiClient.post("/auth/register", payload),
  forgotPassword: (payload) => apiClient.post("/auth/forgot-password", payload),
  profile: () => apiClient.get("/auth/profile"),
  logout: () => apiClient.post("/auth/logout"),
};
