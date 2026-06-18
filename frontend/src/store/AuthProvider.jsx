import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authService } from "../services/authService.js";
import { AuthContext } from "./authContext.js";
import {
  clearAuth,
  fetchProfile,
  loginUser,
  logoutUser,
  registerUser,
  selectAuthInitialized,
  selectAuthStatus,
  selectAuthToken,
  selectAuthUser,
} from "./authSlice.js";

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const initialized = useSelector(selectAuthInitialized);
  const status = useSelector(selectAuthStatus);
  const token = useSelector(selectAuthToken);
  const user = useSelector(selectAuthUser);

  useEffect(() => {
    if (token) {
      dispatch(fetchProfile());
    } else {
      dispatch(clearAuth());
    }
  }, [dispatch, token]);

  useEffect(() => {
    const handleUnauthorized = () => dispatch(clearAuth());
    window.addEventListener("turfx:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("turfx:unauthorized", handleUnauthorized);
  }, [dispatch]);

  const login = useCallback(
    async (credentials) => dispatch(loginUser(credentials)).unwrap(),
    [dispatch],
  );

  const register = useCallback(
    async (details) => dispatch(registerUser(details)).unwrap(),
    [dispatch],
  );

  const refreshProfile = useCallback(
    async () => dispatch(fetchProfile()).unwrap(),
    [dispatch],
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser()).unwrap();
  }, [dispatch]);

  const isAuthenticated = useCallback(() => Boolean(user), [user]);

  const hasRole = useCallback(
    (role) => {
      if (!role) return isAuthenticated();
      return authService.normalizeRole(user?.role) === authService.normalizeRole(role);
    },
    [isAuthenticated, user],
  );

  const value = useMemo(
    () => ({
      hasRole,
      initialized,
      isAuthenticated,
      login,
      logout,
      register,
      refreshProfile,
      status,
      token,
      user,
    }),
    [hasRole, initialized, isAuthenticated, login, logout, refreshProfile, register, status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
