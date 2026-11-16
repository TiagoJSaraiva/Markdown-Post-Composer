/*
 * Vitest configuration of the admin package: Node environment, tests in `__tests__`.
 * Only pure modules are tested, so no DOM environment is needed.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
});
