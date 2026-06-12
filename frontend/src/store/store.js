import { configureStore, createSlice } from "@reduxjs/toolkit";
import authReducer, { loginSucceeded, logoutUser } from "./authSlice.js";

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    selectedVenue: "stadium-turf",
    selectedDate: "2026-06-06",
    selectedSlot: "19:00",
    cart: {
      venue: "The Stadium Turf",
      price: 85,
      serviceFee: 5,
      discount: 10,
    },
  },
  reducers: {
    selectVenue(state, action) {
      state.selectedVenue = action.payload;
    },
    selectSlot(state, action) {
      state.selectedDate = action.payload.date;
      state.selectedSlot = action.payload.slot;
    },
    resetBooking(state) {
      state.selectedVenue = "stadium-turf";
      state.selectedDate = "2026-06-06";
      state.selectedSlot = "19:00";
    },
  },
});

export const { selectVenue, selectSlot, resetBooking } = bookingSlice.actions;
export { loginSucceeded, logoutUser };

export const store = configureStore({
  reducer: {
    auth: authReducer,
    booking: bookingSlice.reducer,
  },
});
