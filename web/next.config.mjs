/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  webpack: (config, { webpack }) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      encoding: false,
      "pino-pretty": false,
      fs: false,
      net: false,
      tls: false,
    };
    // pino's optional `pino-pretty` import and metamask's `encoding` import are
    // best-effort; IgnorePlugin makes webpack quietly skip them in both
    // server and client bundles instead of bombing at collect-page-data time.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(pino-pretty|lokijs|encoding)$/,
      })
    );
    return config;
  },
};
export default nextConfig;
