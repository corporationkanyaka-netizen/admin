import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imapflow / mailparser / pg are Node libraries — load them at runtime instead of bundling.
  serverExternalPackages: ["imapflow", "mailparser", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        // Only our own stylesheets — next/font's generated CSS must not go through Tailwind.
        condition: { all: [{ not: "foreign" }, { path: /^src\// }] },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
