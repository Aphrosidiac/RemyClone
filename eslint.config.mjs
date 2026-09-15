import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/**", "public/**"]),
  {
    rules: {
      // The gallery is imperative by design (refs driven from GSAP tickers and R3F frames), the
      // same shape as the reference. These React-Compiler rules flag that shape, not defects.
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/globals": "off",
      // Home links are intercepted by the iris; a plain <a> is intentional so the
      // capture-phase click handler sees a real anchor.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
