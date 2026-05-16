import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/finnhub": {
        target: "https://finnhub.io",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/finnhub/, "/api/v1"),
      },
      "/api/fred": {
        target: "https://api.stlouisfed.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fred/, "/fred"),
      },
    },
  },
});
