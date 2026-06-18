import axios from "axios";
import { authService } from "../authService.js";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 12000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = authService.getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.dispatchEvent(new Event("turfx:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function responseData(response) {
  return response.data?.data || {};
}
