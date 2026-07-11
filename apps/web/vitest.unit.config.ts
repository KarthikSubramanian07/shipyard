import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    name: "unit",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./test/setup-unit.ts"],
    include: ["test/unit/**/*.test.{ts,tsx}", "src/**/*.unit.test.{ts,tsx}"],
  },
});
