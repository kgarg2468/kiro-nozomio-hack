import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.VERCEL ? {} : { turbopack: { root: workspaceRoot } })
};

export default nextConfig;
