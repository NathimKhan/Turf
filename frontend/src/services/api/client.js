import axios from "axios";
import { authService } from "../authService.js";

const DEFAULT_API_BASE_URL = "/api";

function normalizeApiBaseUrl(value = DEFAULT_API_BASE_URL) {
  const clean = String(value || "").trim().replace(/\/+$/, "");
  if (!clean) return DEFAULT_API_BASE_URL;
  return clean === DEFAULT_API_BASE_URL || clean.endsWith("/api") ? clean : `${clean}/api`;
}

export const apiClient = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL),
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
