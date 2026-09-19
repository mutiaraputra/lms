# Dokumen 5 — Panduan Operasional, Menjalankan Proyek & Cutover

> Dokumen panduan teknis untuk menjalankan monorepo LMS Rebuild, mengulang ETL data, menjalankan API dan Frontend Web, serta prosedur cutover.

- **Stack:** Next.js 15 + NestJS + Prisma + PostgreSQL 16 + Redis 7
- **Root Direktori:** `/home/ubuntu/lms/learning-rebuild`

---

## 1. Menjalankan Layanan Infrastruktur

### Pilihan A: Layanan Lokal Native (Saat ini aktif)
- **PostgreSQL 16:** Berjalan pada port `5432` (`lms_user:lms_password@localhost:5432/lms_rebuild`)
- **Redis 7:** Berjalan pada port `6379`

### Pilihan B: Menggunakan Docker Compose
```bash
cd /home/ubuntu/lms/learning-rebuild
docker compose up -d
```

---

## 2. Perintah Monorepo (pnpm)

Dari direktori `/home/ubuntu/lms/learning-rebuild`:

| Perintah | Deskripsi |
|---|---|
| `pnpm build` | Melakukan compile seluruh package (`@lms/database`, `@lms/api`, `@lms/web`) |
| `pnpm db:generate` | Menghasilkan Prisma Client terbaru |
| `pnpm db:push` | Sinkronisasi skema `schema.prisma` ke database PostgreSQL |
| `pnpm etl:dry-run` | Simulasi ekstraksi & transformasi data lama tanpa menulis ke database |
| `pnpm etl:run` | Menjalankan migrasi penuh data dari MySQL `learning` ke PostgreSQL `lms_rebuild` |
| `pnpm etl:verify` | Menjalankan verifikasi komparasi row-count & integritas relasi |

---

## 3. Menjalankan Aplikasi

### Menjalankan Backend API (NestJS)
```bash
cd /home/ubuntu/lms/learning-rebuild/apps/api
pnpm dev
# API akan aktif di http://localhost:4000/api
```

### Menjalankan Frontend Web (Next.js 15)
```bash
cd /home/ubuntu/lms/learning-rebuild/apps/web
pnpm dev
# Frontend akan aktif di http://localhost:3000
```

---

## 4. Pengujian Otomatis (E2E Integration Test)

Untuk menguji alur login 3 role, auto-rehash legacy password SHA1 -> bcrypt, akses profil JWT, dan query master data:
```bash
cd /home/ubuntu/lms/learning-rebuild/apps/api
npx tsx test-e2e.ts
```

---

## 5. Kredensial Uji Coba

- **Admin:** `adm` / `adm2024` (atau `admin` / `adm2024`)
- **Guru:** `anik@smknagara.id` / `1834003` (Password bawaan sistem lama adalah NIK guru)
- **Siswa:** `256566` / `adm2024` (atau NIS siswa)
