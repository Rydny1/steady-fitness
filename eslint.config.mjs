import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import security from "eslint-plugin-security";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: [".next/**", "coverage/**", "design/**", "node_modules/**", "tests/e2e/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  security.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // Keys here come from typed constants, not user input.
      "security/detect-object-injection": "off",
    },
  },
];

export default eslintConfig;
