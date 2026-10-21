import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En développement, /api est redirigé vers Django : pas de problème de CORS.
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
