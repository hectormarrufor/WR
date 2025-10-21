const { InjectManifest } = require('workbox-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sequelize'],
  webpack(config, { isServer, dev }) {
    // Solo aplica en el cliente
    if (!isServer) {
      // Evita duplicados: busca si ya existe una instancia
      const alreadyInjected = config.plugins.some(
        plugin => plugin.constructor.name === 'InjectManifest'
      );

      if (!alreadyInjected) {
        config.plugins.push(
          new InjectManifest({
            swSrc: './public/sw.js',
            swDest: 'static/service-worker.js',
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          })
        );
      }
    }

    return config;
  },
};

module.exports = nextConfig;