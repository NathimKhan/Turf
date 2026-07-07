import { createContext, useContext } from "react";

export const LocationContext = createContext({
  error: "",
  location: null,
  requestLocation: () => {},
  status: "idle",
});

export function useUserLocation() {
  return useContext(LocationContext);
}
