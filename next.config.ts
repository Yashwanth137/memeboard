import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://embed.reddit.com https://www.instagram.com https://www.youtube-nocookie.com https://www.youtube.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
