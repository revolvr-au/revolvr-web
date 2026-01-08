import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // Only lint src/
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
  },

  // Baselines
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next rules
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules
    }
  },

  // IMPORTANT: force overrides LAST so nothing can flip them back
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
];
