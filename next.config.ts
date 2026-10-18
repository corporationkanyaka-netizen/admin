import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imapflow / mailparser / pg are Node libraries — load them at runtime instead of bundling.
  serverExternalPackages: ["imapflow", "mailparser", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
