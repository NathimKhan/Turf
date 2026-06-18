import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authService } from "../services/authService.js";
import { authApi } from "../services/api/auth.js";

function errorMessage(error) {
  return error.response?.data?.message || error.message || "Authentication request failed.";
}

function authPayload(response) {
  const payload = response.data?.data || {};
  return {
    message: response.data?.message || "",
    token: payload.token || authService.getStoredToken(),
    user: authService.toPublicUser(payload.user),
  };
}

export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.profile();
      return authPayload(response);
    } catch (error) {
      authService.logout();
      return rejectWithValue(errorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = getState().auth;
      return status !== "checking";
    },
  },
);

export const loginUser = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const session = authPayload(await authApi.login(credentials));
    authService.persistSession(session);
    return session;
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const registerUser = createAsyncThunk("auth/register", async (details, { rejectWithValue }) => {
  try {
    const request = details.role === "owner" ? authApi.registerOwner(details) : authApi.register(details);
    const session = authPayload(await request);
    if (session.token) authService.persistSession(session);
    return session;
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await authApi.logout();
  } catch {
    // Local logout must still complete when the API is unavailable.
  } finally {
    authService.logout();
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    error: null,
    initialized: false,
    status: "idle",
    token: authService.getStoredToken(),
    user: null,
  },
  reducers: {
    clearAuth(state) {
      state.error = null;
      state.initialized = true;
      state.status = "idle";
      state.token = null;
      state.user = null;
    },
    loginSucceeded(state, action) {
      state.initialized = true;
      state.token = action.payload?.token || null;
      state.user = authService.toPublicUser(action.payload?.user || action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.error = null;
        state.status = "checking";
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.initialized = true;
        state.status = "idle";
        state.token = action.payload.token || state.token;
        state.user = action.payload.user;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.initialized = true;
        state.status = "idle";
        state.token = null;
        state.user = null;
      })
      .addCase(loginUser.pending, (state) => {
        state.error = null;
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.initialized = true;
        state.status = "idle";
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.status = "idle";
      })
      .addCase(registerUser.pending, (state) => {
        state.error = null;
        state.status = "loading";
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.initialized = true;
        state.status = "idle";
        state.token = action.payload.token || null;
        state.user = action.payload.token ? action.payload.user : null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.error = action.payload;
        state.status = "idle";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.error = null;
        state.initialized = true;
        state.status = "idle";
        state.token = null;
        state.user = null;
      });
  },
});

export const { clearAuth, loginSucceeded } = authSlice.actions;

export const selectAuthToken = (state) => state.auth.token;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthInitialized = (state) => state.auth.initialized;
export const selectAuthStatus = (state) => state.auth.status;
export const selectIsAuthenticated = (state) => Boolean(state.auth.user);
export const selectHasRole = (role) => (state) => authService.normalizeRole(state.auth.user?.role) === authService.normalizeRole(role);

export default authSlice.reducer;
