import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "virtual:pwa-register": fileURLToPath(
        new URL("./src/test/pwaRegisterMock.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
      ],
      reporter: ["text", "html"],
      thresholds: {
        branches: 75,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
