import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Expose both VITE_* and NEXT_PUBLIC_* variables to the browser
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
});
