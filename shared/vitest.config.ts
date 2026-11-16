/*
 * Vitest configuration of the shared package (Node environment, __tests__).
 */
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"]
  }
})
