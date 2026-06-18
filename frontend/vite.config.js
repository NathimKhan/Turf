import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("jspdf")) return "pdf-vendor";
          if (id.includes("qrcode")) return "qr-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          if (id.includes("framer-motion")) return "motion-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("@reduxjs") || id.includes("react-redux")) return "state-vendor";
          if (id.includes("@tanstack")) return "query-vendor";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
