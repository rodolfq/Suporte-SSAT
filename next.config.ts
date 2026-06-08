import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.bitrix24.com.br',
        port: '',
        pathname: '/**',
      },
    ],
  },

  allowedDevOrigins: [
    'ais-dev-hutdfgxn2mm5yumwseuusb-476037736611.us-east1.run.app',
    'ais-pre-hutdfgxn2mm5yumwseuusb-476037736611.us-east1.run.app',
  ],

  output: 'standalone',
};

export default nextConfig;

// v1