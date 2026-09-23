# Dokumen 6 — Rencana Penggabungan Absensi ke dalam Platform Sekolah (LMS + Absensi Jadi Satu App)

> Dokumen ini menjawab: **"Mungkinkah `learning/` (LMS) dan `absen/` (Absensi) dijadikan satu aplikasi?"** — Jawaban: **Ya, dan direkomendasikan.** Alih-alih membangun `absen-rebuild/` terpisah, modul absensi **dilipat masuk (fold-in)** ke monorepo `learning-rebuild/` yang sudah ada, menjadi satu **Platform Sekolah SMK Nagara** dengan satu database, satu autentikasi (SSO), dan master data bersama.

- **Versi dokumen:** 1.1
- **Tanggal:** 23 September 2026 (status implementasi diperbarui — UI halaman absensi & perizinan sudah terimplementasikan)
- **Status:** Diterapkan (backend ✅ + UI Absensi/Izin ✅). **Belum:** pengelolaan jam absen & hari libur (tabel ada, modul API + UI belum)
- **Prasyarat:** `01-rencana-migrasi.md` (LMS) & rencana migrasi absensi. Dokumen ini menggantikan kebutuhan akan repo `absen-rebuild/` terpisah.

---

## 1. Mengapa Penggabungan Ini Mungkin & Menguntungkan

Kedua aplikasi berbagi konteks yang sama sehingga penggabungan bersifat **alami, bukan dipaksakan**:

| Aspek | `learning/` (LMS) | `absen/` (Absensi) | Implikasi penggabungan |
|---|---|---|---|
| Institusi | SMK Nagara | SMK Nagara (`WEBNAME = "Absensi SMK Nagara"`) | Sama → satu identitas sekolah (`SchoolSetting`) |
| Aktor | Admin, Guru, Siswa | Admin/Operator, Guru, Siswa | **Orang yang sama** → satu tabel `users` |
| Master data | Kelas, Jurusan, Semester, Mapel | Kelas, Jurusan | Kelas & Jurusan **beririsan** → dibagi bersama |
| Target stack rebuild | Next.js + NestJS + Prisma + PostgreSQL | Rencana stack identik | Satu monorepo, satu deployment |
| Framework lama | PHP prosedural | CodeIgniter 3 | Keduanya di-rebuild, jadi framework lama tidak menghambat |

**Fondasi sudah tersedia.** Schema Prisma `learning-rebuild` **sudah** memuat entitas yang dibutuhkan absensi:
- `User` (enum `Role { ADMIN, GURU, SISWA }`, `passwordHash`, `isActive`) — menyatukan **tiga sistem login absen** (`tabel_user`, `login_guru`, `login_siswa`) sekaligus login LMS.
- `StudentProfile` (punya `nis`, `classId`, `majorId`) dan `TeacherProfile` (punya `nik`) — absensi tinggal menempel ke sini.
- `Class`, `Major`, `SchoolSetting` — dipakai bersama.

Artinya, absensi **tidak membawa tabel user/kelas/jurusan/sekolah sendiri**; ia hanya menambah tabel khusus domain absensi (kehadiran, jendela jam, izin, libur) yang berelasi ke entitas yang sudah ada.

### Manfaat konkret
1. **Single Sign-On** — guru/siswa cukup satu akun untuk LMS dan absensi (menghapus 3 login absen + 1 login LMS = 4 kredensial menjadi 1).
2. **Master data tunggal** — kelas, jurusan, dan profil siswa/guru tidak lagi terduplikasi & tidak bisa "beda data".
3. **Satu deployment & satu tim** — satu Docker Compose, satu pipeline CI/CD*, satu basis kode TypeScript.
   *\*Catatan: pipeline CI/CD **belum dibuat**; saat ini deploy dijalankan manual lewat `deploy/scripts/` (lihat `docs/08`).*
4. **Data terhubung** — memungkinkan fitur silang (mis. kehadiran memengaruhi akses ujian, rekap terpadu) di masa depan.

---

## 2. Arsitektur Target Setelah Penggabungan

Satu monorepo `learning-rebuild/` (dapat di-*rename* menjadi `sekolah-platform/`), satu API, satu web, satu database.

```
learning-rebuild/                (→ opsional rename: sekolah-platform/)
├── apps/
│   ├── api/   (NestJS)
│   │   └── src/modules/
│   │       ├── auth/            ← DIPAKAI BERSAMA (login SSO 3 peran)
│   │       ├── users/           ← DIPAKAI BERSAMA
│   │       ├── master-data/     ← DIPAKAI BERSAMA (+ jam absen, hari libur)†
│   │       ├── materials/       ┐
│   │       ├── exams/           │  domain LMS (sudah ada)
│   │       ├── assignments/     │
│   │       ├── chat/            ┘
│   │       ├── attendance/      ← BARU (QR scan, masuk/keluar, jendela waktu)
│   │       ├── leave-requests/  ← BARU (izin siswa & guru + unggah bukti)
│   │       ├── attendance-reports/ ← BARU (rekap + export PDF)
│   │       └── notifications/   ← BARU/diperluas (email verifikasi & status izin)
│   └── web/   (Next.js)
│       └── app/
│           ├── (lms)/...        ← area LMS
│           └── (absensi)/...    ← area Absensi (scan, izin, rekap)
└── packages/
    └── database/
        └── prisma/schema.prisma ← DIPERLUAS dengan 6 model absensi
```

**Navigasi tunggal berbasis peran (RBAC):** satu app-shell dengan menu yang menampilkan modul LMS dan Absensi sesuai peran user. Menu dinamis lama absen (`user_menu`/`user_access_menu`, dsb.) **tidak dimigrasi** — digantikan RBAC guard di API + policy menu di frontend.

> **Kesesuaian dengan kode (23 September 2026):** struktur di atas adalah **target**. Perbedaan yang ada saat ini:
> - `†` Modul pengelolaan **jam absen & hari libur belum dibuat** (tabel `AttendanceWindow`/`Holiday`/`TeacherSchedule` ada + terisi via ETL, tetapi tanpa controller; belum ada di `master-data`).
> - Modul `chat/` **belum dibuat** (Socket.IO belum ada); `exams/`, `materials/`, `assignments/` sudah ada.
> - Web **tidak** memakai route group `(lms)`/`(absensi)` terpisah, melainkan satu route group `(dashboard)` dengan rute datar (`/dashboard/attendance`, `/dashboard/leave`, `/dashboard/materials`, dst.) dan menu difilter per peran lewat `lib/nav.ts`.
> - Nama folder tetap `learning-rebuild/` (rename ke `sekolah-platform/` belum dilakukan).

---

## 3. Perluasan Skema Database (Model Baru Absensi)

Absensi menambah **6 model** yang berelasi ke `User`/`StudentProfile`/`TeacherProfile`/`Class`/`Major` yang sudah ada. Tidak ada duplikasi entitas user/kelas/jurusan.

| Model baru (Prisma) | Sumber tabel lama absen | Relasi ke schema yang sudah ada |
|---|---|---|
| `AttendanceWindow` | `tabel_jam_absen` | (global) enum `AttendanceType { MASUK, KELUAR, TERLAMBAT }` |
| `TeacherSchedule` | `tabel_jam_absen_guru` | → `TeacherProfile` (per hari: enum `Weekday`) |
| `AttendanceRecord` | `tabel_detail_absen` + `tabel_detail_absen_guru` | → `User` (siswa/guru), `Class`, `Major`; `checkInAt`/`checkOutAt` |
| `LeaveRequest` | `tabel_izin` + `tabel_izin_guru` | → `User` (pemohon) & `User` (pemberi izin); enum `LeaveStatus` |
| `Holiday` | `tabel_libur` | (global) `date` + enum `HolidayType { WEEKEND, OTHER }` |
| `EmailVerificationToken` | menggantikan `kode_unik` (base64 nis=tanggal) | → `User`; token acak + kedaluwarsa |

Contoh penempelan (ilustratif, detail final di update `02-pemetaan-skema-database.md`):

```prisma
enum AttendanceType { MASUK KELUAR TERLAMBAT }
enum AttendanceStatus { HADIR TERLAMBAT ALPA IZIN SAKIT }
enum LeaveStatus { MENUNGGU DITERIMA DITOLAK }
enum HolidayType { WEEKEND OTHER }

model AttendanceRecord {
  id          Int              @id @default(autoincrement())
  userId      Int              @map("user_id")
  user        User             @relation(fields: [userId], references: [id])
  date        DateTime         @db.Date
  checkInAt   DateTime?        @map("check_in_at")
  checkOutAt  DateTime?        @map("check_out_at")
  status      AttendanceStatus
  note        String?          @db.Text
  classId     Int?             @map("class_id")
  majorId     Int?             @map("major_id")
  @@unique([userId, date])
  @@index([date])
  @@map("attendance_records")
}
```

> Karena `User` sudah punya `role`, absensi tidak perlu membedakan tabel siswa/guru — cukup satu `AttendanceRecord` yang berelasi ke `User`, difilter per peran. Ini sekaligus menyelesaikan pemisahan `tabel_detail_absen` vs `tabel_detail_absen_guru`.

---

## 4. Tantangan Inti: Rekonsiliasi User (Orang yang Sama di Dua Database)

Ini adalah **bagian tersulit** dan penentu keberhasilan penggabungan: guru & siswa yang sama muncul di `learning.sql` **dan** `absen.sql`, dengan identitas serta hash password berbeda.

### 4.1 Strategi pencocokan (matching)
Urutan kunci pencocokan siswa: **`nis`** → email → (nama + tgl lahir) sebagai kandidat manual.
Urutan kunci pencocokan guru: **`nik`** → email → (nama) sebagai kandidat manual.

Hasil ETL mengategorikan setiap orang menjadi:
- **Match tegas** → satu `User` dipakai untuk LMS + Absensi (tautkan `legacyId` LMS & id absen di tabel pemetaan).
- **Hanya di LMS** / **hanya di Absen** → buat `User` baru dari sumber tunggal.
- **Ambigu** (mis. NIS beda tapi nama sama, atau email bentrok) → masuk **laporan konflik** untuk konfirmasi sekolah (diperluas di `04-laporan-kualitas-data.md`).

### 4.2 Konflik password (perlu keputusan)
- LMS lama: `sha1` tanpa salt → disimpan di `legacyPasswordSha1`, di-rehash saat login pertama (mekanisme yang sudah ada di `auth`).
- Absen lama: **bcrypt** (`password_hash` PHP) → langsung kompatibel di `passwordHash`.

Untuk user yang match di kedua sistem, satu akun hanya boleh punya satu password. **Kebijakan yang diusulkan (default):** **utamakan hash bcrypt dari absen** (lebih aman) sebagai `passwordHash`; abaikan `legacyPasswordSha1` LMS. Jika user hanya ada di LMS, tetap pakai jalur rehash sha1. Ini perlu **persetujuan sekolah** karena memengaruhi password mana yang berlaku setelah cutover.

### 4.3 Sumber kebenaran (source of truth) untuk data profil
Saat data profil berbeda antar sistem (alamat, telepon, kelas), tentukan prioritas per-field. **Usulan:** kelas/jurusan & data akademik dari **LMS**; nomor telepon/alamat dari sumber yang paling baru diperbarui. Konflik dicatat di laporan.

---

## 5. Urutan ETL Gabungan

ETL LMS dijalankan sebagai **basis** (karena memuat data akademik terkaya), lalu ETL absen **memperkaya & menempel**, bukan membuat user baru bila sudah cocok.

```
[Basis LMS]
school_settings → majors, classes, semesters, subjects
→ users (+ teacher_profiles / student_profiles)  ← membangun peta identitas (NIS/NIK/email → users.id)
→ (materi, ujian, tugas, pesan ... sesuai dok LMS)

[Enrich Absen] — memakai peta identitas di atas
→ upsert users yang HANYA ada di absen (admin/operator, atau orang yang belum ada)
→ merge kelas/jurusan absen yang belum ada
→ attendance_windows, teacher_schedules, holidays
→ attendance_records (resolusi nis/nik → users.id; flag masuk/keluar int → check_in/out)
→ leave_requests (+ salin berkas bukti ke MinIO/S3)
```

Aturan penting: langkah "Enrich Absen" **tidak boleh** menduplikasi user yang sudah dibuat dari LMS — ia melakukan **upsert berdasarkan peta identitas** (4.1).

---

## 6. Dampak ke Modul & UI

### API (NestJS)
- **Dipakai ulang tanpa perubahan besar:** `auth` (tambah dukungan login via NIS untuk siswa & NIK/email untuk guru), `users`, `master-data`.
- **Modul baru:** `attendance`, `leave-requests`, `attendance-reports`, `notifications`.
- **RBAC:** guard peran yang sudah ada dipakai untuk endpoint absensi (mis. hanya ADMIN/OPERATOR yang boleh menjalankan sesi scan; guru/siswa hanya melihat kehadirannya).

### Web (Next.js)
- Satu app-shell, dua area: **LMS** dan **Absensi**, dipisah lewat route group dan menu berbasis peran.
- Halaman scan QR memakai kamera browser (`html5-qrcode`/`@yudiel/react-qr-scanner`) menggantikan `instascan`/`qr-scanner` lama.
- Halaman: scan (operator), riwayat kehadiran (siswa/guru), ajuan & persetujuan izin, rekap + export PDF — **sudah terimplementasi** (lihat tabel status di bawah).
- Halaman **pengaturan jam absen & hari libur** — **belum terimplementasi**. Tabel `AttendanceWindow` (jam masuk/keluar), `Holiday` (hari libur), dan `TeacherSchedule` (jadwal guru) sudah ada di schema dan terisi via ETL, tetapi **belum ada modul/controller API** maupun halaman web-nya; saat ini hanya dapat diubah langsung di database.

#### Status implementasi UI — diverifikasi 23 September 2026

> Build `next build` pada `apps/web` lolos 15 route. Halaman-halaman UI berikut sudah terimplementasi dan fungsional terhadap API:

| Area | Halaman | Keterangan |
|---|---|---|
| Absensi | `/dashboard/attendance` | Tab "QR & Riwayat Saya" — QR pribadi + countdown TTL + tabel riwayat (filter tanggal dari/sampai); tab "Pemindai (Operator)" admin — **pemindai kamera via `html5-qrcode`** (kamera belakang `facingMode: 'environment'`, region 260×260, 10 fps) dengan tombol Buka/Tutup + panel fallback "Input Manual" (tempel payload + jenis absen); tab "Daftar Harian" admin — filter tanggal + kelas, tabel per siswa (Masuk/Keluar/Status) |
| Absensi | `/dashboard/leave` | Form ajuan izin (jenis IZIN/SAKIT/CUTI/DINAS LUAR + tanggal + alasan + upload bukti jpg/png ≤2MB); pesan status; tab "Ajuan Saya" untuk semua peran (tabel + modal detail); tab "Semua Ajuan (Admin)" dengan filter status (Semua/Menunggu/Diterima/Ditolak) + tombol Setujui/Tolak pada ajuan MENUNGGU |

**Komponen UI bersama** di `apps/web/src/components/ui/`: `Card`/`CardHeader`/`CardBody`, `Badge`, `Button` (primary/secondary/ghost/danger), `Spinner`/`PageLoader`, `EmptyState`, `PageHeader`, `Modal`, `DataTable`. Komponen khusus absensi: `components/QrScanner.tsx` (membungkus `html5-qrcode`, mount/unmount stream kamera bersih). Util: `lib/format.ts` (id-ID), `lib/api-files.ts` (`downloadFile()` untuk Blob + `Content-Disposition`).

---

## 7. Rencana Rilis (Menambah Fase ke Roadmap LMS)

Penggabungan tidak menghentikan pekerjaan LMS; modul absensi ditambahkan sebagai fase lanjutan setelah fondasi user/master-data LMS stabil (Fase 2–3 LMS sudah 🟡). Estimasi tambahan **±5–7 minggu**.

| Fase (lanjutan) | Isi | Durasi |
|---|---|---|
| A1 — Perluasan skema + ETL rekonsiliasi | 6 model absensi + logika matching user + laporan konflik | 1–1,5 mgg |
| A2 — Auth multi-identifier | Login siswa via NIS, guru via NIK/email; verifikasi email token baru | 0,5–1 mgg |
| A3 — Absensi inti (QR + kamera + jendela waktu) | Modul paling kritis | 2 mgg |
| A4 — Perizinan (izin + unggah bukti + approval) | siswa & guru | 1–1,5 mgg |
| A5 — Rekap & Export PDF + notifikasi | rekap kehadiran, PDF, email | 1 mgg |

Dapat sebagian diparalelkan dengan fase LMS yang tersisa bila tim cukup.

### Status Implementasi

> Legenda: ✅ Selesai · 🟡 Sebagian · ❌ Belum

| Fase | Status | Bukti |
|---|---|---|
| A1 — Perluasan skema + ETL rekonsiliasi | ✅ Selesai | `schema.prisma` +6 model/+6 enum (valid & di-generate); `src/etl/run-etl-absen.ts` (type-check bersih); dry-run terhadap data nyata: **101 user tergabung**, 3 user baru, 0 konflik email, 4 orphan (data uji). Laporan: `docs/07-laporan-rekonsiliasi-absen.md` |
| A2 — Auth multi-identifier | ✅ Selesai | `auth.service` login kini mendukung NIS (siswa) & **NIK (guru)** selain email/username; `email-verification.service.ts` (token acak `crypto.randomBytes`, kedaluwarsa, sekali pakai) menggantikan `kode_unik`; endpoint `POST /auth/request-verification`, `POST /auth/confirm-verification`, `GET /auth/verify`. Build `tsc` bersih; diuji runtime terhadap DB gabungan: login-by-NIK ✅, aktivasi via token ✅, reuse/bogus token ditolak ✅ |
| A3 — Absensi inti (QR) | ✅ Selesai | Modul `attendance` (service+controller+module) terpasang di `app.module`. Endpoint: `GET /attendance/my-qr`, `GET /attendance/qr/:userId` (admin), `POST /attendance/scan` (admin), `GET /attendance/my-history`, `GET /attendance/daily` (admin). Fitur: QR payload **ter-tandatangan HMAC** + kedaluwarsa (ganti QR NIS polos), validasi jendela waktu (MASUK→HADIR / TERLAMBAT→TERLAMBAT / KELUAR), pengecualian hari libur, idempoten 1 record/hari (checkInAt/checkOutAt). Build bersih; diuji runtime: scan MASUK=HADIR ✅, double-scan ditolak ✅, KELUAR luar-jendela ditolak ✅, KELUAR dalam-jendela ✅, QR palsu/kedaluwarsa ditolak ✅, libur ditolak ✅, non-admin 403 ✅. DB dikembalikan ke keadaan pasca-A1. |
| A4 — Perizinan | ✅ Selesai | Modul `leave-requests` (service+controller+module) di `app.module`; berkas statis `/uploads/*` di `main.ts`. Endpoint: `POST /leave-requests` (ajuan + unggah bukti), `GET /leave-requests/mine`, `GET /leave-requests` (admin, filter status), `GET /leave-requests/:id`, `PATCH /leave-requests/:id/approve|reject` (admin). Fitur: satu tabel `LeaveRequest` untuk siswa & guru; unggah bukti **jpg/jpeg/png ≤2MB divalidasi server** (Multer diskStorage); alur MENUNGGU→DITERIMA/DITOLAK; izin DITERIMA menulis `AttendanceRecord` (IZIN/SAKIT) pada tanggal terkait. Build bersih; diuji runtime: ajuan+bukti ✅, tolak format .txt ✅, RBAC 403 siswa→list admin ✅, approve→SAKIT tercatat ✅, double-process ditolak ✅, reject tak buat record ✅, unduh bukti statis HTTP 200 ✅. DB dikembalikan ke keadaan pasca-A1. |
| A5 — Rekap & Export + notifikasi | ✅ Selesai | Modul `attendance-reports` (`GET /attendance-reports/recap` JSON + `GET /attendance-reports/recap.pdf`, admin-only) menghitung rekap per bulan/tahun + filter kelas/jurusan (H/T/I/S/A + total), export **PDF via PDFKit** (streaming, tanpa headless browser, ganti dompdf). Modul `notifications` (`@Global`, **nodemailer**; SMTP nyata bila `SMTP_HOST` diset, jsonTransport dev-log bila tidak) terintegrasi ke verifikasi email (kirim tautan aktivasi) & keputusan izin (notif DITERIMA/DITOLAK). Build bersih; diuji runtime: recap JSON akurat (18 rec → 6/3/3/3/3) ✅, PDF valid `%PDF` 1 halaman ✅, RBAC admin-only 403 ✅, email verifikasi ter-log ✅, email keputusan izin ter-log ✅. Env baru di `.env.example` (QR_SECRET, MAIL_*/SMTP_*). DB dikembalikan ke keadaan pasca-A1. Catatan: penyimpanan bukti masih disk lokal — migrasi ke MinIO/S3 diserahkan sebagai penukaran konfigurasi lanjutan. |

**Cara menjalankan ETL absen:**
```bash
# dari packages/database (butuh Postgres berisi hasil ETL LMS + MySQL berisi dump absen)
pnpm etl:absen:dry-run   # simulasi + laporan rekonsiliasi (tidak menulis)
pnpm db:push             # terapkan 6 tabel absensi baru ke Postgres (sekali)
pnpm etl:absen           # muat data absensi ke Postgres
```

---

## 8. Risiko Khusus Penggabungan & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Salah cocok identitas (NIS/NIK beda format) | User ganda / kehadiran nyasar | Pencocokan berlapis + laporan konflik + konfirmasi sekolah sebelum load final |
| Konflik password LMS(sha1) vs Absen(bcrypt) | User bingung password mana | Kebijakan "utamakan bcrypt" disetujui di awal + jalur reset password |
| Email bentrok antar 4 sumber login | Gagal buat `users` unik | Deteksi dini di ETL dry-run; resolusi manual |
| Ruang lingkup membengkak (dua domain jadi satu) | Jadwal molor | Fasekan absensi setelah fondasi LMS stabil; jaga modul tetap terpisah di dalam monorepo |
| Regressi pada modul LMS yang sudah jalan | Fitur LMS rusak | Model absensi hanya menambah relasi (aditif); jalankan test LMS yang ada sebelum & sesudah migrasi schema |

---

## 9. Keputusan yang Perlu Dikonfirmasi

1. **Setuju satu aplikasi & satu akun (SSO)** untuk LMS + Absensi? (inti dari permintaan ini)
2. **Kebijakan password** untuk user yang ada di kedua sistem: utamakan bcrypt (absen)? 
3. **Aturan pencocokan** siswa (kunci `nis`) & guru (kunci `nik`), dan penanganan kasus ambigu.
4. **Sumber kebenaran per-field** saat profil berbeda (kelas/jurusan/telepon/alamat).
5. Apakah repo di-*rename* menjadi `sekolah-platform/` atau tetap `learning-rebuild/`.

---

## 10. Kesimpulan

Menjadikan `learning` dan `absen` **satu aplikasi bukan hanya mungkin, tetapi arsitektur yang paling tepat**: keduanya melayani sekolah yang sama, dengan orang & master data yang sama, menuju stack yang sama. Fondasi (`User`, profil, `Class`, `Major`, `SchoolSetting`, RBAC) **sudah ada** di `learning-rebuild`; absensi cukup menambah 6 model domain dan 4 modul API, dengan **rekonsiliasi user sebagai pekerjaan kunci**. Rekomendasi: **batalkan rencana repo `absen-rebuild/` terpisah** dan jalankan penggabungan ini sebagai fase lanjutan (A1–A5) pada monorepo yang sudah berjalan.
