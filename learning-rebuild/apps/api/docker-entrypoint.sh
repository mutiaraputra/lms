#!/bin/sh
# =============================================================================
# Entrypoint API: tunggu database siap, sinkron skema, lalu jalankan aplikasi.
# Aman dijalankan berulang (idempoten) — cocok utk auto-restart server sekolah.
# =============================================================================
set -e

echo "[entrypoint] Menunggu database siap..."
# Tunggu Postgres via prisma db push (retry beberapa kali).
# CATATAN KEAMANAN: TANPA --accept-data-loss. Bila perubahan skema bersifat
# destruktif, push akan gagal (bukan menghapus data diam-diam) dan API tidak
# dijalankan — administrator harus meninjau. Skema aplikasi ini bersifat aditif.
ATTEMPTS=0
MAX_ATTEMPTS=30
PUSH_OK=0
while [ "$ATTEMPTS" -lt "$MAX_ATTEMPTS" ]; do
  if node ../../node_modules/prisma/build/index.js db push \
        --schema=../../packages/database/prisma/schema.prisma \
        --skip-generate >/tmp/dbpush.log 2>&1; then
    PUSH_OK=1
    break
  fi
  # Jika DB terhubung tetapi push ditolak karena berpotensi data-loss, hentikan.
  if grep -qi "data loss\|would require\|destructive" /tmp/dbpush.log; then
    echo "[entrypoint] Sinkron skema DITOLAK: perubahan berpotensi menghapus data."
    echo "[entrypoint] Tinjau manual (buat migration) sebelum melanjutkan."
    cat /tmp/dbpush.log
    exit 1
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "[entrypoint] Database belum siap (percobaan $ATTEMPTS/$MAX_ATTEMPTS), menunggu 3 detik..."
  sleep 3
done

if [ "$PUSH_OK" -ne 1 ]; then
  echo "[entrypoint] GAGAL sinkron skema database setelah $MAX_ATTEMPTS percobaan."
  cat /tmp/dbpush.log
  exit 1
fi

echo "[entrypoint] Skema database tersinkron. Menjalankan API..."
exec "$@"
