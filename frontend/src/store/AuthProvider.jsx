import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authService, DEMO_LOGIN_OPTIONS } from "../services/authService.js";
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
    dispatch(fetchProfile());
  }, [dispatch]);

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
      demoLoginOptions: DEMO_LOGIN_OPTIONS,
      hasRole,
      initialized,
      isAuthenticated,
      login,
      logout,
      register,
      status,
      token,
      user,
    }),
    [hasRole, initialized, isAuthenticated, login, logout, register, status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
