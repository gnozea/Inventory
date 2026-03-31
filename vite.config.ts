import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // 👈 REQUIRED in Codespaces
    port: 5173,
  },
});