import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
        host: true,   // Required for GitHub Codespaces
            port: 5173,   // Preferred port (will auto-increment if busy)
              },
              });
