// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/app-build-manifest\.json$/],
  swSrc: 'sw.js'


});

module.exports = withPWA({
  reactStrictMode: true,
  serverExternalPackages: ['sequelize'],

});