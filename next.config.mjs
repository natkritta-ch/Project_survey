import { execSync } from "child_process";

let commitHash = "dev";
let commitCount = "0";

try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
  commitCount = execSync("git rev-list --count HEAD").toString().trim();
} catch (e) {
  commitHash = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : "local";
  commitCount = "0";
}

const buildTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(new Date());

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: commitHash,
    NEXT_PUBLIC_BUILD_NUMBER: commitCount,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        encoding: false,
      };
    }
    return config;
  },
};

export default nextConfig;
