/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  buildExcludes: [/app-build-manifest\.json$/],
});

const nextConfig = {
  serverExternalPackages: ['sequelize'],
  // Puedes agregar más configuraciones aquí si lo necesitas
};

module.exports = withPWA(nextConfig);
