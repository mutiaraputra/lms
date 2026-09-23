/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output "standalone" menghasilkan server Node minimal (.next/standalone)
  // sehingga image Docker jauh lebih ramping untuk deployment server lokal.
  output: 'standalone',
  // Server lokal: tidak perlu optimasi gambar via layanan eksternal.
  images: { unoptimized: true },
  // Jangan bocorkan header framework.
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

module.exports = nextConfig;
