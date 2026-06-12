import { z } from "zod";

export const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().default("USD"),
});

export const turfSchema = z.object({
  _id: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  description: z.string().optional(),
  gallery: z.array(z.string()).default([]),
  location: z.object({
    address: z.string(),
    city: z.string(),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
  name: z.string().min(2),
  ownerId: z.string().optional(),
  pricing: z.object({
    baseHourly: moneySchema,
    peakHourly: moneySchema.optional(),
  }),
  schedule: z.object({
    blackoutDates: z.array(z.string()).default([]),
    slotMinutes: z.number().default(60),
    weeklyAvailability: z.record(z.array(z.string())).default({}),
  }),
  sport: z.string(),
  status: z.enum(["draft", "review", "published", "suspended"]).default("draft"),
});

export const bookingSchema = z.object({
  _id: z.string().optional(),
  athleteId: z.string(),
  date: z.string(),
  paymentStatus: z.enum(["hold", "paid", "refunded", "failed"]).default("hold"),
  slot: z.string(),
  status: z.enum(["pending", "confirmed", "checked_in", "completed", "cancelled"]).default("pending"),
  total: moneySchema,
  turfId: z.string(),
});

export const userSchema = z.object({
  _id: z.string().optional(),
  email: z.string().email(),
  membership: z.string().optional(),
  name: z.string().min(2),
  role: z.enum(["user", "owner", "admin"]).default("user"),
});

export const checkoutPayloadSchema = z.object({
  bookingId: z.string().optional(),
  cardLast4: z.string().length(4).optional(),
  email: z.string().email(),
  name: z.string().min(2),
  savePaymentMethod: z.boolean().default(true),
});
