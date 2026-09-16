import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // The service worker runs in a worker scope, not a browser window, so its
    // globals are different. Scoped to the one file rather than relaxing the
    // rule everywhere.
    files: ["**/public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        URL: "readonly",
        Promise: "readonly",
        clients: "readonly",
      },
    },
  },
);
