# Rencana Migrasi — Rebuild LMS SMK Nagara

> Dokumen ini adalah **rencana migrasi** dari aplikasi LMS PHP lama (folder `learning/`) menuju arsitektur modern **API-first** (Next.js + NestJS + Prisma + PostgreSQL). Dokumen berfokus pada *urutan pekerjaan, strategi migrasi data, risiko, dan cutover* — bukan implementasi kode.

- **Versi dokumen:** 1.1
- **Tanggal:** 19 September 2026 (status implementasi diperbarui 20 September 2026)
- **Status:** Disetujui — dalam pelaksanaan
- **Sumber analisa:** `learning/` (±539 file PHP, ±132.000 baris) dan dump `learning.sql` (25 tabel)

---

## 0. Status Implementasi (Ringkasan)

> Legenda: ✅ Selesai · 🟡 Sebagian · ❌ Belum dikerjakan

| Fase | Status | Catatan singkat |
|---|---|---|
| 0 — Fondasi | ✅ Selesai | Monorepo pnpm, Docker Compose (PostgreSQL + Redis + MinIO), env terpisah |
| 1 — Skema DB + ETL | ✅ Selesai | Prisma schema lengkap 25 tabel + FK; skrip ETL 13 langkah (dedup, pecah CSV, orphan handling, laporan kualitas data) |
| 2 — Auth & Users | 🟡 Sebagian | Login 3 role + JWT + RBAC guard + rehash SHA1→bcrypt otomatis + konfirmasi/status akun **selesai**; **refresh token belum** ada |
| 3 — Master Data & Teaching Assignments | 🟡 Sebagian | Endpoint **read-only** master data selesai; CRUD tulis (POST/PUT/DELETE) dan endpoint teaching-assignments **belum** (data sudah dimigrasi via ETL) |
| 4 — Materi & Perangkat Ajar | 🟡 Sebagian | Materi (list/detail) + tandai-baca selesai; **upload berkas / integrasi MinIO** dan **modul perangkat ajar (teaching-kits)** di API **belum** |
| 5 — Ujian Objektif | 🟡 Sebagian | Ambil ujian + penilaian otomatis selesai; **timer server-side (WebSocket + Redis)** dan **CRUD bank soal / pembuatan ujian** **belum** |
| 6 — Ujian Essay & Tugas | ❌ Belum | Model & ETL ada; modul API (controller/service) belum |
| 7 — Nilai/Laporan & Export | ❌ Belum | Belum dikerjakan |
| 8 — Chat Real-time | ❌ Belum | Model & ETL `messages` ada; gateway Socket.IO belum |
| 9 — Hardening, UAT & Cutover | ❌ Belum | Panduan tersedia di `05-panduan-operasional-dan-cutover.md` |

**Modul NestJS yang sudah ada:** `auth`, `users`, `master-data`, `materials`, `exams`.
**Belum dibuat sebagai modul API:** `teaching-assignments`, `teaching-kits`, `essay-exams`, `assignments`, `grading/reports`, `chat`.

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

### Fase 0 — Persiapan & Fondasi (1–2 minggu) — ✅ SELESAI
- Setup monorepo (NestJS API + Next.js web + Prisma), Docker Compose (PostgreSQL, Redis, MinIO).
- CI/CD, linting, format, `.env`/secrets (hapus kredensial hardcoded seperti di `config/db.php`).
- Environment: `dev`, `staging`, `prod`.
- Ambil salinan dump `learning.sql` + arsip berkas `vendor/file/` & `vendor/images/`.
- **DoD:** `docker compose up` menjalankan seluruh stack kosong; pipeline CI hijau.

### Fase 1 — Skema DB Baru + Kerangka ETL (1–2 minggu) — ✅ SELESAI
- Definisikan Prisma schema ternormalisasi (users + profiles, master data, teaching_assignments, materials, exams/questions/options, attempts/answers, assignments/submissions, messages, school_settings).
- Tambahkan **foreign key**, index, dan tipe data benar (int untuk id_ujian, `NULL`-able date, dsb.).
- Bangun kerangka **skrip ETL** (Node/TS) yang membaca dump lama → transform → tulis ke DB baru, dengan:
  - Tabel pemetaan ID lama→baru (untuk menjaga relasi).
  - Log validasi (orphan, duplikat, data rusak) → laporan CSV.
- **DoD:** migrasi Prisma jalan; ETL dry-run menghasilkan laporan kualitas data tanpa menulis.

### Fase 2 — Auth & Users (2 minggu) — 🟡 SEBAGIAN
- Endpoint login untuk 3 role, JWT access+refresh, RBAC guard.
- **Migrasi data user:** `tb_admin`/`tb_guru`/`tb_siswa` → `users` + profil.
  - Simpan `legacy_password_sha1`.
  - Login pertama: verifikasi `sha1(input) == legacy` → jika cocok, set `password_hash` (argon2/bcrypt) dan kosongkan legacy.
  - Petakan `status`/`confirm`/`aktif` → kolom status akun terpadu.
  - Jalankan **deduplikasi siswa** + serahkan laporan ke sekolah untuk konfirmasi.
- **DoD:** semua user existing bisa login dengan password lama; password ter-upgrade otomatis; admin bisa konfirmasi/nonaktifkan akun.
- **Status:** Login 3 role + JWT + RBAC guard ✅, rehash SHA1→bcrypt saat login pertama ✅, konfirmasi/nonaktif akun oleh admin ✅. **Belum:** refresh token (baru access token).

### Fase 3 — Master Data & Teaching Assignments (1–2 minggu) — 🟡 SEBAGIAN
- CRUD: kelas, jurusan, semester, mapel, jenis ujian/perangkat/tugas.
- Migrasi `tb_roleguru` → `teaching_assignments` (pivot penting untuk fase berikutnya).
- **DoD:** jumlah & isi master data identik dengan lama; penugasan guru cocok 1:1.
- **Status:** Migrasi `tb_roleguru` → `teaching_assignments` via ETL ✅, endpoint **read-only** master data (kelas/jurusan/semester/mapel/sekolah) ✅. **Belum:** CRUD tulis (POST/PUT/DELETE) master data dan endpoint API teaching-assignments.

### Fase 4 — Materi & Perangkat Ajar (1–2 minggu) — 🟡 SEBAGIAN
- Modul materi (teks + berkas) dan perangkat ajar; log baca materi.
- **Migrasi berkas:** pindahkan `vendor/file/*` ke object storage (MinIO/S3), perbarui path di `materials`/`teaching_kits`.
- Validasi ekstensi & ukuran di sisi server (menggantikan pengecekan lemah di `models.php`).
- **DoD:** materi & perangkat lama dapat diunduh; log baca termigrasi.
- **Status:** Modul materi (list/detail) + tandai-baca ✅, migrasi log baca via ETL ✅. **Belum:** upload berkas + integrasi object storage (MinIO/S3), validasi ekstensi/ukuran sisi server, dan modul perangkat ajar (teaching-kits) di API.

### Fase 5 — Ujian Objektif (3 minggu) — modul paling kompleks — 🟡 SEBAGIAN
- Bank soal (`questions` + `question_options`), pengacakan, pembukaan per kelas (`exam_classes`).
- **Pengerjaan ujian dengan timer server-side** via WebSocket + Redis (memperbaiki bug waktu lokal & `sisa_waktu > 24 jam`).
- Penilaian otomatis (benar/salah/kosong, skor), analisis per soal.
- **Migrasi data `nilai` + `analisis`:** pecah CSV `acak_soal`/`jawaban` → `exam_attempts` + `exam_answers`; hitung ulang & bandingkan dengan `jml_benar`/`nilai` lama sebagai validasi.
- **DoD:** skor hasil migrasi cocok dengan data lama; simulasi ujian serentak (load test) stabil.
- **Status:** Ambil ujian (kunci jawaban disembunyikan untuk siswa) + penilaian otomatis (benar/salah/kosong, skor) ✅, migrasi `nilai`/`analisis` dengan pemecahan CSV → `exam_attempts`+`exam_answers` via ETL ✅. **Belum:** timer server-side (WebSocket + Redis), CRUD bank soal/pembuatan ujian, dan load test ujian serentak.

### Fase 6 — Ujian Essay & Tugas (2 minggu) — ❌ BELUM
- Ujian essay + penilaian manual guru.
- Tugas: pembuatan, pembukaan per kelas, pengumpulan berkas siswa, penilaian.
- Migrasi `ujian_essay`, `tb_tugas`, `kelas_tugas`, `tugas_siswa` (+ berkas ke object storage).
- **DoD:** guru dapat menilai; submission historis termigrasi & dapat diunduh.
- **Status:** Model Prisma (`essay_exams`, `assignments`, dst.) + migrasi data via ETL ✅. **Belum:** modul API (controller/service) essay-exams & assignments.

### Fase 7 — Nilai/Laporan & Export (1–2 minggu) — ❌ BELUM
- Rekap nilai per kelas/mapel/semester (menggantikan folder `Report/`).
- Export PDF (rapor/rekap) via Puppeteer/react-pdf.
- **DoD:** angka laporan cocok dengan perhitungan lama; export PDF benar.

### Fase 8 — Chat Real-time (1 minggu) — ❌ BELUM
- Pesan real-time (Socket.IO), status dibaca/belum.
- Migrasi `pesan` dengan resolusi pengirim/penerima ke `users.id`; baris tak-terpetakan diarsip.
- **DoD:** chat berjalan real-time; riwayat termigrasi sebisa mungkin.
- **Status:** Model `messages` + migrasi (resolusi pengirim/penerima ke `users.id`) via ETL ✅. **Belum:** gateway Socket.IO & status dibaca real-time.

### Fase 9 — Hardening, UAT & Cutover (2 minggu) — ❌ BELUM
- Audit keamanan (rate-limit, validasi input menyeluruh, header, CORS, RBAC edge cases).
- UAT bersama guru/admin/siswa perwakilan.
- **Cutover** (lihat bagian 9).

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

1. **Persetujuan dokumen ini** (terutama: pilihan PostgreSQL vs MySQL, aturan deduplikasi siswa, window cutover).
2. Lanjut ke **Dokumen 1 — Pemetaan Skema Database** (Prisma schema detail dari 25 tabel di atas).
3. Lanjut ke **Dokumen 2 — Scaffolding Proyek** (struktur monorepo siap jalan).

> Keputusan yang perlu dikonfirmasi pihak sekolah/pemangku kepentingan:
> - Setuju pindah ke stack TypeScript (Next.js/NestJS) atau memilih alternatif Laravel single-stack?
> - Target database final: PostgreSQL 16 atau tetap MySQL 8?
> - Aturan penanganan data siswa duplikat dan pesan yang tak terpetakan.
> - Jadwal window maintenance untuk cutover.
