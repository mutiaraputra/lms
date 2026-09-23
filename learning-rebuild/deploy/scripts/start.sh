#!/usr/bin/env bash
# Menyalakan seluruh stack (build bila perlu) & menampilkan status.
# Jalankan dari root repo di dalam WSL.
set -e
cd "$(dirname "$0")/../.."

if [ ! -f .env.production ]; then
  echo "ERROR: .env.production tidak ditemukan. Salin dari .env.production.example lalu isi."
  exit 1
fi

echo "==> Membangun & menjalankan stack produksi..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "==> Status container:"
docker compose -f docker-compose.prod.yml --env-file .env.production ps
echo ""
echo "Selesai. Akses aplikasi di http://<ip-server>/ (atau http://localhost bila di server)."
