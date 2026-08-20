const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zk-kyc/shared-types', '@zk-kyc/zk-core'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@x402/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      }),
    );
    return config;
  },
};

module.exports = nextConfig;
