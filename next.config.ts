import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/base-path";

const config: NextConfig = {
  basePath: BASE_PATH || undefined,
  turbopack: { root: process.cwd() },
  // Ship the OpenF1 snapshots (data/ is gitignored, src/assets/openf1 is committed) with the
  // server functions when deployed. They're read with fs, so tracing can't find them.
  outputFileTracingIncludes: { "/api/**": ["./data/**", "./src/assets/openf1/**"] },
  async redirects() {
    // With a base path, the deployment's own domain still opens the demo at its root.
    return BASE_PATH ? [{ source: "/", destination: BASE_PATH, basePath: false, permanent: false }] : [];
  },
};

export default config;
