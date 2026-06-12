/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAF8FF",
        dark: "#0F172A",
        primary: {
          DEFAULT: "#2563EB",
          deep: "#004AC6",
          soft: "#DBEAFE",
          ink: "#00174B",
        },
        secondary: {
          DEFAULT: "#06B6D4",
          deep: "#00687A",
          soft: "#CFFAFE",
        },
        accent: {
          DEFAULT: "#22C55E",
          deep: "#006229",
          soft: "#DCFCE7",
        },
        warning: {
          DEFAULT: "#F59E0B",
          soft: "#FEF3C7",
        },
        danger: {
          DEFAULT: "#EF4444",
          soft: "#FEE2E2",
        },
        surface: {
          DEFAULT: "#FAF8FF",
          card: "#FFFFFF",
          low: "#F3F3FE",
          mid: "#EDEDF9",
          high: "#E7E7F3",
          highest: "#E1E2ED",
          border: "#E2E8F0",
          outline: "#C3C6D7",
        },
        ink: {
          DEFAULT: "#191B23",
          muted: "#434655",
          soft: "#64748B",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 16px 40px rgba(15, 23, 42, 0.08)",
        lift: "0 20px 55px rgba(37, 99, 235, 0.16)",
        soft: "0 8px 24px rgba(15, 23, 42, 0.06)",
      },
      maxWidth: {
        "container-max": "1280px",
      },
      borderRadius: {
        xl: "0.5rem",
        "2xl": "0.75rem",
        "3xl": "1rem",
      },
      backgroundImage: {
        "radial-field":
          "radial-gradient(circle at 20% 15%, rgba(34,197,94,0.16), transparent 30%), radial-gradient(circle at 85% 20%, rgba(6,182,212,0.18), transparent 28%), linear-gradient(135deg, #FAF8FF 0%, #EFF6FF 52%, #F8FAFC 100%)",
      },
    },
  },
  plugins: [],
};
