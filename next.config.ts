import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js", "cheerio", "node-cron"],
};

export default nextConfig;