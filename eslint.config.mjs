import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  // Ignore generated/bundled output (still linted if you pass explicit file paths)
  {
    ignores: [
      "src/generated/prisma/**",
      "src/generated/**",
      "**/*.min.js",
      "**/*.bundle.js",
      ".next/**",
      "node_modules/**",
    ],
  },

  // Baselines
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Project files
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // Next
      ...nextPlugin.configs["core-web-vitals"].rules,

      // Hooks / a11y
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/media-has-caption": "off",

      // Your existing policy
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
