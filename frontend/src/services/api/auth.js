import { apiClient } from "./client.js";

export const authApi = {
  login: (payload) => apiClient.post("/auth/login", payload),
  register: (payload) => apiClient.post("/auth/register", payload),
  registerOwner: (payload) => apiClient.post("/auth/register-owner", payload),
  forgotPassword: (payload) => apiClient.post("/auth/forgot-password", payload),
  profile: () => apiClient.get("/auth/profile"),
  updateProfile: (payload) => apiClient.put("/auth/profile", payload),
  upgradeMembership: (plan) => apiClient.post("/auth/membership/upgrade", { plan }),
  updateWallet: (payload) => apiClient.post("/auth/wallet", payload),
  logout: () => apiClient.post("/auth/logout"),
};
