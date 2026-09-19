# Dokumen 3 — Arsitektur & Scaffolding Monorepo (LMS SMK Nagara Rebuild)

> Dokumen ini mendefinisikan struktur monorepo, konfigurasi Docker Compose, environment variable, alur komunikasi antar service, dan tahapan scaffolding proyek.

- **Status:** Finalisasi untuk Implementasi
- **Tanggal:** 19 September 2026

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
│   └── 03-arsitektur-dan-scaffolding.md
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
│               ├── run-etl.ts
│               └── verify.ts
└── apps/
    ├── api/           # Backend NestJS
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── app.module.ts
    │   │   ├── main.ts
    │   │   └── modules/
    │   │       ├── auth/
    │   │       ├── users/
    │   │       ├── master-data/
    │   │       ├── materials/
    │   │       ├── exams/
    │   │       ├── assignments/
    │   │       └── chat/
    └── web/           # Frontend Next.js 15
        ├── package.json
        ├── tsconfig.json
        ├── app/
        └── ...
```

---

## 2. Definisi Layanan Docker (`docker-compose.yml`)

Stack infrastruktur pendukung:
1. **PostgreSQL 16** (Port 5432) — Database utama.
2. **Redis 7** (Port 6379) — Session cache, exam timer, BullMQ.
3. **MinIO** (Port 9000 & 9001) — Object storage kompatibel S3 untuk berkas materi & tugas.

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
