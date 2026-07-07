import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { AuthProvider } from "./store/AuthProvider.jsx";
import { LocationProvider } from "./store/LocationProvider.jsx";
import { store } from "./store/store.js";
import { notify } from "./utils/notify.js";
import "./styles/index.css";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => notify(error.response?.data?.message || error.message || "The action could not be completed."),
  }),
  queryCache: new QueryCache({
    onError: (error) => notify(error.response?.data?.message || error.message || "Data could not be loaded."),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <LocationProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </LocationProvider>
        </QueryClientProvider>
      </AuthProvider>
    </Provider>
  </StrictMode>,
);
