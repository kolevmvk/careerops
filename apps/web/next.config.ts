import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The domain packages are TypeScript sources consumed directly from the
  // workspace, so Next compiles them rather than expecting built output.
  transpilePackages: ["@careerops/documents", "@careerops/intake"],
  typedRoutes: true,
};

export default config;
