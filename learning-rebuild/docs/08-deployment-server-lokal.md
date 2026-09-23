# Dokumen 8 — Panduan Deployment di PC Server Lokal Sekolah (Docker)

> Panduan memasang **Platform Sekolah SMK Nagara** (LMS + Absensi) di **satu PC server lokal** di sekolah, menggunakan **Docker** di atas **Windows + WSL2**. Berkas unggahan disimpan di **disk lokal** (volume Docker), tanpa MinIO/S3.

- **Target:** Windows 10/11 (server sekolah) + WSL2 + Docker Desktop
- **Akses pengguna:** browser di LAN sekolah → `http://<ip-server>/`
- **Komponen:** Nginx (port 80) → Web (Next.js) + API (NestJS) → PostgreSQL
- **Status verifikasi:** build aplikasi (`tsc` API & `next build` web) hijau. Build image Docker perlu dijalankan di server (Docker tidak tersedia di lingkungan penyiapan ini).

---

## 1. Arsitektur Deployment

```
                 ┌───────────────────────── PC Server (Windows + WSL2) ─────────────────────────┐
   Browser LAN   │   Docker Desktop                                                              │
  (guru/siswa)   │   ┌────────────┐    ┌───────────┐   ┌────────────┐   ┌──────────────────┐     │
  http://IP/  ─────▶ │  nginx :80 │──▶ │ web :3000 │   │ api :4000  │──▶│ postgres :5432   │     │
                 │   │ (1 pintu)  │─┐  └───────────┘   └────────────┘   │ (volume data)    │     │
                 │   └────────────┘ └─▶ /api, /uploads → api            └──────────────────┘     │
                 │                                          └─ volume uploads (disk lokal)        │
                 └──────────────────────────────────────────────────────────────────────────────┘
```

- **Satu pintu masuk:** semua trafik lewat Nginx port 80. Frontend memanggil API via path relatif `/api` sehingga tidak perlu tahu IP server.
- **Data persisten:** database di volume `lms_postgres_data`, berkas unggahan di volume `lms_uploads_data`. Aman saat container di-rebuild.
- **Auto-start:** semua service `restart: always` → hidup lagi otomatis setelah PC/Docker restart.

---

## 2. Prasyarat (sekali pasang di server)

1. **Windows 10/11** dengan virtualisasi aktif di BIOS.
2. **WSL2** — buka PowerShell sebagai Administrator:
   ```powershell
   wsl --install
   ```
   Restart bila diminta. Pastikan versi 2: `wsl --set-default-version 2`.
3. **Docker Desktop** — unduh dari situs resmi Docker, saat instalasi centang **"Use WSL 2 based engine"**. Setelah pasang, buka **Settings → Resources → WSL Integration** dan aktifkan integrasi untuk distro WSL Anda.
4. **Setelan penting Docker Desktop** (agar server jalan tanpa login manual):
   - **Settings → General → Start Docker Desktop when you sign in to your computer** → aktif.
   - Set akun Windows server agar **auto-login** saat boot (Control Panel/netplwiz), supaya Docker ikut naik setelah listrik hidup.
5. **Git** (opsional, untuk `update.sh`).

---

## 3. Menyiapkan Berkas Aplikasi

1. Salin folder proyek `learning-rebuild/` ke server, mis. ke `C:\lms\learning-rebuild`
   (di WSL: `/mnt/c/lms/learning-rebuild`).
2. Buat file environment produksi dari contoh:
   ```bash
   cp .env.production.example .env.production
   ```
3. **Edit `.env.production`** dan ganti semua nilai bertanda `GANTI!`:
   - `POSTGRES_PASSWORD` — password database yang kuat.
   - `JWT_SECRET`, `QR_SECRET` — string acak. Buat dengan:
     ```bash
     openssl rand -hex 32
     ```
   - `APP_BASE_URL` — isi IP server di LAN, mis. `http://192.168.1.10`.
   - `HTTP_PORT` — biarkan `80` kecuali port itu sudah dipakai aplikasi lain.

> **Menemukan IP server:** di PowerShell jalankan `ipconfig` dan lihat *IPv4 Address* pada adapter LAN. Disarankan set **IP statis** di server agar alamat tidak berubah.

---

## 4. Menjalankan (Pertama Kali)

Dari **PowerShell** di folder proyek:
```powershell
.\deploy\scripts\lms.ps1 start
```
atau langsung dari **WSL** di folder proyek:
```bash
bash deploy/scripts/start.sh
```

Perintah ini membangun image (API & Web) lalu menjalankan seluruh stack. Build pertama memakan beberapa menit. Saat start, API otomatis **menyinkronkan skema** ke database (aman/non-destruktif).

Cek status:
```powershell
.\deploy\scripts\lms.ps1 status
```
Semua service harus `running`/`healthy`. Buka browser: `http://<ip-server>/`.

---

## 5. Memuat Data Awal (Migrasi ETL — sekali)

Data lama (LMS `learning.sql` + Absensi `absen.sql`) dimuat via skrip ETL. ETL berjalan dari **WSL** (butuh akses ke MySQL sumber). Langkah ringkas:

1. Pastikan database MySQL sumber dapat diakses dari WSL, dan isi variabel `MYSQL_*` / `ABSEN_MYSQL_*` di `.env` (bukan `.env.production`).
2. Arahkan `DATABASE_URL` ke Postgres container (mis. expose sementara, atau jalankan ETL di dalam jaringan compose).
3. Jalankan sesuai `docs/05` & `docs/06`:
   ```bash
   pnpm --filter @lms/database etl:dry-run   # simulasi + laporan
   pnpm --filter @lms/database etl:run       # muat data LMS
   pnpm --filter @lms/database etl:absen     # muat & rekonsiliasi absensi
   ```

> ETL tidak diperlukan untuk operasi harian — hanya saat migrasi awal / cutover. Detail lengkap di `docs/01`, `docs/05`, `docs/06`.

---

## 6. Operasi Harian

Semua lewat wrapper PowerShell (`deploy\scripts\lms.ps1`) atau skrip bash langsung:

| Aksi | PowerShell | Bash (WSL) |
|---|---|---|
| Nyalakan / build ulang | `.\deploy\scripts\lms.ps1 start` | `bash deploy/scripts/start.sh` |
| Hentikan (data aman) | `.\deploy\scripts\lms.ps1 stop` | `bash deploy/scripts/stop.sh` |
| Lihat status | `.\deploy\scripts\lms.ps1 status` | `docker compose -f docker-compose.prod.yml --env-file .env.production ps` |
| Lihat log langsung | `.\deploy\scripts\lms.ps1 logs` | `... logs -f` |
| Update aplikasi | `.\deploy\scripts\lms.ps1 update` | `bash deploy/scripts/update.sh` |
| Backup DB + berkas | `.\deploy\scripts\lms.ps1 backup` | `bash deploy/scripts/backup.sh` |
| Restore DB | `.\deploy\scripts\lms.ps1 restore backups/db-XXXX.sql.gz` | `bash deploy/scripts/restore.sh <file>` |

---

## 7. Backup & Restore

- **Backup** (`backup.sh`) menghasilkan di folder `backups/`:
  - `db-<timestamp>.sql.gz` — dump PostgreSQL.
  - `uploads-<timestamp>.tar.gz` — arsip berkas unggahan.
  - Menyimpan **14 backup terbaru** otomatis (retensi).
- **Salin folder `backups/` ke media lain** (flashdisk/NAS/cloud) secara berkala — backup di disk yang sama tidak melindungi dari kerusakan disk.

### Backup otomatis terjadwal (disarankan)
Gunakan **Task Scheduler** Windows:
1. Buka *Task Scheduler* → *Create Basic Task*.
2. Trigger: harian, mis. pukul 18:00 (di luar jam sekolah).
3. Action: *Start a program* →
   - Program: `powershell.exe`
   - Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\lms\learning-rebuild\deploy\scripts\lms.ps1" backup`
   - Start in: `C:\lms\learning-rebuild`

### Restore
```powershell
.\deploy\scripts\lms.ps1 restore backups/db-20260921-180000.sql.gz
```
Konfirmasi dengan mengetik `RESTORE`. Setelah selesai, restart API bila perlu.

---

## 8. Jaringan LAN & Firewall

- Agar PC/HP lain di sekolah bisa mengakses, izinkan **port 80** di **Windows Defender Firewall**:
  - *Windows Security → Firewall & network protection → Advanced settings → Inbound Rules → New Rule → Port → TCP 80 → Allow*.
- Bagikan alamat `http://<ip-server>/` ke pengguna. Pertimbangkan hostname lokal (mis. lewat router/DNS lokal `lms.sekolah.lokal`).
- **HTTPS (opsional):** untuk LAN internal umumnya HTTP cukup. Bila perlu HTTPS, tambahkan sertifikat (mis. self-signed / CA internal) pada Nginx dan buka port 443 — di luar cakupan panduan dasar ini.

---

## 9. Keamanan (Checklist Produksi)

- [ ] `JWT_SECRET`, `QR_SECRET`, `POSTGRES_PASSWORD` sudah diganti dari nilai contoh.
- [ ] `.env.production` **tidak** ikut ter-commit ke git (sudah di `.gitignore`).
- [ ] Port database (5432) **tidak** diekspos ke LAN (default compose: tidak dipublish).
- [ ] Backup terjadwal aktif + salinan disimpan di media terpisah.
- [ ] Akun Windows server memiliki password & auto-login hanya bila fisik server aman.
- [ ] Header keamanan dasar aktif via Nginx (sudah dikonfigurasi).

---

## 10. Troubleshooting

| Gejala | Kemungkinan sebab & solusi |
|---|---|
| `docker: command not found` di WSL | Docker Desktop belum aktif / WSL Integration belum dinyalakan. Buka Docker Desktop, aktifkan integrasi distro. |
| Web terbuka tapi login gagal semua | API belum sehat / DB belum termuat. Cek `lms.ps1 logs`, pastikan ETL awal sudah dijalankan. |
| `POSTGRES_PASSWORD wajib diisi` saat start | `.env.production` belum dibuat/diisi. Salin dari contoh & isi. |
| Perubahan skema ditolak saat start API | Entrypoint menolak perubahan berpotensi merusak data. Tinjau schema/migration manual sebelum lanjut. |
| Port 80 bentrok | Set `HTTP_PORT=8080` di `.env.production`, akses `http://<ip>:8080/`. |
| Halaman lambat saat ujian serentak | Naikkan resource Docker Desktop (Settings → Resources: CPU/RAM), pastikan server memadai. |
| Container tidak naik setelah PC reboot | Pastikan Docker Desktop *start on sign-in* aktif & Windows auto-login. |

---

## 11. Ringkasan Berkas Deployment

| Berkas | Fungsi |
|---|---|
| `docker-compose.prod.yml` | Definisi stack produksi (postgres, api, web, nginx) |
| `apps/api/Dockerfile` + `docker-entrypoint.sh` | Image API + sinkron skema saat start |
| `apps/web/Dockerfile` | Image Web (Next.js standalone) |
| `deploy/nginx/nginx.conf` | Reverse proxy satu pintu (port 80) |
| `.env.production.example` | Template environment produksi (salin → `.env.production`) |
| `deploy/scripts/*.sh` | Skrip operasi (start/stop/update/backup/restore) untuk WSL |
| `deploy/scripts/lms.ps1` | Wrapper PowerShell untuk menjalankan skrip dari Windows |

---

## 12. Catatan Penting

- **Storage berkas = disk lokal** (volume `lms_uploads_data`). Tidak memakai MinIO/S3.
- **Fase yang belum ada** (lihat `docs/01`): timer ujian real-time (WebSocket/Redis), upload materi ke object storage, chat real-time, dan sebagian besar UI web. Deployment ini menyiapkan **fondasi produksi**; modul yang sudah jadi (auth, master-data, materi, ujian objektif, essay, tugas, laporan, absensi) berjalan penuh di backend.
- **Redis belum disertakan** di compose produksi karena fitur yang membutuhkannya (timer ujian real-time) belum diimplementasikan. Tambahkan service `redis` saat fitur tersebut dikerjakan.
