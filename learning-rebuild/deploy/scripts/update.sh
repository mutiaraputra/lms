#!/usr/bin/env bash
# Update aplikasi: tarik kode terbaru (git), backup DB, rebuild & restart.
# Aman: backup otomatis sebelum menerapkan perubahan.
set -e
cd "$(dirname "$0")/../.."

echo "==> Backup database sebelum update..."
bash deploy/scripts/backup.sh

if [ -d .git ]; then
  echo "==> Menarik perubahan terbaru dari git..."
  git pull --ff-only || echo "(lewati git pull — periksa manual bila gagal)"
fi

echo "==> Rebuild & restart stack..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "==> Membersihkan image lama yang tidak terpakai..."
docker image prune -f

echo "==> Status:"
docker compose -f docker-compose.prod.yml --env-file .env.production ps
echo "Update selesai."
