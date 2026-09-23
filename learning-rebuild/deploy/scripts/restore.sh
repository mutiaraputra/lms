#!/usr/bin/env bash
# Restore database dari file backup .sql.gz.
# Penggunaan: bash deploy/scripts/restore.sh backups/db-YYYYMMDD-HHMMSS.sql.gz
# PERINGATAN: menimpa isi database saat ini.
set -e
cd "$(dirname "$0")/../.."

FILE="$1"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Penggunaan: bash deploy/scripts/restore.sh <file-backup.sql.gz>"
  echo "Backup tersedia:"; ls -1 backups/db-*.sql.gz 2>/dev/null || echo "  (tidak ada)"
  exit 1
fi

set -a; [ -f .env.production ] && . ./.env.production; set +a
PGUSER="${POSTGRES_USER:-lms_user}"
PGDB="${POSTGRES_DB:-lms_rebuild}"

echo "PERINGATAN: ini akan MENIMPA database '$PGDB' dengan isi $FILE."
printf "Ketik 'RESTORE' untuk konfirmasi: "
read -r CONFIRM
[ "$CONFIRM" = "RESTORE" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Merestore database..."
gunzip -c "$FILE" | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U "$PGUSER" -d "$PGDB"

echo "Restore selesai. Disarankan restart API: docker compose -f docker-compose.prod.yml --env-file .env.production restart api"
