import { roleLabels } from "../constants/auth.js";

const AUTH_STORAGE_KEY = "turfx_auth";
const LEGACY_TOKEN_KEY = "turfx_token";
const LEGACY_USER_KEY = "turfx_user";

export const AUTH_ROLES = {
  ADMIN: "admin",
  OWNER: "owner",
  USER: "user",
};

export const DEMO_USERS = [
  {
    email: "admin@turfx.com",
    name: "Demo Platform Owner",
    password: "Admin@123",
    role: AUTH_ROLES.ADMIN,
  },
  {
    email: "owner1@turfx.com",
    membership: "Venue Pro",
    name: "Demo Turf Owner",
    password: "Owner@123",
    role: AUTH_ROLES.OWNER,
  },
  {
    email: "user1@turfx.com",
    membership: "TURFX Gold",
    name: "Demo User 1",
    password: "User@123",
    points: 12060,
    role: AUTH_ROLES.USER,
  },
];

export const DEMO_LOGIN_OPTIONS = [
  { label: roleLabels.admin, role: AUTH_ROLES.ADMIN },
  { label: roleLabels.owner, role: AUTH_ROLES.OWNER },
  { label: roleLabels.user, role: AUTH_ROLES.USER },
].map((option) => {
  const account = DEMO_USERS.find((user) => user.role === option.role);
  return {
    ...option,
    email: account.email,
    password: account.password,
  };
});

function normalizeRole(role) {
  return role === "athlete" ? AUTH_ROLES.USER : role;
}

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getStoredSession() {
  const session = readJson(AUTH_STORAGE_KEY);
  if (session?.token) {
    const user = toPublicUser(session.user || session);
    return { token: session.token, user };
  }

  const legacyUser = readJson(LEGACY_USER_KEY);
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyUser && legacyToken) {
    return { token: legacyToken, user: toPublicUser(legacyUser) };
  }

  return null;
}

function persistSession(session) {
  const token = session?.token;
  const user = toPublicUser(session?.user || session);

  if (!token || !user) {
    throw new Error("Cannot persist an invalid auth session.");
  }

  const normalizedSession = { token, user };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedSession));
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));

  return normalizedSession;
}

function toPublicUser(session) {
  if (!session) return null;

  const user = { ...(session.user || session) };
  delete user.token;
  delete user.password;

  return {
    ...user,
    role: normalizeRole(user.role),
  };
}

function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

function isAuthenticated() {
  return Boolean(getStoredToken());
}

function hasRole(role, session = getStoredSession()) {
  if (!role) return isAuthenticated();

  return normalizeRole(session?.user?.role) === normalizeRole(role);
}

function getStoredToken() {
  return getStoredSession()?.token || null;
}

export const authService = {
  getStoredSession,
  getStoredToken,
  hasRole,
  isAuthenticated,
  logout,
  normalizeRole,
  persistSession,
  toPublicUser,
};
