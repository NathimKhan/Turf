import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BOOKING_AUTH_MESSAGE } from "../constants/auth.js";
import { useAuth } from "../store/authContext.js";

export function useBookingGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return useCallback(
    (destination = "/booking/slots") => {
      if (user) {
        navigate(destination);
        return true;
      }

      navigate("/login", {
        replace: true,
        state: {
          from: location,
          toast: BOOKING_AUTH_MESSAGE,
        },
      });
      return false;
    },
    [location, navigate, user],
  );
}
