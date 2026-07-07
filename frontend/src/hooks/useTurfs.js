import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { responseData } from "../services/api/client.js";
import { createDemoAvailability, createDemoTurf, normalizeTurf } from "../services/api/normalize.js";
import { turfsApi } from "../services/api/turfs.js";

const PROTOTYPE_TIMEOUT_MS = 1800;

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withPrototypeTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Prototype venue fallback timeout")), PROTOTYPE_TIMEOUT_MS);
    }),
  ]);
}

function demoForParams(params = {}) {
  const sport = params.sport || params.sportsSupported;
  return createDemoTurf(
    sport
      ? {
          name: `${sport} Demo Arena`,
          sport,
          sportsSupported: [sport],
        }
      : {},
  );
}

function matchesTurfLookup(turf = {}, lookup = "") {
  const normalizedLookup = slugify(lookup);
  const lookupText = String(lookup).trim().toLowerCase();
  const values = [
    turf._id,
    turf.id,
    turf.slug,
    turf.name,
    turf.sport,
    ...(turf.sportsSupported || []),
  ].filter(Boolean);

  return values.some((value) => {
    const text = String(value).trim().toLowerCase();
    return text === lookupText || slugify(text) === normalizedLookup;
  });
}

async function resolveFallbackTurf(lookup) {
  try {
    const data = responseData(await withPrototypeTimeout(turfsApi.list({ limit: 100 })));
    const turfs = (data.turfs || []).map(normalizeTurf);
    return turfs.find((turf) => matchesTurfLookup(turf, lookup)) || createDemoTurf();
  } catch {
    return createDemoTurf();
  }
}

export function useTurfs(params = {}) {
  return useQuery({
    queryKey: ["turfs", params],
    queryFn: async () => {
      try {
        const data = responseData(await withPrototypeTimeout(turfsApi.list(params)));
        const turfs = (data.turfs || []).map(normalizeTurf);
        return {
          pagination: data.pagination || { page: 1, pages: 1, total: turfs.length },
          turfs: turfs.length ? turfs : [demoForParams(params)],
        };
      } catch {
        const turf = demoForParams(params);
        return {
          pagination: { page: 1, pages: 1, total: 1 },
          turfs: [turf],
        };
      }
    },
  });
}

export function useTurf(id, params = {}) {
  return useQuery({
    queryKey: ["turfs", id, params],
    enabled: Boolean(id),
    retry: false,
    queryFn: async () => {
      const lookup = String(id || "").trim();
      if (!lookup) return createDemoTurf();

      try {
        const turf = responseData(await withPrototypeTimeout(turfsApi.detail(lookup, params))).turf;
        return turf ? normalizeTurf(turf) : resolveFallbackTurf(lookup);
      } catch {
        return resolveFallbackTurf(lookup);
      }
    },
  });
}

export function useTurfMetadata() {
  return useQuery({
    queryKey: ["turfs", "metadata"],
    queryFn: async () => {
      try {
        return responseData(await withPrototypeTimeout(turfsApi.metadata()));
      } catch {
        return {
          cities: ["Bangalore", "Mumbai", "Pune"],
          locations: ["Bangalore", "Mumbai", "Pune"],
          sports: ["Badminton", "Basketball", "Cricket", "Football", "Tennis", "Volleyball"],
        };
      }
    },
  });
}

export function useNearbyTurfs(userLocation, params = {}) {
  return useTurfs({
    ...params,
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
    radiusKm: params.radiusKm || 25,
  });
}

export function useMyTurfs() {
  return useQuery({
    queryKey: ["turfs", "mine"],
    queryFn: async () => (responseData(await turfsApi.mine()).turfs || []).map(normalizeTurf),
  });
}

export function useTurfAvailability(id, date) {
  return useQuery({
    queryKey: ["turfs", id, "availability", date],
    enabled: Boolean(id && date),
    retry: false,
    queryFn: async () => {
      try {
        return responseData(await withPrototypeTimeout(turfsApi.availability(id, date)));
      } catch {
        return {
          ...createDemoAvailability(date),
          isFallback: true,
        };
      }
    },
  });
}

export function useCreateTurf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => turfsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["turfs"] }),
  });
}

export function useUpdateTurf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => turfsApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
      queryClient.invalidateQueries({ queryKey: ["turfs", variables.id] });
    },
  });
}

export function useDeleteTurf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => turfsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["turfs"] }),
  });
}

export function useResubmitTurf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => turfsApi.resubmit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["turfs"] });
      queryClient.invalidateQueries({ queryKey: ["turfs", id] });
      queryClient.invalidateQueries({ queryKey: ["turfs", "mine"] });
    },
  });
}

export function useUpdateTurfSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => turfsApi.updateSlots(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["turfs", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["turfs", "mine"] });
    },
  });
}
