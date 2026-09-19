-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Waktu pembuatan: 07 Jan 2026 pada 08.59
-- Versi server: 8.0.42
-- Versi PHP: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `absen`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `login_guru`
--

CREATE TABLE `login_guru` (
  `id` int NOT NULL,
  `nik_guru` varchar(110) NOT NULL,
  `email` varchar(110) NOT NULL,
  `password` varchar(110) NOT NULL,
  `is_active` int NOT NULL,
  `kode_unik` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `login_guru`
--

INSERT INTO `login_guru` (`id`, `nik_guru`, `email`, `password`, `is_active`, `kode_unik`) VALUES
(1, '1834022', 'hernady@smknagara.id', '$2y$10$v6lQxmkazEfkdFNK4N4Kdeyd2pCiKeEhKjZjq0BV.uf/aKRiS.Xc2', 1, 'k');

-- --------------------------------------------------------

--
-- Struktur dari tabel `login_siswa`
--

CREATE TABLE `login_siswa` (
  `id` int NOT NULL,
  `nis_siswa` varchar(110) NOT NULL,
  `email` varchar(110) NOT NULL,
  `password` varchar(110) NOT NULL,
  `is_active` int NOT NULL,
  `kode_unik` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `login_siswa`
--

INSERT INTO `login_siswa` (`id`, `nis_siswa`, `email`, `password`, `is_active`, `kode_unik`) VALUES
(1, '', 'hernady@smknagara.id', '$2y$10$vQzKvxXje2Ebc0RZyNCjY.jJMrYpr7FrMWKKFOKFGzIv6ylxwsJTq', 1, 'k'),
(2, '20412', 'm@a.com', '$2y$10$qTapVZf12vF03AhfVIu1POsT.pQ5n55tpQD/QxImVHTRVnBz1mTay', 1, 'k'),
(3, '256566', 'afif@smknagara.id', '$2y$10$lBeE1AwTgVIU/oPqO9E0guj0man95SXyZNXdsdqQNX5dZ4p2UIrDe', 1, 'k');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_detail_absen`
--

CREATE TABLE `tabel_detail_absen` (
  `id_detail` int NOT NULL,
  `jam_absen` time DEFAULT NULL,
  `tanggal_absen` date DEFAULT NULL,
  `nis` varchar(12) DEFAULT NULL,
  `keterangan` text,
  `kode_kelas` int NOT NULL,
  `kode_jurusan` int NOT NULL,
  `masuk` int NOT NULL,
  `keluar` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_detail_absen`
--

INSERT INTO `tabel_detail_absen` (`id_detail`, `jam_absen`, `tanggal_absen`, `nis`, `keterangan`, `kode_kelas`, `kode_jurusan`, `masuk`, `keluar`) VALUES
(1, '11:43:56', '2024-11-12', '256566', 'h', 14, 7, 1, 0),
(2, '13:03:08', '2024-11-13', '256566', 'h', 14, 7, 1, 0),
(3, '19:00:17', '2024-11-13', '20412', 'h', 22, 10, 1, 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_detail_absen_guru`
--

CREATE TABLE `tabel_detail_absen_guru` (
  `id_detail` int NOT NULL,
  `jam_absen` time DEFAULT NULL,
  `tanggal_absen` date DEFAULT NULL,
  `nik` varchar(12) DEFAULT NULL,
  `keterangan` text,
  `ket_absen` text NOT NULL,
  `masuk` int NOT NULL,
  `keluar` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_detail_absen_guru`
--

INSERT INTO `tabel_detail_absen_guru` (`id_detail`, `jam_absen`, `tanggal_absen`, `nik`, `keterangan`, `ket_absen`, `masuk`, `keluar`) VALUES
(1, '14:31:14', '2025-08-10', '1834022', 'h', '', 1, 0),
(2, '16:39:56', '2025-08-05', '123456', 'h', '', 1, 0),
(3, '16:59:24', '2025-08-05', '4', 'h', '', 1, 0),
(4, '17:00:03', '2025-08-05', '4', 'h', '', 1, 0),
(5, '17:01:32', '2025-08-05', '4', 'h', '', 1, 0);

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_guru`
--

CREATE TABLE `tabel_guru` (
  `id_guru` int NOT NULL,
  `nama_guru` text,
  `nik` varchar(12) DEFAULT NULL,
  `tgl_lahir` date NOT NULL,
  `jenis_kelamin` text,
  `alamat` varchar(200) DEFAULT NULL,
  `no_telepon` varchar(15) DEFAULT NULL,
  `gambar` varchar(70) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_guru`
--

INSERT INTO `tabel_guru` (`id_guru`, `nama_guru`, `nik`, `tgl_lahir`, `jenis_kelamin`, `alamat`, `no_telepon`, `gambar`) VALUES
(42, 'AGUNG WDODO, ST', '1834001', '0000-00-00', '', '', '', 'favicon.png'),
(43, 'AGUS SUSANTO, S.Pd.I', '1834002', '0000-00-00', '', '', '', 'favicon.png'),
(44, 'ANIK YULAIKAH, S.Pd', '1834003', '0000-00-00', '', '', '', 'favicon.png'),
(45, 'ARIF ZAINUDIN, S.Pd', '1834004', '0000-00-00', '', '', '', 'favicon.png'),
(46, 'BUDI SANTOSO, S.Sn', '1834005', '0000-00-00', '', '', '', 'favicon.png'),
(47, 'DAPRI, S.Kom', '1834006', '0000-00-00', '', '', '', 'favicon.png'),
(48, 'LIK USWATIN, S.Ag', '1834010', '0000-00-00', '', '', '', 'favicon.png'),
(49, 'M. JUAINI ARROZAQI, S.Pd', '1834011', '0000-00-00', '', '', '', 'favicon.png'),
(50, 'MISBAHUL MUNIF, S.Pd', '1834012', '0000-00-00', '', '', '', 'favicon.png'),
(51, 'MUCHTAR NASRUDIN, S.Pd', '1834013', '0000-00-00', '', '', '', 'favicon.png'),
(52, 'NURIA UTAMI, S.Pd', '1834014', '0000-00-00', '', '', '', 'favicon.png'),
(53, 'NURUL IRMA NINGSIH, S.Pd', '1834015', '0000-00-00', '', '', '', 'favicon.png'),
(54, 'Dra. SUNARI', '1834018', '0000-00-00', '', '', '', 'favicon.png'),
(55, 'FASHAH NUR HUDA', '1834019', '0000-00-00', '', '', '', 'favicon.png'),
(56, 'GONDO BAKTI WIYONO, S.Ag', '1834020', '0000-00-00', '', '', '', 'favicon.png'),
(57, 'HENDRO ARI BOWO, ST', '1834021', '0000-00-00', '', '', '', 'favicon.png'),
(58, 'HERNADY KURNIAWAN, S.Kom', '1834022', '0000-00-00', '', '', '', 'favicon.png'),
(59, 'HIDIYAH NUR AININGTYAS, S.Pd', '1834023', '0000-00-00', '', '', '', 'favicon.png'),
(60, 'LATIP, ST', '1834025', '0000-00-00', '', '', '', 'favicon.png'),
(61, 'PRABOWO, ST', '1834027', '0000-00-00', '', '', '', 'favicon.png'),
(62, 'PURNOMO SIGIT, ST', '1834028', '0000-00-00', '', '', '', 'favicon.png'),
(63, 'RINA YULIATI, S.Sos', '1834029', '0000-00-00', '', '', '', 'favicon.png'),
(64, 'RISNAWATI, S.Pd', '1834030', '0000-00-00', '', '', '', 'favicon.png'),
(65, 'SUMADI, S.Pd., S.Kom', '1834032', '0000-00-00', '', '', '', 'favicon.png'),
(66, 'WASIS EGUH P, S.Pd', '1834034', '0000-00-00', '', '', '', 'favicon.png'),
(67, 'WIWID DINUGRAHANI, S.Pd', '1834035', '0000-00-00', '', '', '', 'favicon.png'),
(68, 'FATKUR RIZA, S.Pd', '1834036', '0000-00-00', '', '', '', 'favicon.png'),
(69, 'Naim, S.Pd', '1834037', '0000-00-00', '', '', '', 'favicon.png'),
(70, 'Haris, S.Pd.I', '1834038', '0000-00-00', '', '', '', 'favicon.png'),
(1234, 'MDS', '123456', '1980-08-20', 'Laki-laki', 'Jogorogo', '111111111', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_izin`
--

CREATE TABLE `tabel_izin` (
  `id` int NOT NULL,
  `nis_siswa` varchar(100) NOT NULL,
  `type` varchar(100) NOT NULL,
  `file_bukti` varchar(100) NOT NULL,
  `keterangan` varchar(100) NOT NULL,
  `tanggal_izin` date NOT NULL,
  `status` enum('Diterima','Ditolak','Menunggu Konfirmasi') NOT NULL,
  `pemberi_izin` varchar(110) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_izin`
--

INSERT INTO `tabel_izin` (`id`, `nis_siswa`, `type`, `file_bukti`, `keterangan`, `tanggal_izin`, `status`, `pemberi_izin`) VALUES
(1, '1234567891', 'Sakit', 'izin-1234567891-2024-09-07.png', 'berdasarkan surat ijin dari dokter Ratna nomor 1125254 tanggal 02-09-2024', '2024-09-02', 'Diterima', '');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_izin_guru`
--

CREATE TABLE `tabel_izin_guru` (
  `id` int NOT NULL,
  `nik_guru` varchar(100) NOT NULL,
  `type` varchar(100) NOT NULL,
  `file_bukti` varchar(100) NOT NULL,
  `keterangan` varchar(100) NOT NULL,
  `tanggal_izin` date NOT NULL,
  `status` enum('Diterima','Ditolak','Menunggu Konfirmasi') NOT NULL,
  `pemberi_izin` varchar(110) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_jam_absen`
--

CREATE TABLE `tabel_jam_absen` (
  `id` int NOT NULL,
  `type` enum('Masuk','Keluar','Terlambat') NOT NULL,
  `mulai` time NOT NULL,
  `selesai` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_jam_absen`
--

INSERT INTO `tabel_jam_absen` (`id`, `type`, `mulai`, `selesai`) VALUES
(1, 'Masuk', '00:07:00', '18:00:00'),
(2, 'Keluar', '18:00:01', '20:00:00'),
(3, 'Terlambat', '07:15:00', '20:00:00');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_jam_absen_guru`
--

CREATE TABLE `tabel_jam_absen_guru` (
  `id` int NOT NULL,
  `nik` varchar(12) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  `mulai` time NOT NULL,
  `selesai` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `tabel_jam_absen_guru`
--

INSERT INTO `tabel_jam_absen_guru` (`id`, `nik`, `hari`, `mulai`, `selesai`) VALUES
(1, '1834022', 'Rabu', '07:35:00', '14:45:00'),
(3, '123456', 'Rabu', '12:10:00', '15:00:00');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_jurusan`
--

CREATE TABLE `tabel_jurusan` (
  `id_jurusan` int NOT NULL,
  `jurusan` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_jurusan`
--

INSERT INTO `tabel_jurusan` (`id_jurusan`, `jurusan`) VALUES
(1, 'TKJ'),
(2, 'TITL'),
(3, 'TBSM'),
(7, 'Teknik Istalasi Tenaga Listrik'),
(8, 'Teknik Kendaraan Ringan'),
(9, 'Teknik Bisnis Sepeda Motor'),
(10, 'Teknik Komputer Jaringan');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_kelas`
--

CREATE TABLE `tabel_kelas` (
  `id_kelas` int NOT NULL,
  `nama_kelas` varchar(100) DEFAULT NULL,
  `kelas` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_kelas`
--

INSERT INTO `tabel_kelas` (`id_kelas`, `nama_kelas`, `kelas`) VALUES
(1, 'X TITL', 'X TITL'),
(2, 'X TKJ', 'X TKJ'),
(3, 'XI TKJ', 'XI TKJ'),
(4, 'XII TKJ', 'XII TKJ'),
(14, '0', 'XA'),
(15, '0', 'XB'),
(16, '0', 'XC'),
(17, '0', 'XD'),
(18, '0', 'XE'),
(19, '0', 'XF'),
(20, '0', 'XG'),
(21, '0', 'XIIF'),
(22, '0', 'XIG');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_libur`
--

CREATE TABLE `tabel_libur` (
  `id` int NOT NULL,
  `type` enum('weekend','other') NOT NULL,
  `tanggal` varchar(110) NOT NULL,
  `keterangan` varchar(100) NOT NULL,
  `status` enum('Aktif','Non Aktif') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_libur`
--

INSERT INTO `tabel_libur` (`id`, `type`, `tanggal`, `keterangan`, `status`) VALUES
(0, 'other', '2024-09-16', 'Maulid', 'Aktif');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_siswa`
--

CREATE TABLE `tabel_siswa` (
  `id_siswa` int NOT NULL,
  `nama_siswa` text,
  `nis` varchar(12) DEFAULT NULL,
  `tgl_lahir` date NOT NULL,
  `jenis_kelamin` text,
  `alamat` varchar(200) DEFAULT NULL,
  `no_telepon` varchar(15) DEFAULT NULL,
  `kode_jurusan` varchar(15) DEFAULT NULL,
  `kode_kelas` varchar(15) DEFAULT NULL,
  `gambar` varchar(70) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_siswa`
--

INSERT INTO `tabel_siswa` (`id_siswa`, `nama_siswa`, `nis`, `tgl_lahir`, `jenis_kelamin`, `alamat`, `no_telepon`, `kode_jurusan`, `kode_kelas`, `gambar`) VALUES
(214, 'AFIF CAHYO JULIANTO', '256566', '0000-00-00', 'L', '', '', '7', '14', 'default.png'),
(215, 'Ahmad Baidawi', '20401', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(216, 'salsabila putri hermawan', '20422', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(218, 'PUTRI ARDITA', '20414', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(219, 'Ilham Fauzi ', '20411', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(220, 'Siti ngaisah', '20423', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(221, 'Mega Anggun Lestari', '20412', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(222, 'RAHAYU PUSPITA KUSUMA NINGRUM ', '20415', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(223, 'SAFIRA DYAH MUSTIKA AYU', '20421', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(225, 'Syachrul Mubarok', '20424', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(227, 'Ferdy Setiawan', '20409', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(228, 'Tufail Ghazwan As Salsabil', '20425', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(229, 'Riyan widjayanto', '20420', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(230, 'Farid ansori', '20408', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(231, 'Bayu Setyo Purnomo', '20404', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(232, 'Ardi Prismawardani', '20403', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(233, 'Reno Rahmad Ricardo', '20417', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(234, 'Erik Tri Prasetyo ', '20407', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(235, 'Wibi bayu anggoro', '20426', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(236, 'Farid ansori', '20408', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(237, 'RAHAYU PUSPITA KUSUMA NINGRUM ', '20415', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(240, 'fina serliana', '20410', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(241, 'nisa isrofah', '20413', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(242, 'Siti ngaisah', '20423', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(243, 'Farid ansori', '20408', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(244, 'AHMAD SAIFUL ROHMAN', '220401', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(245, 'Tisia berliana', '220420', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(246, 'Yusuf Al Baihaqi ', '220424', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(247, 'Fara Dwi lestari', '220408', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(248, 'Savera Nur Laily Masruroh', '220417', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(249, 'DITA TRIANINGTYAS', '220407', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(250, 'Octavia tri ramadhani', '220413', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(251, 'Daffa zaldi pratama', '220404', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(252, 'Danissa shela cinta sejati', '220406', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(254, 'Merlina eka purnamasari', '220410', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(255, 'Rosa sekarsari', '220416', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(256, 'Chandra Wibowo Dwijayanto', '220403', '0000-00-00', 'L', '', '', '10', '20', 'images.jpg'),
(257, 'ZAKI ABRAR PANGESTU', '220401', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(258, 'Damar Aziz Setiawan ', '220405', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(259, 'WAHYU SATRIO WIBOWO ', '220421', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(260, 'Richo aditya', '220414', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(261, 'IKIN ARIFUDIN', '220409', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(262, 'Yunita anggun putri maharani', '220423', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(265, 'Septiana ayu verdiana putri', '220418', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(267, 'Mutiah puji astuti', '220412', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(271, 'Windi febriana', '220422', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(272, 'MIYA ELSA SAFIRA', '210410', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(273, 'BAGAS ADITYA TRI NUGRAHA', '210407', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(275, 'MADA ABHINAYA RAHMADANI', '210409', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(276, 'TULUS ADI CAHYONO', '210419', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(277, 'RENDY KURNIA RAMADHANI', '210414', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(278, 'RIAS AMIRI', '210415', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(279, 'SATRIA GILANG RAMADHAN', '210416', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(280, 'AYU NINGRUM', '210406', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(281, 'ANIK SUSILO WATI', '210404', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(282, 'NINA APRELIA', '210412', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(283, 'WAHYU INTAN SELFIANA', '210420', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(284, 'AFIZA WANUR MACHUZHI', '210423', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(285, 'SHINTYA NUR KHOTIMAH', '210418', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(286, 'AKHYARU ADIB AL', '210422', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(287, 'AGUNG WIDODO', '210402', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(288, 'muhamad farid alfauzi', '210411', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(289, 'RIFKY WAHYU PRASETYO', '210421', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(290, 'APRIZHA FEBRI SETIAWAN', '210405', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(292, 'NOVI ERI ISYANA', '210413', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(293, 'septi fardilla', '210417', '0000-00-00', 'P', '', '', '10', '22', 'default.png'),
(294, 'Andika Rivandi', '210403', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(295, 'AGASTYAN EKA PRAMADA', '210401', '0000-00-00', 'L', '', '', '10', '22', 'default.png'),
(296, 'Windi febriana', '220422', '0000-00-00', 'P', '', '', '10', '20', 'default.png'),
(299, 'muhammad aziz fatrurrohim', '220411', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(301, 'anton febrianto', '220402', '0000-00-00', 'L', '', '', '10', '20', 'default.png'),
(302, 'ilmia nur janah', '210408', '0000-00-00', 'P', '', '', '10', '22', 'default.png');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_user`
--

CREATE TABLE `tabel_user` (
  `id` int NOT NULL,
  `name` varchar(128) DEFAULT NULL,
  `email` varchar(128) DEFAULT NULL,
  `password` varchar(128) DEFAULT NULL,
  `image` varchar(128) DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `is_active` int DEFAULT NULL,
  `date_create` date DEFAULT NULL,
  `kode_unik` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_user`
--

INSERT INTO `tabel_user` (`id`, `name`, `email`, `password`, `image`, `role_id`, `is_active`, `date_create`, `kode_unik`) VALUES
(1, 'Andy', 'a@a.com', '$2y$10$E2agyoQMU4qj6IlkEUrG0uzznpK3oJl4dzVmUrJxsfNa8MfMiD0SK', 'default.Jpg', 1, 1, '2024-08-31', 'YUBhLmNvbT0yMDI0LTA4LTMxPTg5MDIwNQ=='),
(9, 'Budi', 'b@a.com', '$2y$10$FLzOg3nN3uRb/fcWG/mAwuAmOWUHY7.D0NLhCnym2qO6n6C1NFubK', 'default.Jpg', 2, 1, '2024-10-15', '^*J^lMkobjwFNqxCDH^$');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tabel_user_role`
--

CREATE TABLE `tabel_user_role` (
  `id` int NOT NULL,
  `role` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tabel_user_role`
--

INSERT INTO `tabel_user_role` (`id`, `role`) VALUES
(1, 'Administrator'),
(2, 'Wali Kelas'),
(3, 'Guru');

-- --------------------------------------------------------

--
-- Struktur dari tabel `user_access_menu`
--

CREATE TABLE `user_access_menu` (
  `id` int NOT NULL,
  `role_id` int DEFAULT NULL,
  `menu_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `user_access_menu`
--

INSERT INTO `user_access_menu` (`id`, `role_id`, `menu_id`) VALUES
(1, 1, 2),
(2, 1, 3),
(9, 1, 5),
(10, 1, 4),
(11, 2, 2),
(12, 2, 3),
(13, 3, 3),
(14, 2, 4),
(15, 3, 4),
(16, 3, 5),
(17, 2, 5),
(18, 1, 12),
(19, 3, 12),
(20, 2, 12),
(21, 1, 6);

-- --------------------------------------------------------

--
-- Struktur dari tabel `user_access_submenu`
--

CREATE TABLE `user_access_submenu` (
  `id` int NOT NULL,
  `role_id` int NOT NULL,
  `submenu_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `user_access_submenu`
--

INSERT INTO `user_access_submenu` (`id`, `role_id`, `submenu_id`) VALUES
(1, 1, 30),
(2, 1, 36),
(3, 1, 1),
(4, 1, 3),
(5, 1, 39),
(6, 1, 41),
(7, 1, 6),
(8, 1, 37),
(9, 1, 43),
(10, 1, 44),
(11, 1, 4),
(12, 1, 46),
(13, 1, 47),
(14, 2, 3),
(15, 2, 39),
(16, 2, 41),
(17, 3, 3),
(18, 3, 39),
(19, 2, 43),
(20, 3, 6),
(21, 2, 6),
(22, 2, 44),
(23, 3, 44),
(26, 1, 48),
(27, 1, 49),
(28, 1, 50),
(29, 3, 50),
(30, 1, 51),
(31, 3, 51),
(32, 1, 52);

-- --------------------------------------------------------

--
-- Struktur dari tabel `user_menu`
--

CREATE TABLE `user_menu` (
  `id` int NOT NULL,
  `menu` varchar(128) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `user_menu`
--

INSERT INTO `user_menu` (`id`, `menu`, `icon`) VALUES
(2, 'Kelola Menu', 'flaticon-381-controls-3'),
(3, 'Kelola Absensi', 'flaticon-381-calendar-5'),
(4, 'Siswa', 'flaticon-381-user-8'),
(5, 'Guru', 'flaticon-381-user-8'),
(6, 'Users', 'flaticon-381-user');

-- --------------------------------------------------------

--
-- Struktur dari tabel `user_sub_menu`
--

CREATE TABLE `user_sub_menu` (
  `id` int NOT NULL,
  `menu_id` int DEFAULT NULL,
  `title` text,
  `url` text NOT NULL,
  `is_active` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `user_sub_menu`
--

INSERT INTO `user_sub_menu` (`id`, `menu_id`, `title`, `url`, `is_active`) VALUES
(1, 3, 'Atur libur', 'absen/libur', 1),
(3, 3, 'Data Absensi Siswa', 'absen', 1),
(4, 6, 'Data User', 'user', 1),
(6, 4, 'Data seluruh siswa', 'siswa', 1),
(30, 2, 'Acces User', 'Menu/Access', 1),
(36, 2, 'Menu', 'menu/management', 1),
(37, 4, 'Kelas & Jurusan', 'siswa/kelas', 1),
(39, 3, 'Rekap Absen Siswa', 'absen/rekap', 1),
(41, 3, 'Jam absen', 'absen/jam', 1),
(43, 4, 'Siswa per kelas', 'siswa/daftar_kelas', 1),
(44, 4, 'Data Izin', 'izin', 1),
(45, 1, 'Data ', 'Admin', 1),
(46, 2, 'Sub menu', 'menu/submanagement', 1),
(47, 6, 'Data User Siswa', 'user/user_siswa', 1),
(48, 5, 'Data Seluruh Guru', 'guru', 1),
(49, 6, 'Data User Guru', 'user/user_guru', 1),
(50, 3, 'Data Absensi Guru', 'absenguru', 1),
(51, 3, 'Rekap Absen Guru', 'absenguru/rekap', 1),
(52, 3, 'Jam Absen Guru', 'absen/setting_jam', 1);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `login_guru`
--
ALTER TABLE `login_guru`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `login_siswa`
--
ALTER TABLE `login_siswa`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `tabel_detail_absen`
--
ALTER TABLE `tabel_detail_absen`
  ADD PRIMARY KEY (`id_detail`);

--
-- Indeks untuk tabel `tabel_detail_absen_guru`
--
ALTER TABLE `tabel_detail_absen_guru`
  ADD PRIMARY KEY (`id_detail`);

--
-- Indeks untuk tabel `tabel_guru`
--
ALTER TABLE `tabel_guru`
  ADD PRIMARY KEY (`id_guru`);

--
-- Indeks untuk tabel `tabel_izin`
--
ALTER TABLE `tabel_izin`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `tabel_izin_guru`
--
ALTER TABLE `tabel_izin_guru`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `tabel_jam_absen`
--
ALTER TABLE `tabel_jam_absen`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `tabel_jam_absen_guru`
--
ALTER TABLE `tabel_jam_absen_guru`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `tabel_jurusan`
--
ALTER TABLE `tabel_jurusan`
  ADD PRIMARY KEY (`id_jurusan`);

--
-- Indeks untuk tabel `tabel_kelas`
--
ALTER TABLE `tabel_kelas`
  ADD PRIMARY KEY (`id_kelas`);

--
-- Indeks untuk tabel `tabel_libur`
--
ALTER TABLE `tabel_libur`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `tabel_siswa`
--
ALTER TABLE `tabel_siswa`
  ADD PRIMARY KEY (`id_siswa`);

--
-- Indeks untuk tabel `tabel_user`
--
ALTER TABLE `tabel_user`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `tabel_user_role`
--
ALTER TABLE `tabel_user_role`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `user_access_menu`
--
ALTER TABLE `user_access_menu`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `user_access_submenu`
--
ALTER TABLE `user_access_submenu`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `user_menu`
--
ALTER TABLE `user_menu`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `user_sub_menu`
--
ALTER TABLE `user_sub_menu`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `login_guru`
--
ALTER TABLE `login_guru`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `login_siswa`
--
ALTER TABLE `login_siswa`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `tabel_detail_absen`
--
ALTER TABLE `tabel_detail_absen`
  MODIFY `id_detail` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `tabel_detail_absen_guru`
--
ALTER TABLE `tabel_detail_absen_guru`
  MODIFY `id_detail` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT untuk tabel `tabel_guru`
--
ALTER TABLE `tabel_guru`
  MODIFY `id_guru` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=123457;

--
-- AUTO_INCREMENT untuk tabel `tabel_izin`
--
ALTER TABLE `tabel_izin`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `tabel_izin_guru`
--
ALTER TABLE `tabel_izin_guru`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `tabel_jam_absen_guru`
--
ALTER TABLE `tabel_jam_absen_guru`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `tabel_siswa`
--
ALTER TABLE `tabel_siswa`
  MODIFY `id_siswa` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=303;

--
-- AUTO_INCREMENT untuk tabel `tabel_user`
--
ALTER TABLE `tabel_user`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT untuk tabel `user_access_menu`
--
ALTER TABLE `user_access_menu`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT untuk tabel `user_access_submenu`
--
ALTER TABLE `user_access_submenu`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT untuk tabel `user_menu`
--
ALTER TABLE `user_menu`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT untuk tabel `user_sub_menu`
--
ALTER TABLE `user_sub_menu`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
