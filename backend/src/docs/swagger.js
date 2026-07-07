const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "TURFX Backend API",
    version: "1.0.0",
    description: "Complete MERN backend API for turf booking, payments, dashboards, and tournaments.",
  },
  servers: [
    {
      url: process.env.API_BASE_URL ? `${process.env.API_BASE_URL.replace(/\/$/, "")}/api` : "http://localhost:5000/api",
      description: "Configured API server",
    },
  ],
  tags: [
    { name: "Auth" },
    { name: "Users" },
    { name: "Turfs" },
    { name: "Bookings" },
    { name: "Payments" },
    { name: "Tournaments" },
    { name: "Notifications" },
    { name: "Favorites" },
    { name: "Owner" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          businessName: { type: "string" },
          address: { type: "string" },
          role: { type: "string", enum: ["user", "owner", "admin"] },
          accountStatus: { type: "string", enum: ["active", "pending", "rejected", "suspended"] },
          profileImage: { type: "string" },
          walletBalance: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Turf: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          location: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          sportsSupported: {
            type: "array",
            items: { type: "string", enum: ["Football", "Cricket", "Volleyball", "Basketball", "Badminton", "Tennis"] },
          },
          pricePerHour: { type: "number" },
          images: { type: "array", items: { type: "string" } },
          heroImage: { type: "string" },
          coverImage: { type: "string" },
          profileImage: { type: "string" },
          thumbnail: { type: "string" },
          videoThumbnail: { type: "string" },
          gallery: { type: "array", items: { type: "string" } },
          groundImages: { type: "array", items: { type: "string" } },
          amenityImages: { type: "array", items: { type: "string" } },
          locationImages: { type: "array", items: { type: "string" } },
          sportsImages: { type: "array", items: { type: "string" } },
          createdImages: { type: "array", items: { type: "string" } },
          updatedImages: { type: "array", items: { type: "string" } },
          amenities: {
            type: "array",
            items: { type: "string", enum: ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"] },
          },
          ownerId: { type: "string" },
          isApproved: { type: "boolean" },
          moderationStatus: { type: "string", enum: ["pending", "approved", "rejected", "suspended"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Booking: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
          turfId: { type: "string" },
          bookingDate: { type: "string", format: "date" },
          slotStartTime: { type: "string", example: "18:00" },
          slotEndTime: { type: "string", example: "19:00" },
          hoursBooked: { type: "number" },
          totalAmount: { type: "number" },
          paymentStatus: { type: "string", enum: ["pending", "paid", "failed", "refunded", "partially_refunded"] },
          bookingStatus: { type: "string", enum: ["pending", "confirmed", "upcoming", "ongoing", "checked_in", "completed", "cancelled"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Payment: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
          bookingId: { type: "string" },
          amount: { type: "number" },
          paymentMethod: { type: "string", enum: ["UPI", "Card", "Cash"] },
          paymentStatus: { type: "string", enum: ["pending", "paid", "failed", "refunded", "partially_refunded"] },
          transactionId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Tournament: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          sport: { type: "string" },
          prizePool: { type: "number" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          participants: { type: "array", items: { type: "string" } },
          createdBy: { type: "string" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
          title: { type: "string" },
          message: { type: "string" },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register as a user or owner",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  confirmPassword: { type: "string", minLength: 8 },
                  phone: { type: "string" },
                  businessName: { type: "string" },
                  address: { type: "string" },
                  role: { type: "string", enum: ["user", "owner"] },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Registered" }, 409: { description: "Email exists" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Logged in" }, 401: { description: "Invalid credentials" } },
      },
    },
    "/auth/register-owner": {
      post: {
        tags: ["Auth"],
        summary: "Submit a pending turf owner application",
        responses: { 201: { description: "Owner application submitted" } },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Clear auth cookie",
        responses: { 200: { description: "Logged out" } },
      },
    },
    "/auth/profile": {
      get: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "Get current user profile",
        responses: { 200: { description: "Profile fetched" } },
      },
      put: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "Update current user profile",
        responses: { 200: { description: "Profile updated" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "Alias for current profile",
        responses: { 200: { description: "Profile fetched" } },
      },
    },
    "/auth/change-password": {
      put: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "Change password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Password changed" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Send reset password email",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string" } } } } },
        },
        responses: { 200: { description: "Reset email sent if account exists" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resetToken", "password"],
                properties: {
                  resetToken: { type: "string" },
                  password: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Password reset" } },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        summary: "Admin list users",
        parameters: [
          { name: "role", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Users fetched" } },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        summary: "Admin get user",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User fetched" } },
      },
      put: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        summary: "Admin update user",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User updated" } },
      },
      delete: {
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        summary: "Admin delete user",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User deleted" } },
      },
    },
    "/turfs": {
      get: {
        tags: ["Turfs"],
        summary: "List turfs with search filters",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "city", in: "query", schema: { type: "string" } },
          { name: "sport", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
        ],
        responses: { 200: { description: "Turfs fetched" } },
      },
      post: {
        tags: ["Turfs"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin create turf",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                allOf: [{ $ref: "#/components/schemas/Turf" }],
              },
            },
          },
        },
        responses: { 201: { description: "Turf created" } },
      },
    },
    "/turfs/search": {
      get: {
        tags: ["Turfs"],
        summary: "Search turfs by query, city, sport, or price",
        responses: { 200: { description: "Turfs fetched" } },
      },
    },
    "/turfs/city/{city}": {
      get: {
        tags: ["Turfs"],
        summary: "List turfs by city",
        parameters: [{ name: "city", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Turfs fetched" } },
      },
    },
    "/turfs/generated-media/{token}.svg": {
      get: {
        tags: ["Turfs"],
        summary: "Render generated venue media SVG",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "SVG image" } },
      },
    },
    "/turfs/{id}": {
      get: {
        tags: ["Turfs"],
        summary: "Get turf details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Turf fetched" } },
      },
      put: {
        tags: ["Turfs"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin update turf",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Turf updated" } },
      },
      delete: {
        tags: ["Turfs"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin delete turf",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Turf deleted" } },
      },
    },
    "/turfs/{id}/slots": {
      put: {
        tags: ["Turfs"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin update dynamic turf schedule rules",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  slotMinutes: { type: "number", enum: [30, 60, 90, 120] },
                  bufferMinutes: { type: "number", enum: [0, 15, 30] },
                  weeklyAvailability: { type: "object" },
                  blackoutDates: { type: "array", items: { type: "string", format: "date" } },
                  blackouts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", format: "date" },
                        reason: { type: "string", example: "Maintenance" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Slots updated" } },
      },
    },
    "/bookings": {
      get: {
        tags: ["Bookings"],
        security: [{ bearerAuth: [] }],
        summary: "Current user's bookings, owner turf bookings, or all admin bookings",
        responses: { 200: { description: "Bookings fetched" } },
      },
      post: {
        tags: ["Bookings"],
        security: [{ bearerAuth: [] }],
        summary: "Create booking after slot availability check",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["turfId", "bookingDate", "slotStartTime", "slotEndTime"],
                properties: {
                  turfId: { type: "string" },
                  bookingDate: { type: "string", format: "date" },
                  slotStartTime: { type: "string", example: "18:00" },
                  slotEndTime: { type: "string", example: "19:00" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Booking created" }, 409: { description: "Slot already booked" } },
      },
    },
    "/bookings/my-bookings": {
      get: {
        tags: ["Bookings"],
        security: [{ bearerAuth: [] }],
        summary: "Alias for current user's bookings",
        responses: { 200: { description: "Bookings fetched" } },
      },
    },
    "/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        security: [{ bearerAuth: [] }],
        summary: "Get booking details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Booking fetched" } },
      },
    },
    "/bookings/cancel/{id}": {
      put: {
        tags: ["Bookings"],
        security: [{ bearerAuth: [] }],
        summary: "Cancel booking",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Booking cancelled" } },
      },
    },
    "/payments/create": {
      post: {
        tags: ["Payments"],
        security: [{ bearerAuth: [] }],
        summary: "Process payment through the configured provider",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bookingId"],
                properties: {
                  bookingId: { type: "string" },
                  paymentMethod: { type: "string", enum: ["UPI", "Card", "Cash"] },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Payment successful" } },
      },
    },
    "/payments/checkout": {
      post: {
        tags: ["Payments"],
        security: [{ bearerAuth: [] }],
        summary: "Checkout through the configured payment provider",
        responses: { 201: { description: "Payment successful" } },
      },
    },
    "/payments/history": {
      get: {
        tags: ["Payments"],
        security: [{ bearerAuth: [] }],
        summary: "Payment history",
        responses: { 200: { description: "Payment history fetched" } },
      },
    },
    "/tournaments": {
      get: {
        tags: ["Tournaments"],
        summary: "List tournaments",
        responses: { 200: { description: "Tournaments fetched" } },
      },
      post: {
        tags: ["Tournaments"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin create tournament",
        responses: { 201: { description: "Tournament created" } },
      },
    },
    "/tournaments/{id}": {
      get: {
        tags: ["Tournaments"],
        summary: "Get tournament",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Tournament fetched" } },
      },
      put: {
        tags: ["Tournaments"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin update tournament",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Tournament updated" } },
      },
      delete: {
        tags: ["Tournaments"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin delete tournament",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Tournament deleted" } },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        summary: "Get current user's notifications",
        responses: { 200: { description: "Notifications fetched" } },
      },
      post: {
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        summary: "Admin create notification",
        responses: { 201: { description: "Notification created" } },
      },
    },
    "/notifications/{id}/read": {
      put: {
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        summary: "Mark notification as read",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Notification marked read" } },
      },
    },
    "/notifications/{id}": {
      delete: {
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        summary: "Delete notification",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Notification deleted" } },
      },
    },
    "/owner/dashboard": {
      get: {
        tags: ["Owner"],
        security: [{ bearerAuth: [] }],
        summary: "Owner dashboard totals and earnings",
        responses: { 200: { description: "Owner dashboard fetched" } },
      },
    },
    "/favorites": {
      get: {
        tags: ["Favorites"],
        security: [{ bearerAuth: [] }],
        summary: "List current user's favorite venues",
        responses: { 200: { description: "Favorites fetched" } },
      },
    },
    "/favorites/{turfId}": {
      post: {
        tags: ["Favorites"],
        security: [{ bearerAuth: [] }],
        summary: "Save a venue as favorite",
        parameters: [{ name: "turfId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Favorite saved" } },
      },
      delete: {
        tags: ["Favorites"],
        security: [{ bearerAuth: [] }],
        summary: "Remove a favorite venue",
        parameters: [{ name: "turfId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Favorite removed" } },
      },
    },
    "/turfs/meta": {
      get: {
        tags: ["Turfs"],
        summary: "Dynamic search locations, sports, and amenities",
        responses: { 200: { description: "Search metadata fetched" } },
      },
    },
    "/turfs/mine": {
      get: {
        tags: ["Turfs"],
        security: [{ bearerAuth: [] }],
        summary: "List venues owned by the current turf owner",
        responses: { 200: { description: "Owner turfs fetched" } },
      },
    },
    "/turfs/{id}/availability": {
      get: {
        tags: ["Turfs"],
        summary: "Get dynamic availability timeline and optionally validate a custom time",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "startTime", in: "query", required: false, schema: { type: "string", example: "18:15" } },
          { name: "endTime", in: "query", required: false, schema: { type: "string", example: "19:15" } },
        ],
        responses: { 200: { description: "Availability fetched" } },
      },
    },
    "/bookings/{id}/status": {
      patch: {
        tags: ["Bookings"],
        security: [{ bearerAuth: [] }],
        summary: "Owner/admin confirm, cancel, or complete a booking",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Booking status updated" } },
      },
    },
    "/admin/owners": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "List turf owner applications",
        responses: { 200: { description: "Turf owners fetched" } },
      },
    },
    "/admin/owners/{id}/status": {
      patch: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Approve, reject, suspend, or reopen an owner application",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Owner status updated" } },
      },
    },
    "/admin/turfs/{id}/status": {
      patch: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Moderate venue publication status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Venue status updated" } },
      },
    },
    "/admin/venue-schedules": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "List venue schedule rules for platform oversight",
        responses: { 200: { description: "Venue schedules fetched" } },
      },
    },
    "/admin/conflict-logs": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "List recent booking and availability conflict logs",
        responses: { 200: { description: "Conflict logs fetched" } },
      },
    },
    "/admin/dashboard": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Admin dashboard totals and recent activity",
        responses: { 200: { description: "Admin dashboard fetched" } },
      },
    },
  },
};

module.exports = swaggerSpec;
