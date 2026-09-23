// ==========================================
// Configuración de Next.js.
// ==========================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Next/Image bloquea por defecto cualquier imagen externa por seguridad:
    // hay que declarar explícitamente los dominios remotos permitidos.
    // Se habilita Cloudinary porque ahí se alojarán las imágenes del catálogo
    // (subidas desde el backend, ver CLOUDINARY_* en el .env del backend).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

module.exports = nextConfig;
