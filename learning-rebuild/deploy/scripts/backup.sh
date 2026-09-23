#!/usr/bin/env bash
# Backup database (pg_dump) + arsip berkas unggahan ke folder ./backups.
# Simpan folder ./backups di drive/lokasi yang di-backup rutin.
set -e
cd "$(dirname "$0")/../.."

# Muat kredensial DB dari .env.production
set -a; [ -f .env.production ] && . ./.env.production; set +a
PGUSER="${POSTGRES_USER:-lms_user}"
PGDB="${POSTGRES_DB:-lms_rebuild}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="backups"
mkdir -p "$OUT_DIR"

DB_FILE="$OUT_DIR/db-$STAMP.sql.gz"
UP_FILE="$OUT_DIR/uploads-$STAMP.tar.gz"

echo "==> Dump database → $DB_FILE"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U "$PGUSER" -d "$PGDB" | gzip > "$DB_FILE"

echo "==> Arsip berkas unggahan → $UP_FILE"
# Salin isi volume uploads via container sementara.
docker run --rm -v lms_uploads_data:/data -v "$(pwd)/$OUT_DIR":/backup alpine \
  sh -c "tar czf /backup/uploads-$STAMP.tar.gz -C /data . " || echo "(volume uploads kosong / belum ada)"

# Retensi: simpan 14 backup terbaru per jenis.
echo "==> Menjaga 14 backup terbaru..."
ls -1t "$OUT_DIR"/db-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t "$OUT_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "Backup selesai: $DB_FILE"
