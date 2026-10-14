import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Own tsconfig for tests so a broken root tsconfig cannot stop the unit run.
  tsconfig: "tests/unit/tsconfig.json",
  resolve: {
    alias: { "@": root },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "features/game/**/*.ts",
        "features/nutrition/targets.ts",
        "features/nutrition/adaptive-budget.ts",
        "features/nutrition/shopping-list.ts",
        "features/nutrition/config.ts",
        "features/body/**/*.ts",
        "features/insights/facts.ts",
        "features/insights/grounding.ts",
        "features/insights/config.ts",
        "features/training/**/*.ts",
      ],
      exclude: ["**/index.ts", "**/*.d.ts"],
      reporter: ["text", "text-summary"],
    },
  },
});
