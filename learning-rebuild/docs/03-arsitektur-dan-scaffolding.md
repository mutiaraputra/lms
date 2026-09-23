# Dokumen 3 — Arsitektur & Scaffolding Monorepo (LMS SMK Nagara Rebuild)

> Dokumen ini mendefinisikan struktur monorepo, konfigurasi Docker Compose, environment variable, alur komunikasi antar service, dan tahapan scaffolding proyek.

- **Status:** Finalisasi untuk Implementasi
- **Tanggal:** 23 September 2026 (struktur diselaraskan dengan kode: UI konten web Fase 3, 4, 5, 6, 7, A3, A4, A5 & pemindai kamera QR sudah terimplementasikan)

---

## 1. Struktur Monorepo (pnpm Workspaces)

```
learning-rebuild/
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docs/
│   ├── 01-rencana-migrasi.md
│   ├── 02-pemetaan-skema-database.md
│   ├── 03-arsitektur-dan-scaffolding.md
│   ├── 04-laporan-kualitas-data.md
│   ├── 05-panduan-operasional-dan-cutover.md
│   ├── 06-penggabungan-absen-ke-platform.md
│   ├── 07-laporan-rekonsiliasi-absen.md
│   └── 08-deployment-server-lokal.md
├── packages/
│   └── database/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   └── schema.prisma
│       └── src/
│           ├── index.ts
│           └── etl/
│               ├── db-source.ts
│               ├── run-etl.ts            # ETL LMS
│               ├── run-etl-absen.ts      # ETL rekonsiliasi absensi (Fase A1)
│               └── verify.ts
└── apps/
    ├── api/           # Backend NestJS
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── Dockerfile            # image API (kontainer non-root)
    │   ├── docker-entrypoint.sh  # sinkron skema DB saat start
    │   ├── src/
    │   │   ├── app.module.ts     # + ThrottlerModule (rate limit global)
    │   │   ├── main.ts           # + ValidationPipe global, CORS default tertutup
    │   │   ├── config/
    │   │   │   └── secrets.ts    # baca JWT_SECRET/QR_SECRET fail-fast
    │   │   └── modules/
    │   │       ├── auth/         # + dto/ (LoginDto dll), throttle login
    │   │       ├── users/
    │   │       ├── master-data/
    │   │       ├── teaching-assignments/
    │   │       ├── materials/
    │   │       ├── exams/
    │   │       ├── essay-exams/
    │   │       ├── assignments/
    │   │       ├── reports/
    │   │       ├── attendance/
    │   │       ├── leave-requests/
    │   │       ├── attendance-reports/
    │   │       ├── notifications/  # service internal (tanpa controller)
    │   │       └── health/         # liveness/readiness (dikecualikan throttle)
    └── web/           # Frontend Next.js 15
        ├── package.json                 # + html5-qrcode
        ├── tsconfig.json
        ├── Dockerfile                   # image Web (standalone, non-root)
        └── src/
            ├── app/
            │   ├── layout.tsx           # membungkus AuthProvider
            │   ├── page.tsx             # login
            │   ├── error.tsx / not-found.tsx / loading.tsx
            │   └── (dashboard)/         # route group terproteksi
            │       ├── layout.tsx       # RequireAuth + AppShell
            │       ├── dashboard/page.tsx        # ringkasan per peran
            │       ├── materials/{page,[id]/page}.tsx
            │       ├── exams/{page,[id]/page}.tsx
            │       ├── essay-exams/{page,[id]/page}.tsx
            │       ├── assignments/{page,[id]/page}.tsx
            │       ├── reports/page.tsx
            │       ├── attendance-reports/page.tsx
            │       ├── attendance/page.tsx
            │       ├── leave/page.tsx
            │       ├── master/page.tsx
            │       └── users/page.tsx
            ├── components/              # AppShell, RequireAuth, QrScanner
            │   └── ui/                  # Card(+Header/Body/PageHeader/EmptyState), Badge, Button, Spinner/PageLoader, Modal, DataTable
            └── lib/                     # api.ts, api-files.ts, auth.tsx, nav.ts, format.ts
```

> **Catatan:** `chat/` (Socket.IO), `teaching-kits/`, dan pengelolaan konfigurasi absensi (`AttendanceWindow`/`Holiday`/`TeacherSchedule`) **belum** dibuat sebagai modul API — lihat status di `docs/01`. Tabel absensi tersebut sudah ada di `schema.prisma` dan terisi via ETL, tetapi belum punya controller/endpoint maupun UI.
>
> **Catatan (kesesuaian kode ↔ dokumen, 23 September 2026):** struktur di atas sudah dicocokkan dengan isi repo. Yang **belum** ada dan tidak digambarkan di poin mana pun: konfigurasi **CI/CD** (`.github/workflows/`), **ESLint/Prettier** dan script `lint` per-paket, serta **test otomatis** (baru ada `apps/api/test-e2e.ts` sebagai skrip manual, bukan test runner).

---

## 2. Definisi Layanan Docker (`docker-compose.yml`)

Stack infrastruktur pendukung untuk **pengembangan** (`docker-compose.yml`):
1. **PostgreSQL 16** (Port 5432) — Database utama.
2. **Redis 7** (Port 6379) — disiapkan untuk session cache, exam timer, BullMQ (fitur pemakainya belum diimplementasikan).
3. **MinIO** (Port 9000 & 9001) — disiapkan untuk object storage S3-compatible (integrasi upload belum diimplementasikan).

> **Produksi berbeda:** `docker-compose.prod.yml` (deployment server lokal sekolah) menjalankan **postgres + api + web + nginx** saja — **tanpa Redis/MinIO** — karena fitur yang membutuhkannya belum ada dan berkas unggahan disimpan di volume disk lokal. Lihat `docs/08`. Redis/MinIO ditambahkan ke prod saat fitur terkait (timer ujian real-time, upload object storage) dikerjakan.

---

## 3. Strategi Transisi Autentikasi (Zero-Reset Password)

Setiap user yang dimigrasi dari `tb_admin`, `tb_guru`, atau `tb_siswa` memiliki hash SHA1 bawaan di kolom `legacy_password_sha1`:
1. Pengguna memasukkan `identifier` (NIS / NIK / Email / Username) dan `password`.
2. Sistem mencari user di tabel `users`.
3. Jika `password_hash` belum diset (masih null):
   - Sistem memverifikasi: `sha1(password) === user.legacyPasswordSha1`.
   - Jika valid:
     - Generate hash bcrypt/argon2 dari input password.
     - Simpan ke `users.password_hash`.
     - Set `users.legacy_password_sha1 = NULL`.
     - Generate JWT token (access token + refresh token) dan login berhasil.
4. Jika `password_hash` sudah ada, verifikasi langsung menggunakan algoritma baru (Argon2id/bcrypt).
