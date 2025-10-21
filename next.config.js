// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/],
  customWorkerDir: 'worker',
});

module.exports = withPWA({
  reactStrictMode: true,
  serverExternalPackages: ['sequelize'],

});