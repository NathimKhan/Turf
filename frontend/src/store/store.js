import { configureStore, createSlice } from "@reduxjs/toolkit";
import authReducer, { loginSucceeded, logoutUser } from "./authSlice.js";

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    bookingId: null,
    selectedVenue: null,
    selectedSport: "",
    selectedDate: "",
    selectedSlot: null,
    cart: {
      venue: "",
      sport: "",
      location: "",
      price: 0,
      serviceFee: 0,
      discount: 0,
    },
  },
  reducers: {
    selectVenue(state, action) {
      const venueChanged = state.selectedVenue !== action.payload.id;
      const sports = action.payload.sportsSupported || [];
      const selectedSport = sports.includes(state.selectedSport) ? state.selectedSport : sports[0] || action.payload.sport || "";
      const selectedRate = action.payload.sportRates?.[selectedSport] ?? action.payload.price;
      state.selectedVenue = action.payload.id;
      state.selectedSport = selectedSport;
      state.cart.venue = action.payload.name;
      state.cart.sport = selectedSport;
      state.cart.location = action.payload.location;
      state.cart.price = Number(selectedRate || 0);
      if (venueChanged) {
        state.bookingId = null;
        state.selectedSlot = null;
      }
    },
    selectSport(state, action) {
      state.selectedSport = action.payload.sport;
      state.cart.sport = action.payload.sport;
      state.cart.price = Number(action.payload.price || 0);
      state.bookingId = null;
      state.selectedSlot = null;
    },
    selectSlot(state, action) {
      const slotChanged =
        state.selectedDate !== action.payload.date ||
        state.selectedSlot?.startTime !== action.payload.slot?.startTime ||
        state.selectedSlot?.endTime !== action.payload.slot?.endTime;
      state.selectedDate = action.payload.date;
      state.selectedSlot = action.payload.slot;
      if (slotChanged) state.bookingId = null;
    },
    setBookingId(state, action) {
      state.bookingId = action.payload;
    },
    resetBooking(state) {
      state.bookingId = null;
      state.selectedVenue = null;
      state.selectedSport = "";
      state.selectedDate = "";
      state.selectedSlot = null;
      state.cart = {
        venue: "",
        sport: "",
        location: "",
        price: 0,
        serviceFee: 0,
        discount: 0,
      };
    },
  },
});

export const { resetBooking, selectSlot, selectSport, selectVenue, setBookingId } = bookingSlice.actions;
export { loginSucceeded, logoutUser };

export const store = configureStore({
  reducer: {
    auth: authReducer,
    booking: bookingSlice.reducer,
  },
});
