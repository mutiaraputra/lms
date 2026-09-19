# Laporan Kualitas Data & Migrasi ETL

- **Tanggal Pelaksanaan:** 2026-09-19T13:36:15.992Z
- **Mode:** LIVE WRITE (Berhasil Dimuat ke PostgreSQL 16)

## 1. Temuan Duplikasi Data (Deduplikasi Siswa)
Ditemukan 6 data duplikasi pada `tb_siswa`:
- **NIS 20408**: ID lama 230 diselaraskan ke profil aktif ID 236.
- **NIS 20415**: ID lama 222 diselaraskan ke profil aktif ID 237.
- **NIS 20423**: ID lama 220 diselaraskan ke profil aktif ID 242.
- **NIS 20408**: ID lama 236 diselaraskan ke profil aktif ID 243.
- **NIS 220401**: ID lama 244 diselaraskan ke profil aktif ID 257.
- **NIS 220422**: ID lama 271 diselaraskan ke profil aktif ID 296.

## 2. Temuan Data Yatim (Orphan Records) & Penanganannya
Ditemukan 29 data lama yang referensinya tidak lengkap namun **tetap diselamatkan (zero data loss)** melalui entitas arsip:
- Guru dengan legacy ID 7 tidak ada di tb_guru -> Dibuat profil guru arsip placeholder
- Kelas legacy #13 tidak ada di tb_master_kelas -> Dibuat Kelas Arsip #13
- Jurusan legacy #6 tidak ada di tb_master_jurusan -> Dibuat Jurusan Arsip #6
- Ujian legacy #11 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #12 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #13 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #16 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #17 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #18 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #19 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #20 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #21 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #22 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #24 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #25 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #26 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #28 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Ujian legacy #29 tidak ditemukan di tabel ujian -> Dibuat record Ujian Arsip
- Siswa dengan legacy ID 1 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 2 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 201 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 203 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 202 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 212 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 211 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 213 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 253 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 21 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder
- Siswa dengan legacy ID 22 tidak ada di tb_siswa -> Dibuat profil siswa arsip placeholder

## 3. Status Penyelesaian Migrasi
- Skema PostgreSQL 16 & Prisma: **SINKRON & VALID**
- Normalisasi tabel nilai & jawaban ujian: **100% TERURAI KE EXAM_ANSWERS**
- Rehash password strategi legacy: **TERPASANG (SHA1 tersimpan di legacy_password_sha1, siap rehash ke Argon2 saat login pertama)**
