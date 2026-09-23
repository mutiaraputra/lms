# Rencana Migrasi — Rebuild LMS SMK Nagara

> Dokumen ini adalah **rencana migrasi** dari aplikasi LMS PHP lama (folder `learning/`) menuju arsitektur modern **API-first** (Next.js + NestJS + Prisma + PostgreSQL). Dokumen berfokus pada *urutan pekerjaan, strategi migrasi data, risiko, dan cutover* — bukan implementasi kode.

- **Versi dokumen:** 1.5
- **Tanggal:** 23 September 2026 (status implementasi diperbarui — UI konten web Fase 3, 4, 5, 6, 7, A3, A4, A5 & pemindai kamera QR sudah terimplementasikan; **audit kesesuaian dokumen ↔ kode** mengoreksi: klaim CI/CD & lint/format, "analisis per soal", jumlah model Prisma, format laporan ETL, serta halaman jam absen/hari libur)
- **Status:** Disetujui — dalam pelaksanaan
- **Sumber analisa:** `learning/` (±539 file PHP, ±132.000 baris) dan dump `learning.sql` (25 tabel)

---

## 0. Status Implementasi (Ringkasan)

> Legenda fase: ✅ Selesai · 🟡 Sebagian · ❌ Belum dikerjakan
> Legenda item (bagian 6): `[x]` sudah diimplementasikan · `[ ]` belum
>
> _Diverifikasi 23 September 2026 terhadap kode_: modul NestJS aktif di `apps/api/src/app.module.ts` = auth, users, master-data, teaching-assignments, essay-exams, assignments, reports, materials, exams, attendance, leave-requests, attendance-reports, notifications, health. Belum ada modul `teaching-kits`, `chat`, maupun **pengelolaan konfigurasi absensi** (`AttendanceWindow`/`Holiday`/`TeacherSchedule` hanya ada di schema + ETL, tanpa controller). Tidak ada `WebSocketGateway`/Socket.IO; upload berkas memakai `diskStorage` lokal (belum MinIO/S3); belum ada CI maupun konfigurasi ESLint/Prettier. **Hardening backend (Fase 9)** sebagian sudah masuk: `ValidationPipe` global + DTO auth, `@nestjs/throttler`, CORS default tertutup, kontainer API non-root, secret fail-fast. **Web (`apps/web`)** sudah memiliki halaman UI fungsional untuk seluruh modul API aktif — lihat status per-fase pada tabel di bawah dan sub-bagian "Frontend Web" di catatan bawah tabel. Build `next build` dilaporkan lolos 15 route (dijalankan oleh pengembang; **belum diverifikasi ulang** di lingkungan penyusunan ini karena `pnpm` gagal menyentuh `node_modules/.pnpm` milik root). **Konten halaman yang terpasang:** login, dashboard, materials (list+detail), exams (list+take+hasil), essay-exams (list+detail+pembukaan kelas), assignments (list+detail+form kumpul+penilaian+pembukaan kelas), reports (ujian/tugas PDF), attendance-reports (bulanan PDF), master (9 tab CRUD), users (filter+aktif/non-aktif), attendance (QR+riwayat+kamera+scan+daftar harian), leave (ajuan+riwayat+approval). **Belum ada halaman web untuk:** chat real-time (Fase 8) dan pengelolaan jam absen/hari libur (API-nya juga belum ada)._

| Fase | Status | Catatan singkat |
|---|---|---|
| 0 — Fondasi | 🟡 Sebagian | Monorepo pnpm, Docker Compose (PostgreSQL + Redis + MinIO), env terpisah ✅. **Belum:** CI/CD dan linting/format otomatis (tidak ada ESLint/Prettier maupun script `lint`), arsip berkas `vendor/` belum dibuat |
| 1 — Skema DB + ETL | ✅ Selesai | Prisma schema ternormalisasi (34 model: 28 inti LMS/auth + 6 absensi) dengan FK & index; skrip ETL 13 langkah (dedup, pecah CSV, orphan handling) + laporan kualitas data (Markdown, bukan CSV) |
| 2 — Auth & Users | ✅ Selesai | Login 3 role + JWT + RBAC guard + rehash SHA1→bcrypt otomatis + konfirmasi/status akun + **refresh token (rotasi + revoke/logout)** — endpoint `POST /auth/refresh` & `POST /auth/logout`, disimpan sbg sha256 hash, TTL 30 hari |
| 3 — Master Data & Teaching Assignments | ✅ Selesai (API + UI) | **API:** read-only + CRUD tulis admin (kelas/jurusan/semester/mapel + jenis ujian/perangkat/tugas + upsert identitas sekolah) & modul `teaching-assignments`. **UI:** halaman `/dashboard/master` dengan 9 tab (Sekolah, Kelas, Jurusan, Semester, Mapel, Jenis Ujian, Jenis Perangkat, Jenis Tugas, Penugasan Guru) lengkap CRUD + validasi |
| 4 — Materi & Perangkat Ajar | 🟡 Sebagian | **UI materi** (`/dashboard/materials` list+detail, tandai-baca siswa) lengkap. **Belum:** upload berkas + integrasi MinIO/S3, dan modul `teaching-kits` di API |
| 5 — Ujian Objektif | 🟡 Sebagian | **UI pengerjaan** (`/dashboard/exams` list+take) untuk siswa (radio + submit + layar hasil) & pratinjau untuk guru/admin. **Belum:** timer server-side (WebSocket + Redis), CRUD bank soal/pembuatan ujian, analisis per soal (model/ETL ada, API tidak), load test ujian serentak |
| 6 — Ujian Essay & Tugas | ✅ Selesai (API + UI) | **API:** CRUD essay-exams + assignments + pembukaan kelas + pengumpulan berkas siswa + penilaian. **UI:** halaman `/dashboard/essay-exams` (list+create+detail+pembukaan kelas), `/dashboard/assignments` (list+create+detail: form kumpul siswa + upload berkas, daftar pengumpulan + modal penilaian, pembukaan kelas, kunci otomatis setelah dinilai). **Catatan:** penilaian essay per-siswa butuh model `EssayExamSubmission` (belum di schema) |
| 7 — Nilai/Laporan & Export | ✅ Selesai (API + UI) | **API:** modul `reports` (recap JSON + export PDF via PDFKit untuk ujian objektif & tugas). **UI:** halaman `/dashboard/reports` (tab Ujian/Tugas + pilih + tombol unduh PDF), `/dashboard/attendance-reports` (rekap bulanan + filter + unduh PDF) |
| 8 — Chat Real-time | ❌ Belum | Model & ETL `messages` ada; gateway Socket.IO belum |
| 9 — Hardening, UAT & Cutover | 🟡 Sebagian | **Hardening backend sebagian selesai:** `ValidationPipe` global (whitelist+transform) + DTO auth, rate-limit (`@nestjs/throttler`: login 10/mnt, request-verification 5/mnt, default 120/mnt, health dikecualikan), CORS default tertutup (same-origin) kecuali `CORS_ORIGINS` diisi, kontainer API non-root, `JWT_SECRET`/`QR_SECRET` fail-fast tanpa fallback hardcoded, header keamanan dasar via Nginx. **UI web hardening:** AppShell dengan route group `(dashboard)` & RequireAuth (RBAC-aware), klien API single-flight refresh token + `ApiError` tipikal. **Belum:** validasi menyeluruh di semua endpoint tulis (baru auth+edge), UAT, cutover. Panduan di `05` & `08` |
| A1–A5 — Penggabungan Absensi (lihat `06-penggabungan-absen-ke-platform.md`) | ✅ Selesai (backend + UI) | **Backend:** modul `attendance`, `leave-requests`, `attendance-reports`, `notifications` (service) + ETL rekonsiliasi absen. **UI:** halaman `/dashboard/attendance` (QR sendiri + riwayat + **pemindai kamera (html5-qrcode)** + scan input manual + daftar harian), `/dashboard/leave` (form ajuan + upload bukti + riwayat sendiri + approval admin + filter status). Lihat `07-laporan-rekonsiliasi-absen.md` |
| **Frontend Web (Next.js, `apps/web`)** | ✅ **Selesai (konten fitur)** | **Fondasi terpasang:** klien API terpusat (access+refresh token, auto-refresh saat 401 single-flight, `ApiError`, helper terketik + upload FormData), konteks auth, AppShell sidebar+header responsif, RequireAuth + route group `(dashboard)`, error/not-found/loading, **komponen UI bersama**: `Card`/`Badge`/`Button`/`Spinner`/`Modal`/`DataTable` + util `format.ts` + `api-files.ts` (download Blob/Content-Disposition). **Halaman terlampir:** login, dashboard, materials (list+detail), exams (list+take + layar hasil), essay-exams (list+detail+pembukaan kelas), assignments (list+detail+form kumpul+penilaian), reports (ujian/tugas PDF), attendance-reports (bulanan PDF), master (9 tab CRUD), users (filter+aktif/non-aktif), attendance (QR+riwayat+kamera+scan+daftar harian), leave (ajuan+riwayat+approval). Build `next build` dilaporkan lolos 15 route oleh pengembang (**belum diverifikasi ulang** di lingkungan penyusunan ini). **Belum:** Chat real-time (Fase 8), upload MinIO (Fase 4), timer ujian (Fase 5), analisis per soal (Fase 5), rapor gabungan, serta pengelolaan jam absen & hari libur (tanpa UI maupun API) |

**Modul NestJS yang sudah ada:** `auth` (+refresh token), `users`, `master-data` (+CRUD), `teaching-assignments`, `materials`, `exams`, `essay-exams`, `assignments`, `reports`, `attendance`, `leave-requests`, `attendance-reports`, `notifications` (tanpa controller, dipakai internal).
**Belum dibuat sebagai modul API:** `teaching-kits`, `chat` (Socket.IO), serta **pengelolaan konfigurasi absensi** — `AttendanceWindow` (jam masuk/keluar), `Holiday` (hari libur), dan `TeacherSchedule` (jadwal guru). Ketiga tabel ini **sudah ada di schema dan terisi via ETL**, tetapi **belum punya controller/endpoint** sehingga jam absen & hari libur saat ini hanya bisa diubah langsung di database. Penyempurnaan tersisa: upload berkas materi/MinIO (Fase 4), timer ujian server-side + CRUD bank soal (Fase 5), analisis per soal (Fase 5), penilaian essay per-siswa (butuh model submission baru).
**Web (`apps/web`):** ✅ Semua modul API di atas sudah memiliki halaman web yang fungsional:
- `auth` → `/` (login), logout melalui AppShell
- `users` → `/dashboard/users` (admin: filter role + aktif/non-aktif)
- `master-data` → `/dashboard/master` (9 tab CRUD untuk sekolah, kelas, jurusan, semester, mapel, jenis ujian/perangkat/tugas, penugasan guru)
- `teaching-assignments` → tertampil di tab "Penugasan Guru" pada `/dashboard/master` (read-only)
- `materials` → `/dashboard/materials` (list+detail, tandai-baca untuk siswa)
- `exams` → `/dashboard/exams` (list+take+hasil, kunci jawaban disembunyikan untuk siswa sesuai API)
- `essay-exams` → `/dashboard/essay-exams` (list+create+detail+pembukaan kelas)
- `assignments` → `/dashboard/assignments` (list+create+detail: form kumpul+upload+penilaian+pembukaan kelas)
- `reports` → `/dashboard/reports` (recap ujian/tugas + unduh PDF), `/dashboard/attendance-reports` (recap absensi + unduh PDF)
- `attendance` → `/dashboard/attendance` (QR+riwayat+kamera+scan+daftar harian)
- `leave-requests` → `/dashboard/leave` (ajuan+riwayat+approval admin)

Penanda status ✅/🟡/❌ juga disematkan pada tiap fase di **bagian 6 (Rincian Fase)** di bawah.

---

## 1. Ringkasan Eksekutif

Aplikasi lama adalah LMS fungsional (autentikasi 3 role, data master, materi/perangkat, ujian objektif & essay, tugas, penilaian, chat, laporan) namun dibangun dengan PHP prosedural tanpa framework, rentan SQL injection (±132 titik query dinamis), password `sha1` tanpa salt, dan skema database yang tidak ternormalisasi (MyISAM, `latin1`, tanpa foreign key, jawaban ujian disimpan sebagai CSV di kolom `text`).

Strategi yang dipilih: **rebuild bertahap (incremental) dengan sistem lama tetap berjalan** hingga tiap modul selesai diverifikasi, lalu **cutover** per-domain. Data existing dimigrasi ke skema baru yang ternormalisasi. Password lama dipertahankan dan di-*rehash* otomatis saat login pertama (tanpa reset massal).

**Estimasi total: 14–18 minggu** untuk 1 tim kecil (2–3 engineer), dengan cutover produksi di akhir.

---

## 2. Tujuan & Batasan

### Tujuan
1. Mempertahankan **100% fitur fungsional** yang ada saat ini.
2. Menghapus seluruh kerentanan keamanan (SQL injection, password lemah, kredensial hardcoded).
3. Menormalisasi skema database dan menjaga **integritas data historis** (nilai, jawaban, materi).
4. Migrasi data tanpa kehilangan (zero data loss) dan tanpa memaksa user reset password.
5. Menyediakan fondasi yang siap untuk mobile app (API-first).

### Di luar cakupan (untuk fase ini)
- Fitur baru di luar yang sudah ada (kecuali perbaikan keamanan/integritas yang wajib).
- Aplikasi mobile React Native (disiapkan pondasinya, dibangun setelah web stabil).
- Migrasi modul `absen/` (proyek terpisah, tidak termasuk).

### Asumsi
- Database sumber tersedia sebagai dump MySQL (`learning.sql`).
- Berkas upload (materi, tugas, foto) tersedia di `learning/vendor/file/` dan `learning/vendor/images/`.
- Downtime cutover final yang dapat ditoleransi: 1 malam (di luar jam sekolah).

---

## 3. Arsitektur Target (Ringkas)

| Lapisan | Teknologi |
|---|---|
| Frontend Web | Next.js 15 (React 19) + TypeScript + Tailwind + shadcn/ui |
| Backend API | NestJS (Node + TypeScript), REST + WebSocket (Socket.IO) |
| ORM & DB | Prisma + PostgreSQL 16 |
| Auth | JWT (access+refresh) + RBAC (Admin/Guru/Siswa) |
| Cache/Queue/WS state | Redis + BullMQ |
| Penyimpanan berkas | S3-compatible (MinIO / AWS S3) |
| Deploy | Docker Compose + Nginx + CI/CD |

> Catatan: Jika diputuskan tetap memakai **MySQL 8**, seluruh rencana ini tidak berubah selain driver Prisma. Untuk sisa dokumen digunakan asumsi PostgreSQL.

> **Realisasi vs target (23 September 2026):** `shadcn/ui` belum dipakai (komponen UI ditulis sendiri di `components/ui/`); **WebSocket/Socket.IO belum ada**; **Redis/BullMQ belum dipakai** (container disiapkan di `docker-compose.yml`, tetapi fitur pemakainya belum dibuat); **S3/MinIO belum terintegrasi** (upload masih `diskStorage` lokal); **CI/CD belum dibuat** (deploy manual via `docker-compose.prod.yml` + `deploy/scripts/`).

---

## 4. Inventaris Sistem Lama (Basis Migrasi)

### 4.1 Tabel database (25 tabel)

| Tabel lama | Isi | Catatan migrasi |
|---|---|---|
| `tb_admin` | Akun admin | → `users` (role ADMIN). Password `sha1`. |
| `tb_guru` | Akun & profil guru | → `users` (role GURU) + `teacher_profiles`. Login via `email`. Ada `status`, `confirm`. |
| `tb_siswa` | Akun & profil siswa | → `users` (role SISWA) + `student_profiles`. Login via `nis`. **Ada baris duplikat** (nis sama) — perlu deduplikasi. |
| `tb_sekolah` | Identitas sekolah (logo, copyright) | → `school_settings` (single row / key-value). |
| `tb_master_kelas` | Master kelas | → `classes`. Kolom `nama_kelas int` tak terpakai (semua 0). |
| `tb_master_jurusan` | Master jurusan | → `majors`. |
| `tb_master_semester` | Master semester | → `semesters`. |
| `tb_master_mapel` | Master mata pelajaran | → `subjects`. |
| `tb_jenisujian` | Jenis ujian (UTS/Harian/UAS) | → `exam_types`. |
| `tb_jenisperangkat` | Jenis perangkat ajar (CP/ATP/Modul) | → `teaching_kit_types`. |
| `tb_jenistugas` | Jenis tugas (Individu/Kelompok) | → `assignment_types` (bisa jadi enum). |
| `tb_roleguru` | Penugasan guru→kelas+mapel+semester+jurusan | → `teaching_assignments` (pivot inti; banyak FK bergantung pada ini). |
| `tb_materi` | Materi pembelajaran (teks/berkas) | → `materials`. Terhubung ke `id_roleguru`. |
| `tb_materibaca` | Log siswa membaca materi | → `material_reads`. |
| `tb_perangkat` | Perangkat ajar (upload berkas) | → `teaching_kits`. |
| `ujian` | Ujian objektif (pilihan ganda) | → `exams`. `waktu` = durasi (time), `acak` = flag pengacakan. |
| `soal` | Bank soal pilihan ganda | → `questions` + `question_options`. 5 pilihan + `kunci`. |
| `kelas_ujian` | Kelas mana yang dibuka untuk ujian | → `exam_classes`. |
| `ujian_essay` | Ujian essay | → `essay_exams`. Soal disimpan di satu kolom `text`. |
| `kelas_ujianessay` | Kelas untuk ujian essay | → `essay_exam_classes`. |
| `nilai` | Hasil & state pengerjaan ujian | → `exam_attempts` + `exam_answers`. **Denormalisasi berat** (lihat 4.3). |
| `analisis` | Analisis jawaban per soal | → `answer_analytics` (atau diturunkan dari `exam_answers`). |
| `tb_tugas` | Tugas guru | → `assignments`. |
| `kelas_tugas` | Kelas untuk tugas | → `assignment_classes`. |
| `tugas_siswa` | Pengumpulan tugas siswa | → `assignment_submissions`. |
| `pesan` | Chat/pesan antar user | → `messages`. `id_pengirim`/`id_penerima` bertipe varchar (campur nis/email). |

### 4.2 Peta fitur → modul NestJS

- **auth** — login 3 role, session, konfirmasi akun (`status`, `confirm`, `aktif`).
- **users** — CRUD guru & siswa, konfirmasi/unconfirm oleh admin, profil.
- **master-data** — kelas, jurusan, semester, mapel, jenis ujian/perangkat/tugas.
- **teaching-assignments** — `tb_roleguru` (penugasan mengajar).
- **materials** — materi + log baca (`tb_materibaca`).
- **teaching-kits** — perangkat ajar (`tb_perangkat`).
- **exams** — ujian objektif: bank soal, pengacakan, timer, pengerjaan, penilaian otomatis, analisis.
- **essay-exams** — ujian essay + penilaian manual.
- **assignments** — tugas + pengumpulan berkas + penilaian.
- **grading/reports** — rekap nilai, laporan (folder `Report/`), export PDF.
- **chat** — pesan real-time.
- **school-settings** — identitas sekolah.

### 4.3 Masalah data yang WAJIB ditangani saat migrasi

1. **`nilai.acak_soal` & `nilai.jawaban` = CSV dalam kolom `text`.**
   Contoh: `acak_soal='120,123,124,121,122'`, `jawaban='1,2,3,2,2'` (indeks selaras).
   → Dipecah menjadi baris-baris `exam_answers` (attempt_id, question_id, urutan, jawaban_dipilih).
2. **`nilai.id_ujian` bertipe `varchar(100)`** padahal `ujian.id_ujian` adalah `int`.
   → Cast ke integer + FK saat migrasi; validasi nilai yang tidak cocok.
3. **`nilai.sisa_waktu` bisa > 24 jam** (contoh `'90:00:00'`, `'106:24:22'`) — bug perhitungan waktu di kode lama.
   → Data historis dibiarkan apa adanya (arsip), tetapi sistem baru memakai timestamp server (lihat 6.4).
4. **Baris siswa duplikat** (mis. `nis=20408` muncul beberapa kali; `nis=220401` untuk dua nama berbeda).
   → Butuh aturan deduplikasi + verifikasi manual pihak sekolah.
5. **`pesan.id_pengirim/id_penerima` = varchar campuran** (kadang `nis`, kadang `email`, kadang teks `'Kirim Ke'`).
   → Perlu resolusi ke `users.id`; baris yang tidak dapat dipetakan ditandai/di-quarantine.
6. **Semua password = `sha1` tanpa salt.**
   → Simpan hash lama di kolom `legacy_password_sha1`; rehash ke bcrypt/argon2 saat login pertama.
7. **Engine campur (MyISAM/InnoDB) + charset `latin1`.**
   → Target `utf8mb4`/UTF-8; perlu transcoding teks berisi karakter rusak (mis. `pascalâ€¦`).
8. **Tanggal lahir `0000-00-00`** di banyak baris.
   → Dipetakan menjadi `NULL`.
9. **Tanpa foreign key** — ada kemungkinan *orphan rows* (mis. `tb_tugas.id_guru=0`).
   → Validasi referensial saat ETL; orphan dilaporkan sebelum diimpor.

---

## 5. Strategi Migrasi Keseluruhan

Pendekatan: **Strangler Fig (bertahap)** — sistem baru dibangun berdampingan, modul dipindahkan satu per satu, sistem lama dipensiunkan setelah semua modul stabil.

```
Fase 0  Persiapan & fondasi
Fase 1  Skema DB baru + skrip ETL (data)
Fase 2  Auth & Users (+ migrasi password strategy)
Fase 3  Master Data & Teaching Assignments
Fase 4  Materi & Perangkat Ajar (+ migrasi berkas)
Fase 5  Ujian Objektif (bank soal, timer, penilaian)  ← paling kompleks
Fase 6  Ujian Essay & Tugas
Fase 7  Nilai/Laporan & Export
Fase 8  Chat real-time
Fase 9  Hardening, UAT, Cutover produksi
```

### Prinsip
- Setiap fase punya **kriteria selesai (Definition of Done)** dan **verifikasi terhadap sistem lama** (bandingkan output/angka).
- Data historis diimpor **read-only** dulu; penulisan baru mulai dilakukan di sistem baru setelah cutover modul.
- Tidak ada modul dianggap selesai tanpa: migrasi data terverifikasi + test otomatis + UAT singkat.

---

## 6. Rincian Fase

### Fase 0 — Persiapan & Fondasi (1–2 minggu) — 🟡 SEBAGIAN
- [x] Setup monorepo (NestJS API + Next.js web + Prisma), Docker Compose (PostgreSQL, Redis, MinIO).
- [x] `.env`/secrets terpisah per environment (kredensial hardcoded `config/db.php` lama tidak dibawa; dipusatkan di `config/secrets.ts` dengan fail-fast).
- [x] Environment: `dev`, `staging`, `prod` (`.env.example`, `.env.production.example`).
- [x] Ambil salinan dump `learning.sql` (dipakai ETL). Berkas sumber `vendor/file/` & `vendor/images/` **tidak diarsipkan ke repo** — masih berada di `learning/` dan belum disalin ke object storage (lihat Fase 4).
- [ ] **Linting & format otomatis:** belum dikonfigurasi — tidak ada file ESLint/Prettier dan tidak ada script `lint` di `apps/api` maupun `apps/web` (script `lint` di root akan gagal).
- [ ] **CI/CD:** pipeline otomatis belum dibuat — tidak ada `.github/workflows/` atau konfigurasi CI lain; build & test masih dijalankan manual.
- [x] **DoD (terpenuhi sebagian):** `docker compose up` menjalankan seluruh stack kosong.
- [ ] **DoD:** "pipeline CI hijau" — **belum terpenuhi** (CI belum ada).

### Fase 1 — Skema DB Baru + Kerangka ETL (1–2 minggu) — ✅ SELESAI
- [x] Definisikan Prisma schema ternormalisasi (users + profiles, master data, teaching_assignments, materials, exams/questions/options, attempts/answers, assignments/submissions, messages, school_settings).
- [x] Tambahkan **foreign key**, index, dan tipe data benar (int untuk id_ujian, `NULL`-able date, dsb.).
- [x] Bangun kerangka **skrip ETL** (Node/TS) yang membaca dump lama → transform → tulis ke DB baru, dengan:
  - [x] Tabel pemetaan ID lama→baru (untuk menjaga relasi).
  - [x] Log validasi (orphan, duplikat, data rusak) → laporan **Markdown** (`docs/04-laporan-kualitas-data.md`, `docs/07-laporan-rekonsiliasi-absen.md`); rencana awal menyebut CSV.
- [x] **DoD:** migrasi Prisma jalan; ETL dry-run menghasilkan laporan kualitas data tanpa menulis.

### Fase 2 — Auth & Users (2 minggu) — ✅ SELESAI
- [x] Endpoint login untuk 3 role, JWT access+refresh, RBAC guard.
- [x] **Migrasi data user:** `tb_admin`/`tb_guru`/`tb_siswa` → `users` + profil.
  - [x] Simpan `legacy_password_sha1`.
  - [x] Login pertama: verifikasi `sha1(input) == legacy` → jika cocok, set `password_hash` (argon2/bcrypt) dan kosongkan legacy.
  - [x] Petakan `status`/`confirm`/`aktif` → kolom status akun terpadu.
  - [x] Jalankan **deduplikasi siswa** + serahkan laporan ke sekolah untuk konfirmasi.
- [x] **DoD:** semua user existing bisa login dengan password lama; password ter-upgrade otomatis; admin bisa konfirmasi/nonaktifkan akun.
- **Status:** Login 3 role + JWT + RBAC guard ✅, rehash SHA1→bcrypt saat login pertama ✅, konfirmasi/nonaktif akun oleh admin ✅, **refresh token ✅** (opaque token disimpan sbg sha256 hash, TTL 30 hari, endpoint `POST /auth/refresh` dgn rotasi + `POST /auth/logout` revoke). Diuji runtime: login mengembalikan access+refresh, refresh berotasi, token lama/logged-out ditolak 401.

### Fase 3 — Master Data & Teaching Assignments (1–2 minggu) — ✅ SELESAI (API + UI)
- [x] CRUD: kelas, jurusan, semester, mapel, jenis ujian/perangkat/tugas.
- [x] Migrasi `tb_roleguru` → `teaching_assignments` (pivot penting untuk fase berikutnya).
- [x] **DoD:** jumlah & isi master data identik dengan lama; penugasan guru cocok 1:1.
- [x] UI web master data — `/dashboard/master` (9 tab CRUD).
- **Status:** Migrasi `tb_roleguru` → `teaching_assignments` via ETL ✅, endpoint **read-only** master data ✅, **CRUD tulis admin** (POST/PUT/DELETE kelas/jurusan/semester/mapel + jenis ujian/perangkat/tugas; upsert identitas sekolah) ✅ (@Roles ADMIN, error unik/FK dipetakan ke 409), **modul API `teaching-assignments`** (CRUD + filter teacherId/classId/semesterId + validasi FK) ✅. Diuji runtime: create/update/delete mapel OK & non-admin ditolak 403. **UI:** halaman `/dashboard/master` (9 tab CRUD) sudah terpasang.

### Fase 4 — Materi & Perangkat Ajar (1–2 minggu) — 🟡 SEBAGIAN
- [x] Modul materi (teks) + log baca materi (list/detail + tandai-baca).
- [x] Migrasi log baca materi (`tb_materibaca`) via ETL.
- [ ] **Migrasi berkas:** pindahkan `vendor/file/*` ke object storage (MinIO/S3), perbarui path di `materials`/`teaching_kits`.
- [ ] Upload berkas materi + validasi ekstensi & ukuran di sisi server (menggantikan pengecekan lemah di `models.php`).
- [ ] Modul perangkat ajar (`teaching-kits`) di API.
- [ ] **DoD:** materi & perangkat lama dapat diunduh; log baca termigrasi.
- **Status:** Modul materi (list/detail) + tandai-baca ✅, migrasi log baca via ETL ✅, **UI** `/dashboard/materials` (list+detail, tandai-baca untuk siswa) ✅. **Belum:** upload berkas + integrasi object storage (MinIO/S3), validasi ekstensi/ukuran sisi server, dan modul perangkat ajar (teaching-kits) di API.

### Fase 5 — Ujian Objektif (3 minggu) — modul paling kompleks — 🟡 SEBAGIAN
- [x] Ambil ujian (kunci jawaban disembunyikan untuk siswa) + pembukaan per kelas (`exam_classes`).
- [x] Penilaian otomatis (benar/salah/kosong, skor).
- [ ] **Analisis per soal** (statistik butir/tingkat kesulitan): belum ada di API. Model `AnswerAnalysis` + migrasi datanya ada di schema/ETL, tetapi **tidak ada endpoint atau service** yang menghitung/menyajikannya.
- [x] **Migrasi data `nilai` + `analisis`:** pecah CSV `acak_soal`/`jawaban` → `exam_attempts` + `exam_answers`; hitung ulang & bandingkan dengan `jml_benar`/`nilai` lama sebagai validasi.
- [ ] **Pengerjaan ujian dengan timer server-side** via WebSocket + Redis (memperbaiki bug waktu lokal & `sisa_waktu > 24 jam`).
- [ ] CRUD bank soal (`questions` + `question_options`) + pembuatan ujian & pengacakan.
- [ ] **DoD:** skor hasil migrasi cocok dengan data lama; simulasi ujian serentak (load test) stabil.
- **Status:** Ambil ujian (kunci jawaban disembunyikan untuk siswa) + penilaian otomatis (benar/salah/kosong, skor) ✅, migrasi `nilai`/`analisis` dengan pemecahan CSV → `exam_attempts`+`exam_answers` via ETL ✅. **Belum:** timer server-side (WebSocket + Redis), CRUD bank soal/pembuatan ujian, **analisis per soal** (tidak ada di API), dan load test ujian serentak.

### Fase 6 — Ujian Essay & Tugas (2 minggu) — ✅ SELESAI (API + UI)
- [x] Ujian essay (CRUD + pembukaan per kelas). *Catatan: penilaian essay per-siswa belum (butuh model `EssayExamSubmission`).*
- [x] Tugas: pembuatan, pembukaan per kelas, pengumpulan berkas siswa, penilaian (score/feedback).
- [x] Migrasi `ujian_essay`, `tb_tugas`, `kelas_tugas`, `tugas_siswa` via ETL.
- [ ] Migrasi berkas tugas/essay ke object storage (saat ini upload ke disk lokal).
- [x] **DoD:** guru dapat menilai (tugas); submission historis termigrasi.
- **Status:** Model Prisma (`essay_exams`, `assignments`, dst.) + migrasi data via ETL ✅. **Modul API `essay-exams`** (CRUD ujian + pembukaan kelas; siswa difilter per kelas/jurusan) ✅. **Modul API `assignments`** (CRUD tugas + pembukaan kelas + pengumpulan berkas siswa via upload tervalidasi ≤10MB + penilaian guru score 0–100/feedback; satu pengumpulan per siswa, terkunci setelah dinilai) ✅. **UI:** `/dashboard/essay-exams` (list+create+detail+pembukaan kelas) & `/dashboard/assignments` (list+create+detail: form kumpul + upload berkas, daftar pengumpulan, modal penilaian, pembukaan kelas). Diuji runtime: list essay/assignments 200. **Catatan:** penilaian **essay per-siswa** belum tersedia karena schema belum punya tabel pengumpulan jawaban essay (`EssayExamSubmission`) — sengaja tidak dipalsukan, ditandai sebagai penambahan model lanjutan.

### Fase 7 — Nilai/Laporan & Export (1–2 minggu) — ✅ SELESAI (API + UI)
- [x] Rekap nilai per ujian objektif & per tugas (menggantikan folder `Report/`).
- [x] Export PDF (rekap) via PDFKit (bukan Puppeteer/react-pdf — tanpa headless browser).
- [x] UI web rekap + unduh PDF (`/dashboard/reports` untuk ujian & tugas, `/dashboard/attendance-reports` untuk rekap absensi bulanan).
- [x] **DoD:** angka laporan cocok dengan perhitungan lama; export PDF benar.
- [ ] Rapor gabungan lintas-mapel (opsional).
- **Status:** **Modul API `reports`** ✅ — rekap nilai ujian objektif (`GET /reports/exams/:id/recap` + `.pdf`) dari `ExamAttempt` (benar/salah/kosong/skor + rata2/tertinggi/terendah) & rekap nilai tugas (`GET /reports/assignments/:id/recap` + `.pdf`) dari `AssignmentSubmission`. Export **PDF via PDFKit** (bukan Puppeteer, tanpa headless browser). @Roles(ADMIN, GURU). Diuji runtime: recap JSON exam #32 akurat (23 peserta, rata2 39.42) & PDF valid `%PDF` 200. **UI:** `/dashboard/reports` (tab Ujian/Tugas + unduh PDF) & `/dashboard/attendance-reports` (rekap bulanan). **Sisa opsional:** rapor gabungan lintas-mapel.

### Fase 8 — Chat Real-time (1 minggu) — ❌ BELUM
- [x] Migrasi `pesan` dengan resolusi pengirim/penerima ke `users.id`; baris tak-terpetakan diarsip.
- [ ] Pesan real-time (Socket.IO), status dibaca/belum (gateway belum dibuat).
- [ ] **DoD:** chat berjalan real-time; riwayat termigrasi sebisa mungkin.
- **Status:** Model `messages` + migrasi (resolusi pengirim/penerima ke `users.id`) via ETL ✅. **Belum:** gateway Socket.IO & status dibaca real-time.

### Fase 9 — Hardening, UAT & Cutover (2 minggu) — 🟡 SEBAGIAN
- [x] Rate limiting via `@nestjs/throttler` (login 10/mnt/IP, request-verification 5/mnt, default 120/mnt; `/api/health` dikecualikan).
- [x] `ValidationPipe` global (`whitelist` + `transform`) + DTO tervalidasi pada endpoint auth (permukaan publik).
- [x] CORS default **tertutup** (same-origin via Nginx); lintas-origin hanya bila `CORS_ORIGINS` diisi.
- [x] Header keamanan dasar via Nginx (X-Frame-Options, nosniff, Referrer-Policy).
- [x] Kontainer API dijalankan sebagai user non-root.
- [x] Secret fail-fast: `JWT_SECRET`/`QR_SECRET` wajib diisi (tanpa fallback hardcoded) — API menolak start bila kosong.
- [ ] Validasi input menyeluruh di **semua** endpoint tulis (kini baru auth + edge; endpoint admin/guru lain masih andalkan validasi service + RBAC).
- [ ] Audit keamanan lanjutan (RBAC edge cases, `helmet`, security review menyeluruh).
- [ ] UAT bersama guru/admin/siswa perwakilan.
- [ ] **Cutover** (lihat bagian 9).

---

## 7. Strategi Migrasi Data (ETL)

### Alur
1. **Extract** — impor dump `learning.sql` ke database MySQL sementara (staging).
2. **Transform** — skrip TypeScript membaca staging, menerapkan aturan bersih (charset, tanggal `0000-00-00`→NULL, cast tipe, dedup, resolusi relasi), memakai tabel pemetaan ID.
3. **Load** — tulis ke PostgreSQL via Prisma dalam transaksi per-tabel, urut sesuai dependensi FK.
4. **Verify** — bandingkan jumlah baris, checksum agregat, dan sampel manual; hitung ulang skor ujian.

### Urutan muat (mengikuti dependensi)
```
school_settings → majors, classes, semesters, subjects, *_types
→ users (+profiles) → teaching_assignments
→ materials, material_reads, teaching_kits
→ exams → questions → question_options → exam_classes
→ exam_attempts → exam_answers → answer_analytics
→ essay_exams → essay_exam_classes
→ assignments → assignment_classes → assignment_submissions
→ messages
```

### Migrasi password (tanpa reset massal)
- Kolom baru: `password_hash` (nullable), `legacy_password_sha1`.
- Saat login: jika `password_hash` kosong → cek `sha1(input) === legacy_password_sha1`; jika cocok, simpan `password_hash = argon2(input)`, set `legacy_password_sha1 = NULL`.
- Setelah masa transisi, akun yang belum pernah login bisa dipaksa reset.

### Migrasi berkas
- Skrip menyalin `vendor/file/*` dan `vendor/images/*` ke bucket object storage.
- Path lama (`../vendor/file/PERANGKAT_...`) dipetakan ke key storage baru; kolom `file` diperbarui.
- Berkas yang direferensikan DB tetapi hilang di disk → dicatat di laporan.

### Laporan kualitas data (deliverable ke sekolah)
- Daftar siswa duplikat untuk dikonfirmasi.
- Baris `pesan` yang pengirim/penerimanya tak dapat dipetakan.
- Orphan rows (FK menunjuk ke id yang tak ada).
- Ketidakcocokan skor ujian hasil hitung ulang vs `nilai` lama.

---

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data rusak/duplikat/orphan | Migrasi gagal / data salah | ETL dry-run + laporan kualitas data + konfirmasi sekolah sebelum load final |
| Denormalisasi `nilai` sulit dipecah | Skor historis salah | Hitung ulang & bandingkan dengan `jml_benar`/`nilai` lama; toleransi selisih 0 |
| Password tidak bisa dimigrasi | User terkunci | Strategi rehash saat login + jalur reset password cadangan |
| Karakter `latin1` rusak | Teks soal/materi kacau | Transcoding + tinjauan manual sampel soal |
| Bug timer ujian lama terbawa | Sesi ujian tak konsisten | Timer server-side baru; data lama hanya arsip read-only |
| Kurva belajar tim (PHP→TS) | Jadwal molor | Pelatihan di Fase 0–1; opsi alternatif Laravel bila jadi kendala utama |
| Ujian serentak (beban puncak) | Sistem lambat/timeout | Load test di Fase 5; Redis + koneksi pool + index tepat |
| Cutover gagal | Layanan sekolah terganggu | Rencana rollback + backup penuh sebelum cutover (bagian 9) |

---

## 9. Rencana Cutover & Rollback

### Pra-cutover
- Freeze perubahan data di sistem lama (window malam, di luar jam sekolah).
- Backup penuh: dump database lama + arsip berkas.
- Jalankan ETL final dari data terkini → verifikasi laporan.

### Cutover
1. Aktifkan mode maintenance sistem lama.
2. Jalankan ETL final + verifikasi cepat (row counts, sampel login, sampel skor).
3. Arahkan domain/reverse-proxy ke aplikasi baru.
4. Smoke test: login tiap role, buka materi, mulai ujian dummy, kirim chat.

### Rollback
- Jika smoke test gagal kritis: kembalikan reverse-proxy ke sistem lama, nonaktifkan maintenance.
- Karena sistem lama tidak disentuh (hanya dibaca) selama ETL, rollback = mengarahkan domain kembali.

### Pasca-cutover
- Pantau error (Sentry) & performa 1–2 minggu.
- Sistem lama disimpan read-only sebagai arsip minimal 1 semester sebelum dipensiunkan.

---

## 10. Estimasi Waktu (indikatif, tim 2–3 engineer)

| Fase | Durasi |
|---|---|
| 0 — Fondasi | 1–2 minggu |
| 1 — Skema + ETL | 1–2 minggu |
| 2 — Auth & Users | 2 minggu |
| 3 — Master Data | 1–2 minggu |
| 4 — Materi & Perangkat | 1–2 minggu |
| 5 — Ujian Objektif | 3 minggu |
| 6 — Essay & Tugas | 2 minggu |
| 7 — Nilai & Laporan | 1–2 minggu |
| 8 — Chat | 1 minggu |
| 9 — Hardening & Cutover | 2 minggu |
| **Total** | **±14–18 minggu** |

Fase 3–4 dan 6–7 sebagian dapat diparalelkan bila anggota tim cukup.

---

## 11. Langkah Selanjutnya

1. **Persetujuan dokumen ini** — ✅ selesai (status: disetujui, dalam pelaksanaan).
2. Lanjut ke **Dokumen 2 — Pemetaan Skema Database** (Prisma schema; di `docs/02-pemetaan-skema-database.md`) — ✅ selesai (schema 34 model, mencakup 25 tabel lama + 6 model absensi).
3. Lanjut ke **Dokumen 3 — Scaffolding Proyek** (`docs/03`) — ✅ selesai.
4. **Langkah berikutnya yang belum dikerjakan** (urutan disarankan):
   1. CI/CD + ESLint/Prettier + test otomatis (menutup Fase 0 & memperkuat Fase 9).
   2. Fase 8 — gateway Socket.IO (chat real-time).
   3. Fase 5 — timer ujian server-side (WebSocket + Redis) + CRUD bank soal + analisis per soal.
   4. Fase 4 — upload berkas materi/object storage (MinIO/S3, atau volume disk pada deployment sekolah) + modul `teaching-kits`.
   5. Modul API + UI pengelolaan jam absen & hari libur (`AttendanceWindow`/`Holiday`/`TeacherSchedule`).
   6. Fase 9 — validasi tulis menyeluruh, `helmet`/audit RBAC, UAT, dan cutover produksi.

> Keputusan yang perlu dikonfirmasi pihak sekolah/pemangku kepentingan:
> - Setuju pindah ke stack TypeScript (Next.js/NestJS) atau memilih alternatif Laravel single-stack?
> - Target database final: PostgreSQL 16 atau tetap MySQL 8?
> - Aturan penanganan data siswa duplikat dan pesan yang tak terpetakan.
> - Jadwal window maintenance untuk cutover.
