export const BOOKING_AUTH_MESSAGE = "Please sign in first to continue booking.";

export const roleLabels = {
  admin: "Platform Owner",
  owner: "Turf Owner",
  user: "User",
};

export const roleHome = {
  admin: "/admin/dashboard",
  owner: "/owner/dashboard",
  user: "/dashboard",
};

export const demoLoginOptions = [
  {
    ariaLabel: `${roleLabels.admin} Login`,
    email: "admin@turfx.com",
    helperText: "You are signing in as the Platform Owner. This account manages the entire TURFX platform.",
    label: roleLabels.admin,
    password: "Admin@123",
    role: "admin",
  },
  {
    ariaLabel: `${roleLabels.owner} Login`,
    email: "owner1@turfx.com",
    helperText: "You are signing in as a Turf Owner. This account manages venues and bookings.",
    label: roleLabels.owner,
    password: "Owner@123",
    role: "owner",
  },
  {
    ariaLabel: `${roleLabels.user} Login`,
    email: "user1@turfx.com",
    helperText: "You are signing in as a User. This account can browse and book venues.",
    label: roleLabels.user,
    password: "User@123",
    role: "user",
  },
];
