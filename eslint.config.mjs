import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "backend/**",
    "src/core/**",
    "src/components/search/**",
    "src/hooks/**",
    "src/layouts/**",
    "next-env.d.ts",
  ]),
]);
