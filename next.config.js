/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aquí pueden estar tus otras configuraciones...

  // AÑADE ESTE BLOQUE PARA SOLUCIONAR EL WARNING
  webpack: (config, { isServer }) => {
    // Esta configuración le dice a Webpack que no intente empaquetar
    // estas librerías, ya que solo se usan en el servidor.
    // Esto elimina los warnings de "Critical dependency".
    if (!isServer) {
        config.externals.push('sequelize');
        
        // Es buena idea excluir también el driver de tu base de datos.
        // Si usas PostgreSQL:
        config.externals.push('pg');
        config.externals.push('pg-hstore');
        
        config.resolve.fallback = {
          fs: false,
        };
        // Si usas MySQL:
        // config.externals.push('mysql2');
    }

    return config;
  },
};