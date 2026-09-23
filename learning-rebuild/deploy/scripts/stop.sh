#!/usr/bin/env bash
# Menghentikan stack (data tetap aman di volume). Tambahkan argumen --wipe
# HANYA bila ingin menghapus volume DB & uploads (BERBAHAYA: hapus semua data).
set -e
cd "$(dirname "$0")/../.."

if [ "$1" = "--wipe" ]; then
  echo "PERINGATAN: ini akan MENGHAPUS volume database & uploads (semua data hilang)."
  printf "Ketik 'HAPUS' untuk konfirmasi: "
  read -r CONFIRM
  if [ "$CONFIRM" = "HAPUS" ]; then
    docker compose -f docker-compose.prod.yml --env-file .env.production down -v
    echo "Stack dihentikan & volume dihapus."
  else
    echo "Dibatalkan."
  fi
else
  docker compose -f docker-compose.prod.yml --env-file .env.production down
  echo "Stack dihentikan. Data tetap tersimpan di volume."
fi
