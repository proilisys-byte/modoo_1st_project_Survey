import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // 윈도우 exFAT 파일 시스템 및 Node.js 버그로 인한 readlink EISDIR 오류 우회 설정
    if (config.resolve) {
      config.resolve.symlinks = false;
    }
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
