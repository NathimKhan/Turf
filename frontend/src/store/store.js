import { configureStore, createSlice } from "@reduxjs/toolkit";
import authReducer, { loginSucceeded, logoutUser } from "./authSlice.js";

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    bookingId: null,
    selectedVenue: null,
    selectedDate: "",
    selectedSlot: null,
    cart: {
      venue: "",
      location: "",
      price: 0,
      serviceFee: 0,
      discount: 0,
    },
  },
  reducers: {
    selectVenue(state, action) {
      const venueChanged = state.selectedVenue !== action.payload.id;
      state.selectedVenue = action.payload.id;
      state.cart.venue = action.payload.name;
      state.cart.location = action.payload.location;
      state.cart.price = action.payload.price;
      if (venueChanged) {
        state.bookingId = null;
        state.selectedSlot = null;
      }
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
      state.selectedDate = "";
      state.selectedSlot = null;
      state.cart = {
        venue: "",
        location: "",
        price: 0,
        serviceFee: 0,
        discount: 0,
      };
    },
  },
});

export const { resetBooking, selectSlot, selectVenue, setBookingId } = bookingSlice.actions;
export { loginSucceeded, logoutUser };

export const store = configureStore({
  reducer: {
    auth: authReducer,
    booking: bookingSlice.reducer,
  },
});
