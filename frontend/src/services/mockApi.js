import {
  analyticsSeries,
  bookings,
  events,
  members,
  notifications,
  turfs,
} from "../data/turfxData.js";

function delay(value, ms = 220) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

export const mockApi = {
  getTurfs: () => delay(turfs),
  getTurf: (id) => delay(turfs.find((turf) => turf.id === id) || turfs[0]),
  getBookings: () => delay(bookings),
  getEvents: () => delay(events),
  getNotifications: () => delay(notifications),
  getMembers: () => delay(members),
  getAnalytics: () => delay(analyticsSeries),
};
